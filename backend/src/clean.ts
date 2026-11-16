import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OTP } from 'otplib'
import qrcode from 'qrcode'
import nodemailer from 'nodemailer'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import xss from 'xss'
import crypto from 'crypto'
import cron from 'node-cron'

const otp = new OTP()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
})

const prisma = new PrismaClient()
const app = express()
app.set('trust proxy', 1); // Trust the first proxy (e.g. Cloudflare or Nginx) to fix express-rate-limit error
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'tqmedia_super_secret_key_2026'
const SEPAY_API_TOKEN = process.env.SEPAY_API_TOKEN || 'your_sepay_token_here'
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())

// --- SECURITY MIDDLEWARES ---

// 1. Helmet: Secure HTTP headers
app.use(helmet())

// 2. Anti-Bot / Anti-Scraping (Simple User-Agent Check)
app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || ''
  const blockedBots = ['curl', 'python-requests', 'wget', 'postman', 'insomnia', 'httpie', 'urllib']
  const isBot = blockedBots.some(bot => ua.toLowerCase().includes(bot))
  if (isBot) {
    return res.status(403).json({ error: 'Access denied: Automated bots are not allowed.' })
  }
  next()
})

// 3. XSS Sanitization Middleware
const sanitizeObject = (obj: any) => {
  if (!obj) return
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = xss(obj[key])
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key])
    }
  }
}
app.use((req, res, next) => {
  if (req.body) sanitizeObject(req.body)
  if (req.query) sanitizeObject(req.query)
  if (req.params) sanitizeObject(req.params)
  next()
})

// 4. Global Rate Limiting (Anti-DDoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phÃºt
  max: 1000, // Tá»‘i Ä‘a 1000 requests / 15 phÃºt
  message: { error: 'QuÃ¡ nhiá»u yÃªu cáº§u tá»« IP cá»§a báº¡n, vui lÃ²ng thá»­ láº¡i sau 15 phÃºt.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', globalLimiter)

// 5. Auth Rate Limiting (Anti-Brute Force for auth routes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Tá»‘i Ä‘a 2000 requests / 15 phÃºt cho auth
  message: { error: 'QuÃ¡ nhiá»u láº§n thá»­. Vui lÃ²ng thá»­ láº¡i sau 15 phÃºt.' },
})
app.use('/api/auth', authLimiter)

// Seed Admin User
async function seedAdmin() {
  try {
    const adminEmail = 'admin@tqmedia.com'
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!existing) {
      const hashedPassword = await bcrypt.hash('123', 10)
      await prisma.user.create({
        data: {
          name: 'Admin TQMEDIA',
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          balance: 0
        }
      })
      console.log('âœ… Admin user created: admin@tqmedia.com / 123')
    }
  } catch (e) {
    console.log('Seed admin failed, maybe already exists or db locked.')
  }
}
seedAdmin()

// --- HELPER: Revert expired flash sales ---
async function revertExpiredFlashSales() {
  try {
    const expiredServices = await prisma.serverService.findMany({
      where: { flashSaleEndTime: { lt: new Date() } }
    });
    for (const svc of expiredServices) {
      await prisma.serverService.update({
        where: { id: svc.id },
        data: {
          price: svc.originalPrice || svc.price,
          originalPrice: null,
          flashSaleEndTime: null
        }
      });
    }
  } catch (err) {
    console.error('Error reverting flash sales:', err);
  }
}

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'KhÃ´ng cÃ³ quyá»n truy cáº­p (Missing token)' })

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token háº¿t háº¡n hoáº·c khÃ´ng há»£p lá»‡' })
    res.locals.userId = user.id
    res.locals.userRole = user.role
    next()
  })
}

const requireAdminOrInstructor = (req: Request, res: Response, next: NextFunction) => {
  if (res.locals.userRole !== 'ADMIN' && res.locals.userRole !== 'INSTRUCTOR') return res.status(403).json({ error: 'Chá»‰ Admin hoáº·c Giáº£ng viÃªn má»›i cÃ³ quyá»n.' })
  next()
}

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (res.locals.userRole !== 'ADMIN') return res.status(403).json({ error: 'Chá»‰ Admin má»›i cÃ³ quyá»n thá»±c hiá»‡n hÃ nh Ä‘á»™ng nÃ y.' })
  next()
}


const verifyTurnstile = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.body.turnstileToken;
  if (!token) return res.status(403).json({ error: 'Missing captcha token. Please refresh the page.' });

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token })
    });
    const data = await response.json();
    if (!data.success) {
      return res.status(403).json({ error: 'Captcha validation failed. You might be a robot.' });
    }
    next();
  } catch (err) {
    console.error('Turnstile error:', err);
    return res.status(500).json({ error: 'Captcha service error' });
  }
}

// --- AUTH ROUTES ---

// Helper function to send email verification OTP
async function sendVerificationEmail(userId: string, email: string, name: string) {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerificationCode: code }
  })
  
  const mailOptions = {
    from: `"TQMEDIA Support" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: 'MÃ£ xÃ¡c thá»±c Email tá»« TQMEDIA',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">XÃ¡c thá»±c tÃ i khoáº£n TQMEDIA</h2>
        <p>Xin chÃ o <strong>${name}</strong>,</p>
        <p>ÄÃ¢y lÃ  mÃ£ xÃ¡c thá»±c 6 sá»‘ cá»§a báº¡n. Vui lÃ²ng nháº­p mÃ£ nÃ y vÃ o trang web Ä‘á»ƒ tiáº¿p tá»¥c:</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; color: #111;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #6b7280; margin-top: 20px; text-align: center;">Náº¿u báº¡n khÃ´ng yÃªu cáº§u mÃ£ nÃ y, vui lÃ²ng bá» qua email.</p>
      </div>
    `
  }
  await transporter.sendMail(mailOptions)
}


const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per window
  message: { error: 'QuÃ¡ nhiá»u yÃªu cáº§u, vui lÃ²ng thá»­ láº¡i sau 15 phÃºt.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/forgot-password', verifyTurnstile, forgotPasswordLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ error: 'Email khÃ´ng tá»“n táº¡i.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      }
    });

    const resetUrl = `https://tqsocial.vn/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: user.email,
      subject: 'YÃªu cáº§u khÃ´i phá»¥c máº­t kháº©u - TQMEDIA',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>KhÃ´i phá»¥c máº­t kháº©u</h2>
          <p>Báº¡n nháº­n Ä‘Æ°á»£c email nÃ y vÃ¬ báº¡n (hoáº·c ai Ä‘Ã³) Ä‘Ã£ yÃªu cáº§u khÃ´i phá»¥c máº­t kháº©u cho tÃ i khoáº£n cá»§a báº¡n.</p>
          <p>Vui lÃ²ng click vÃ o nÃºt bÃªn dÆ°á»›i Ä‘á»ƒ Ä‘áº·t láº¡i máº­t kháº©u (Link cÃ³ hiá»‡u lá»±c 15 phÃºt):</p>
          <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Äáº¶T Láº I Máº¬T KHáº¨U</a>
          <p>Náº¿u báº¡n khÃ´ng yÃªu cáº§u, vui lÃ²ng bá» qua email nÃ y.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email khÃ´i phá»¥c Ä‘Ã£ Ä‘Æ°á»£c gá»­i!' });
  } catch (error) {
    res.status(500).json({ error: 'Lá»—i server khi xá»­ lÃ½ yÃªu cáº§u.' });
  }
});

app.post('/api/auth/reset-password', verifyTurnstile, async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Thiáº¿u thÃ´ng tin.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Token khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      }
    });

    res.json({ message: 'Äáº·t láº¡i máº­t kháº©u thÃ nh cÃ´ng!' });
  } catch (error) {
    res.status(500).json({ error: 'Lá»—i server khi Ä‘áº·t láº¡i máº­t kháº©u.' });
  }
});

app.post('/api/auth/register', verifyTurnstile, async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin' })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'GUEST', isEmailVerified: false }
    })

    await sendVerificationEmail(newUser.id, newUser.email, newUser.name)

    const tempToken = jwt.sign({ id: newUser.id, pendingEmail: true }, JWT_SECRET, { expiresIn: '15m' })
    res.json({ success: true, requireEmailVerification: true, tempToken })
  } catch (err) {
    console.error('Register Error:', err)
    res.status(500).json({ error: 'Lá»—i server' })
  }
})

app.post('/api/auth/login', verifyTurnstile, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Vui lÃ²ng nháº­p Ä‘á»§ thÃ´ng tin' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Sai email hoáº·c máº­t kháº©u' })

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) return res.status(401).json({ error: 'Sai email hoáº·c máº­t kháº©u' })

    // Ghi nháº­n LoginLog
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown'
    const device = req.headers['user-agent'] || 'Unknown Device'
    
    await prisma.loginLog.create({
      data: {
        userId: user.id,
        ip: Array.isArray(ip) ? ip[0] : ip,
        device: device
      }
    })

    if (!user.isEmailVerified) {
      await sendVerificationEmail(user.id, user.email, user.name)
      const tempToken = jwt.sign({ id: user.id, pendingEmail: true }, JWT_SECRET, { expiresIn: '15m' })
      return res.json({ success: true, requireEmailVerification: true, tempToken })
    }

    if (user.isTwoFactorEnabled) {
      // Create a temporary token for 2FA verification
      const tempToken = jwt.sign({ id: user.id, pending2FA: true }, JWT_SECRET, { expiresIn: '5m' })
      return res.json({ success: true, require2FA: true, tempToken })
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance } })
  } catch (err) {
    console.error('Login Error:', err)
    res.status(500).json({ error: 'Lá»—i server' })
  }
})

// --- 2FA & SECURITY ROUTES ---
app.get('/api/auth/login-logs', authenticateToken, async (_req, res) => {
  try {
    const logs = await prisma.loginLog.findMany({
      where: { userId: res.locals.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    res.json({ success: true, logs })
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i truy xuáº¥t lá»‹ch sá»­' })
  }
})

app.get('/api/auth/2fa/generate', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const secret = otp.generateSecret()
    // Save temporary secret to user (or you can save it only when verified)
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret }
    })

    const otpauthUrl = `otpauth://totp/TQMEDIA:${encodeURIComponent(user.email)}?secret=${secret}&issuer=TQMEDIA`;
    const qrImageUrl = await qrcode.toDataURL(otpauthUrl)

    res.json({ success: true, qrImageUrl, secret })
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate 2FA' })
  }
})

app.post('/api/auth/2fa/enable', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body // the 6-digit code
    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } })
    if (!user || !user.twoFactorSecret) return res.status(400).json({ error: 'Secret chÆ°a Ä‘Æ°á»£c táº¡o' })

    const isValid = await otp.verify({ token, secret: user.twoFactorSecret })
    if (!isValid.valid) return res.status(400).json({ error: 'MÃ£ xÃ¡c thá»±c khÃ´ng Ä‘Ãºng' })

    await prisma.user.update({
      where: { id: user.id },
      data: { isTwoFactorEnabled: true }
    })

    res.json({ success: true, message: 'ÄÃ£ báº­t 2FA thÃ nh cÃ´ng' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to enable 2FA' })
  }
})

app.post('/api/auth/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body // Require code to disable
    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } })
    if (!user || !user.twoFactorSecret) return res.status(400).json({ error: 'Secret chÆ°a Ä‘Æ°á»£c táº¡o' })

    const isValid = await otp.verify({ token, secret: user.twoFactorSecret })
    if (!isValid.valid) return res.status(400).json({ error: 'MÃ£ xÃ¡c thá»±c khÃ´ng Ä‘Ãºng' })

    await prisma.user.update({
      where: { id: user.id },
      data: { isTwoFactorEnabled: false, twoFactorSecret: null }
    })

    res.json({ success: true, message: 'ÄÃ£ táº¯t 2FA' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to disable 2FA' })
  }
})

app.post('/api/auth/2fa/verify-login', async (req, res) => {
  try {
    const { tempToken, code } = req.body
    if (!tempToken || !code) return res.status(400).json({ error: 'Thiáº¿u thÃ´ng tin' })

    const decoded = jwt.verify(tempToken, JWT_SECRET) as any
    if (!decoded.pending2FA) return res.status(401).json({ error: 'Token khÃ´ng há»£p lá»‡' })

    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!user || !user.twoFactorSecret) return res.status(401).json({ error: 'Lá»—i ngÆ°á»i dÃ¹ng' })

    const isValid = await otp.verify({ token: code, secret: user.twoFactorSecret })
    if (!isValid.valid) return res.status(401).json({ error: 'MÃ£ xÃ¡c thá»±c khÃ´ng Ä‘Ãºng' })

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance } })
  } catch (err) {
    res.status(401).json({ error: 'PhiÃªn báº£n hoáº·c mÃ£ xÃ¡c nháº­n khÃ´ng há»£p lá»‡' })
  }
})

// -- EMAIL VERIFICATION --

app.post('/api/auth/verify-login-email', async (req, res) => {
  try {
    const { tempToken, code } = req.body
    if (!tempToken || !code) return res.status(400).json({ error: 'Thiáº¿u thÃ´ng tin' })

    const decoded = jwt.verify(tempToken, JWT_SECRET) as any
    if (!decoded.pendingEmail) return res.status(401).json({ error: 'Token khÃ´ng há»£p lá»‡' })

    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!user) return res.status(404).json({ error: 'KhÃ´ng tÃ¬m tháº¥y user' })

    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ error: 'MÃ£ xÃ¡c thá»±c khÃ´ng Ä‘Ãºng' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerificationCode: null }
    })

    // Náº¿u cÃ³ 2FA thÃ¬ yÃªu cáº§u 2FA
    if (user.isTwoFactorEnabled) {
      const nextTempToken = jwt.sign({ id: user.id, pending2FA: true }, JWT_SECRET, { expiresIn: '5m' })
      return res.json({ success: true, require2FA: true, tempToken: nextTempToken })
    }

    // Náº¿u khÃ´ng cÃ³ 2FA, cáº¥p token Ä‘Äƒng nháº­p luÃ´n
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance } })
  } catch (err) {
    res.status(401).json({ error: 'PhiÃªn báº£n hoáº·c mÃ£ xÃ¡c nháº­n khÃ´ng há»£p lá»‡' })
  }
})

app.post('/api/auth/send-verification', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } })
    if (!user) return res.status(404).json({ error: 'KhÃ´ng tÃ¬m tháº¥y user' })
    if (user.isEmailVerified) return res.status(400).json({ error: 'Email Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c thá»±c trÆ°á»›c Ä‘Ã³' })

    await sendVerificationEmail(user.id, user.email, user.name)
    res.json({ success: true, message: 'ÄÃ£ gá»­i mÃ£ xÃ¡c thá»±c qua Email' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'KhÃ´ng thá»ƒ gá»­i email. Vui lÃ²ng kiá»ƒm tra láº¡i cáº¥u hÃ¬nh SMTP.' })
  }
})

app.post('/api/auth/verify-email', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Vui lÃ²ng nháº­p mÃ£ xÃ¡c nháº­n' })

    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } })
    if (!user) return res.status(404).json({ error: 'KhÃ´ng tÃ¬m tháº¥y user' })

    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ error: 'MÃ£ xÃ¡c thá»±c khÃ´ng Ä‘Ãºng' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerificationCode: null }
    })

    res.json({ success: true, message: 'XÃ¡c thá»±c Email thÃ nh cÃ´ng' })
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i server' })
  }
})

app.get('/api/auth/me', authenticateToken, async (_req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } })
    if (!user) return res.status(404).json({ error: 'KhÃ´ng tÃ¬m tháº¥y user' })
    res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, balance: user.balance, createdAt: user.createdAt, isTwoFactorEnabled: user.isTwoFactorEnabled, isEmailVerified: user.isEmailVerified })
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i server' })
  }
})

// --- USER ROUTES ---
// Láº¥y danh sÃ¡ch dá»‹ch vá»¥ theo ná»n táº£ng (Public)
app.get('/api/services/:platform', async (req, res) => {
  try {
    await revertExpiredFlashSales();
    const platform = req.params.platform
    const servers = await prisma.serverService.findMany({
      where: { platform }
    })
    
    const grouped: any = {}
    for (const s of servers) {
      if (!grouped[s.serviceType]) grouped[s.serviceType] = []
      grouped[s.serviceType].push(s)
    }
    
    if (Object.keys(grouped).length > 0) {
      res.json(grouped)
    } else {
      res.status(404).json({ error: 'Platform not found or no services' })
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// Lá»‹ch sá»­ Ä‘Æ¡n hÃ ng cá»§a cÃ¡ nhÃ¢n
app.get('/api/orders', authenticateToken, async (_req, res) => {
  try {
    const userId = res.locals.userId;
    
    // User page chá»‰ tháº¥y Ä‘Æ¡n cá»§a mÃ¬nh, dÃ¹ lÃ  admin
    const where = { userId };

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    const formatted = orders.map(o => ({
      ...o,
      date: new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(o.createdAt)
    }))
    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// Lá»‹ch sá»­ toÃ n bá»™ Ä‘Æ¡n hÃ ng cho Admin
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' }
    })
    const formatted = orders.map(o => ({
      ...o,
      date: new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(o.createdAt)
    }))
    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})



// Cáº­p nháº­t thÃ´ng tin profile (chá»‰ cáº­p nháº­t tÃªn)
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Vui lÃ²ng nháº­p tÃªn' });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, phone: phone || null }
    });
    res.json({ success: true, user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone, role: updatedUser.role, balance: updatedUser.balance } });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i há»‡ thá»‘ng' });
  }
});

// Äá»•i máº­t kháº©u
app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ máº­t kháº©u' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Máº­t kháº©u cÅ© khÃ´ng Ä‘Ãºng' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i há»‡ thá»‘ng' });
  }
});

// Táº¡o Ä‘Æ¡n hÃ ng má»›i
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { platform, serviceType, serverId, serverName, target, quantity, total, note, voucherCode, discount = 0 } = req.body
    
    if (!platform || !serviceType || !serverId || !target || !quantity || total === undefined) {
      return res.status(400).json({ error: 'Thiáº¿u thÃ´ng tin Ä‘Æ¡n hÃ ng.' })
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found')

      const server = await tx.serverService.findUnique({ where: { id: serverId } })
      if (!server) throw new Error('MÃ¡y chá»§ khÃ´ng tá»“n táº¡i.')
      if (server.status === 'bao_tri') {
        throw new Error('MÃ¡y chá»§ nÃ y Ä‘ang Ä‘Æ°á»£c báº£o trÃ¬. Vui lÃ²ng chá»n mÃ¡y chá»§ khÃ¡c!')
      }

      if (user.balance < total) {
        throw new Error('Sá»‘ dÆ° khÃ´ng Ä‘á»§. Vui lÃ²ng náº¡p thÃªm tiá»n.')
      }

      // Check voucher if present
      if (voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
        if (!voucher || !voucher.isActive) throw new Error('MÃ£ giáº£m giÃ¡ khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.');
        if (voucher.validTo < new Date() || voucher.validFrom > new Date()) throw new Error('MÃ£ giáº£m giÃ¡ ngoÃ i thá»i gian hiá»‡u lá»±c.');
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new Error('MÃ£ giáº£m giÃ¡ Ä‘Ã£ háº¿t lÆ°á»£t sá»­ dá»¥ng.');
        
        await tx.voucher.update({
          where: { code: voucherCode },
          data: { usedCount: voucher.usedCount + 1 }
        });
      }

      const newBalance = user.balance - total
      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance }
      })

      const orderId = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`
      const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

      await tx.order.create({
        data: {
          id: orderId,
          userId: user.id,
          platform: platform,
          service: `${platform.toUpperCase()} ${serviceType.toUpperCase()} - ${serverName}`,
          target: target,
          status: 'processing',
          total: `${fmt(total)} Ä‘`,
          totalNum: Number(total),
          voucherCode: voucherCode || null,
          discount: Number(discount) || 0
        }
      })

      await tx.transaction.create({
        data: {
          id: `#TRX-${Math.floor(1000 + Math.random() * 9000)}`,
          userId: user.id,
          type: 'TRá»ª TIá»€N',
          amount: `-${fmt(total)} â‚«`,
          balance: `${fmt(newBalance)} â‚«`,
          desc: `Táº¡o Ä‘Æ¡n ${platform.toUpperCase()} ${serviceType.toUpperCase()} - ${serverName}`,
          typeClass: 'text-red-400 bg-red-400/10 border-red-400/30'
        }
      })
    })
    
    const user = await prisma.user.findUnique({ where: { id: userId } })

    res.json({ 
      success: true, 
      message: 'Táº¡o Ä‘Æ¡n thÃ nh cÃ´ng!',
      newBalance: user?.balance
    })
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Lá»—i há»‡ thá»‘ng' })
  }
})

// KhÃ¡ch hÃ ng yÃªu cáº§u há»§y Ä‘Æ¡n
app.put('/api/orders/:id/refund', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = res.locals.userId;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng' });
    
    // Check permission
    if (res.locals.userRole !== 'ADMIN' && order.userId !== userId) {
      return res.status(403).json({ error: 'KhÃ´ng cÃ³ quyá»n thao tÃ¡c trÃªn Ä‘Æ¡n hÃ ng nÃ y' });
    }
    
    if (order.status === 'processing') {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id }, data: { status: 'cancelled' } });
        const user = await tx.user.findUnique({ where: { id: order.userId } });
        if (user) {
          await tx.user.update({
            where: { id: user.id },
            data: { balance: user.balance + order.totalNum }
          });
          const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
          await tx.transaction.create({
            data: {
              id: `#TRX-${Math.floor(1000 + Math.random() * 9000)}`,
              userId: user.id,
              type: 'HOÃ€N TIá»€N',
              amount: `+${fmt(order.totalNum)} â‚«`,
              balance: `${fmt(user.balance + order.totalNum)} â‚«`,
              desc: `HoÃ n tiá»n tá»± Ä‘á»™ng do khÃ¡ch hÃ ng há»§y Ä‘Æ¡n sá»›m ${order.id}`,
              typeClass: 'text-blue-400 bg-blue-400/10 border-blue-400/30'
            }
          });
        }
      });
      return res.json({ success: true, message: 'ÄÃ£ há»§y Ä‘Æ¡n vÃ  hoÃ n tiá»n thÃ nh cÃ´ng!' });
    } else if (order.status === 'running') {
      await prisma.order.update({
        where: { id },
        data: { status: 'refund_requested' }
      });
      return res.json({ success: true, message: 'ÄÃ£ gá»­i yÃªu cáº§u há»§y Ä‘Æ¡n cho Admin duyá»‡t.' });
    } else {
      return res.status(400).json({ error: 'KhÃ´ng thá»ƒ há»§y Ä‘Æ¡n hÃ ng á»Ÿ tráº¡ng thÃ¡i nÃ y.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i mÃ¡y chá»§' });
  }
});

// Lá»‹ch sá»­ giao dá»‹ch
app.get('/api/transactions', authenticateToken, async (_req, res) => {
  try {
    const userId = res.locals.userId;
    
    // User page chá»‰ tháº¥y giao dá»‹ch cá»§a mÃ¬nh, dÃ¹ lÃ  admin
    const where = { userId };

    const transactions = await (prisma as any).transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    const formatted = transactions.map(t => ({
      ...t,
      time: new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(t.createdAt)
    }))
    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i há»‡ thá»‘ng' })
  }
})

// Náº¡p tiá»n thá»§ cÃ´ng (ÄÃ£ bá»‹ vÃ´ hiá»‡u hÃ³a vÃ¬ chuyá»ƒn sang SePay Webhook)
app.post('/api/deposits', authenticateToken, async (req, res) => {
  return res.status(400).json({ error: 'TÃ­nh nÄƒng náº¡p tiá»n thá»§ cÃ´ng Ä‘Ã£ bá»‹ khÃ³a. Vui lÃ²ng quÃ©t mÃ£ QR vÃ  chuyá»ƒn khoáº£n Ä‘Ãºng cÃº phÃ¡p Ä‘á»ƒ há»‡ thá»‘ng tá»± Ä‘á»™ng cá»™ng tiá»n.' })
})

// --- SEPAY WEBHOOK ---
app.post('/api/sepay/webhook', async (req, res) => {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.includes(process.env.SEPAY_API_TOKEN || '')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }

  const {
    gateway,
    transactionDate,
    accountNumber,
    subAccount,
    amountIn,
    transferType,
    transferAmount,
    amountOut,
    accumulated,
    code,
    transactionContent,
    content: sepayContent,
    referenceNumber,
    referenceCode,
    body,
    description
  } = req.body

  const actualAmount = transferType === 'in' ? Number(transferAmount) : Number(amountIn || 0)
  const content = transactionContent || sepayContent || body || description || ''

  if (!content) {
    return res.json({ success: true, message: 'No content found' })
  }

  try {
    const {
      gateway,
      transferType,
      transferAmount,
      referenceCode,
      content
    } = req.body

    if (transferType !== 'in' || !transferAmount || transferAmount <= 0) {
      return res.json({ success: true, message: 'Ignored non-incoming transaction' })
    }

    const match = content.match(/(?:NAPTQ|NAP\s+TQMEDIA|DH)\s*([a-f0-9]{6})/i)
    if (!match) {
      return res.json({ success: true, message: 'No valid transfer code found' })
    }

    const transferCode = match[1].toLowerCase()
    
    const users = await prisma.user.findMany({
      where: { id: { startsWith: transferCode } }
    })

    if (users.length === 0) {
      return res.json({ success: true, message: 'User not found for code ' + transferCode })
    }

    const user = users[0]

    // Cá»™ng tiá»n
    await prisma.$transaction(async (tx) => {
      const newBalance = user.balance + transferAmount
      
      const depositTxs = await tx.transaction.findMany({
        where: { userId: user.id, type: 'Cá»˜NG TIá»€N' }
      });
      let totalDeposited = depositTxs.reduce((sum, t) => {
        const numStr = t.amount.replace(/[^\d]/g, '');
        return sum + (parseInt(numStr) || 0);
      }, 0);
      
      totalDeposited += transferAmount;

      const rankOrder = ['GUEST', 'HOC_VIEN', 'DAI_LY_1', 'DAI_LY_2', 'DAI_LY_3', 'DAI_LY_4', 'ADMIN'];
      const currentRankIndex = rankOrder.indexOf(user.role);
      
      let newRole = user.role;
      if (user.role !== 'ADMIN' && user.role !== 'HOC_VIEN') {
        if (totalDeposited >= 100000000 && currentRankIndex < rankOrder.indexOf('DAI_LY_4')) newRole = 'DAI_LY_4';
        else if (totalDeposited >= 30000000 && currentRankIndex < rankOrder.indexOf('DAI_LY_3')) newRole = 'DAI_LY_3';
        else if (totalDeposited >= 10000000 && currentRankIndex < rankOrder.indexOf('DAI_LY_2')) newRole = 'DAI_LY_2';
        else if (totalDeposited >= 2000000 && currentRankIndex < rankOrder.indexOf('DAI_LY_1')) newRole = 'DAI_LY_1';
      }

      await tx.user.update({ 
        where: { id: user.id }, 
        data: { balance: newBalance, role: newRole } 
      })

      const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val)
      await tx.transaction.create({
        data: {
          id: `#TRX-${Math.floor(1000 + Math.random() * 9000)}`,
          userId: user.id,
          type: 'Cá»˜NG TIá»€N',
          amount: `+${fmt(transferAmount)} â‚«`,
          balance: `${fmt(newBalance)} â‚«`,
          desc: `Náº¡p tiá»n tá»± Ä‘á»™ng (SePay)`,
          typeClass: 'text-green-400 bg-green-400/10 border-green-400/30'
        }
      })
    })
    
    return res.json({ success: true, message: 'Processed successfully' })
  } catch (err) {
    console.error('SePay Webhook Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// --- ADMIN ROUTES ---
app.get('/api/admin/users', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, balance: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, role, balance } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email Ä‘Ã£ tá»“n táº¡i' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, phone: phone || null, role: role || 'GUEST', balance: Number(balance) || 0 }
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i táº¡o thÃ nh viÃªn' });
  }
});

app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, role, balance } = req.body;
    let updateData: any = { name, email, phone: phone || null, role, balance: Number(balance) };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    await prisma.user.update({ where: { id }, data: updateData });
    res.json({ success: true, message: 'Cáº­p nháº­t thÃ nh cÃ´ng' });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i cáº­p nháº­t' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'XÃ³a thÃ nh cÃ´ng' });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i xÃ³a' });
  }
});

app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await prisma.user.update({ where: { id }, data: { role } });
    res.json({ success: true, message: 'Cáº­p nháº­t thÃ nh cÃ´ng' });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i cáº­p nháº­t' });
  }
});

app.get('/api/admin/servers', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const servers = await prisma.serverService.findMany()
    res.json(servers)
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/api/admin/services', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const services = await prisma.serverService.findMany();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/admin/services/bulk-discount', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { target, targetIds, discountType, discountValue, flashSaleEndTime } = req.body;
    let filter = {};
    if (target === 'SELECTED') {
      filter = { id: { in: targetIds } };
    }
    const servicesToUpdate = await prisma.serverService.findMany({ where: filter });
    let updatedCount = 0;
    for (const svc of servicesToUpdate) {
      const currentPrice = svc.price;
      const originalPrice = svc.originalPrice || currentPrice;
      let newPrice = currentPrice;
      if (discountType === 'PERCENT') {
        newPrice = originalPrice - (originalPrice * discountValue / 100);
      } else if (discountType === 'FIXED') {
        newPrice = originalPrice - discountValue;
      }
      if (newPrice < 0) newPrice = 0;
      await prisma.serverService.update({
        where: { id: svc.id },
        data: {
          originalPrice: originalPrice,
          price: newPrice,
          flashSaleEndTime: flashSaleEndTime ? new Date(flashSaleEndTime) : null
        }
      });
      updatedCount++;
    }
    res.json({ success: true, updatedCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/services/remove-discount', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { target, targetIds } = req.body;
    let filter = {};
    if (target === 'SELECTED') filter = { id: { in: targetIds } };
    const servicesToUpdate = await prisma.serverService.findMany({ where: filter });
    let updatedCount = 0;
    for (const svc of servicesToUpdate) {
      if (svc.originalPrice || svc.flashSaleEndTime) {
        await prisma.serverService.update({
          where: { id: svc.id },
          data: {
            price: svc.originalPrice || svc.price,
            originalPrice: null,
            flashSaleEndTime: null
          }
        });
        updatedCount++;
      }
    }
    res.json({ success: true, updatedCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/services/remove-discount-single/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const svc = await prisma.serverService.findUnique({ where: { id: req.params.id } });
    if (!svc) return res.status(404).json({ error: 'Not found' });
    if (svc.originalPrice || svc.flashSaleEndTime) {
      await prisma.serverService.update({
        where: { id: svc.id },
        data: { price: svc.originalPrice || svc.price, originalPrice: null, flashSaleEndTime: null }
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/servers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { platform, serviceType, name, price, costPrice, min, max, desc, hot, status } = req.body;
    const newServer = await prisma.serverService.create({
      data: {
        platform, serviceType, name, price: Number(price), costPrice: Number(costPrice) || 0,
        min: Number(min), max: Number(max), desc: desc || '', hot: Boolean(hot), status: status || 'hoat_dong'
      }
    })
    res.json({ success: true, message: 'ThÃªm server thÃ nh cÃ´ng', server: newServer });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i server' });
  }
});

app.put('/api/admin/servers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    await prisma.serverService.update({
      where: { id },
      data: {
        platform: updates.platform, serviceType: updates.serviceType, name: updates.name,
        price: updates.price ? Number(updates.price) : undefined,
        costPrice: updates.costPrice ? Number(updates.costPrice) : undefined,
        min: updates.min ? Number(updates.min) : undefined,
        max: updates.max ? Number(updates.max) : undefined,
        desc: updates.desc, hot: updates.hot !== undefined ? Boolean(updates.hot) : undefined,
        status: updates.status
      }
    });
    res.json({ success: true, message: 'Cáº­p nháº­t server thÃ nh cÃ´ng' });
  } catch (err) {
    res.status(404).json({ error: 'KhÃ´ng tÃ¬m tháº¥y server' });
  }
});

app.delete('/api/admin/servers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.serverService.delete({ where: { id: req.params.id } })
    res.json({ success: true, message: 'XÃ³a server thÃ nh cÃ´ng' });
  } catch (err) {
    res.status(404).json({ error: 'KhÃ´ng tÃ¬m tháº¥y server' });
  }
});

app.put('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng' });

    if (status === 'cancelled' && (order.status === 'processing' || order.status === 'refund_requested' || order.status === 'running')) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id }, data: { status: 'cancelled' } });
        const user = await tx.user.findUnique({ where: { id: order.userId } });
        if (user) {
          const percentage = order.status === 'refund_requested' ? 80 : 100;
          const refundAmount = Math.round(order.totalNum * (percentage / 100));
          if (refundAmount > 0) {
            const newBalance = user.balance + refundAmount;
            await tx.user.update({ where: { id: user.id }, data: { balance: newBalance } });
            const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
            await tx.transaction.create({
              data: {
                id: `#TRX-${Math.floor(1000 + Math.random() * 9000)}`,
                userId: user.id, type: 'HOÃ€N TIá»€N', amount: `+${fmt(refundAmount)} â‚«`, balance: `${fmt(newBalance)} â‚«`,
                desc: percentage === 100 ? `HoÃ n tiá»n do há»§y Ä‘Æ¡n hÃ ng ${order.id}` : `HoÃ n tiá»n do há»§y Ä‘Æ¡n hÃ ng ${order.id} (Trá»« 20% phÃ­)`,
                typeClass: 'text-blue-400 bg-blue-400/10 border-blue-400/30'
              }
            });
          }
        }
      });
      return res.json({ success: true, message: 'ÄÃ£ há»§y Ä‘Æ¡n' });
    }

    if (status === 'completed' && (order.status === 'processing' || order.status === 'running')) {
      await prisma.order.update({ where: { id }, data: { status: 'completed' } });
      return res.json({ success: true, message: 'HoÃ n thÃ nh' });
    }
    if (status === 'running' && (order.status === 'processing' || order.status === 'refund_requested')) {
      await prisma.order.update({ where: { id }, data: { status: 'running' } });
      return res.json({ success: true, message: 'Äang cháº¡y' });
    }
    res.json({ success: true, message: 'Cáº­p nháº­t thÃ nh cÃ´ng' });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i server' });
  }
});

app.get('/api/admin/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const totalUsers = await prisma.user.count();
    const sumBalanceAggr = await prisma.user.aggregate({ _sum: { balance: true } });
    const totalBalance = sumBalanceAggr._sum.balance || 0;

    const totalOrders = await prisma.order.count({ where: { createdAt: { gte: dateLimit } } });
    const sumOrderAggr = await (prisma as any).order.aggregate({ 
      _sum: { totalNum: true }, 
      where: { createdAt: { gte: dateLimit }, status: { not: 'cancelled' } } 
    });
    const orderRevenue = sumOrderAggr._sum.totalNum || 0;

    const enrollments = await (prisma as any).enrollment.findMany({
      where: { createdAt: { gte: dateLimit } },
      include: { course: { select: { salePrice: true } } }
    });
    const courseRevenue = enrollments.reduce((sum: number, e: any) => sum + (e.course?.salePrice || 0), 0);

    const sumResourceAggr = await (prisma as any).resourceOrder.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: dateLimit } }
    });
    const resourceRevenue = sumResourceAggr._sum.totalAmount || 0;

    const totalIncome = orderRevenue + courseRevenue + resourceRevenue;

    const depositTxs = await (prisma as any).transaction.findMany({
      where: { type: 'Cá»˜NG TIá»€N', createdAt: { gte: dateLimit } },
      select: { amount: true }
    });
    const totalDeposited = depositTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    const prevDateLimit = new Date(dateLimit);
    prevDateLimit.setDate(prevDateLimit.getDate() - days);

    const prevSumOrderAggr = await (prisma as any).order.aggregate({ 
      _sum: { totalNum: true }, 
      where: { createdAt: { gte: prevDateLimit, lt: dateLimit }, status: { not: 'cancelled' } } 
    });
    const prevOrderRevenue = prevSumOrderAggr._sum.totalNum || 0;
    const prevEnrollments = await (prisma as any).enrollment.findMany({
      where: { createdAt: { gte: prevDateLimit, lt: dateLimit } },
      include: { course: { select: { salePrice: true } } }
    });
    const prevCourseRevenue = prevEnrollments.reduce((sum: number, e: any) => sum + (e.course?.salePrice || 0), 0);
    const prevSumResourceAggr = await (prisma as any).resourceOrder.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: prevDateLimit, lt: dateLimit } }
    });
    const prevResourceRevenue = prevSumResourceAggr._sum.totalAmount || 0;
    const prevIncome = prevOrderRevenue + prevCourseRevenue + prevResourceRevenue;

    const prevDepositTxs = await (prisma as any).transaction.findMany({
      where: { type: 'Cá»˜NG TIá»€N', createdAt: { gte: prevDateLimit, lt: dateLimit } },
      select: { amount: true }
    });
    const prevDeposited = prevDepositTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    const currentUsers = await (prisma as any).user.count({ where: { createdAt: { gte: dateLimit } } });
    const prevUsers = await (prisma as any).user.count({ where: { createdAt: { gte: prevDateLimit, lt: dateLimit } } });

    const calcTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? '+100%' : '0%';
      const percent = ((current - prev) / prev) * 100;
      return (percent > 0 ? '+' : '') + percent.toFixed(1) + '%';
    };

    const transactions = await (prisma as any).transaction.findMany({
      where: { createdAt: { gte: dateLimit } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } }
    });

    res.json({
      success: true,
      stats: { totalUsers, totalBalance, totalOrders, totalIncome, totalDeposited },
      trends: { incomeTrend: calcTrend(totalIncome, prevIncome), depositTrend: calcTrend(totalDeposited, prevDeposited), usersTrend: calcTrend(currentUsers, prevUsers) },
      transactions
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({ include: { schedules: true } });
    const formatted = courses.map(c => ({ ...c, curriculum: JSON.parse(c.curriculum) }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/admin/courses', authenticateToken, requireAdminOrInstructor, async (req, res) => {
  try {
    const { title, instructor, instructorId: bodyInstructorId, type, tag, tagColor, originalPrice, salePrice, status, thumbnail, videoDemo, description, curriculum, schedules, students, lessons, rating } = req.body;
    const instructorId = res.locals.userRole === 'INSTRUCTOR' ? res.locals.userId : bodyInstructorId;
    const newCourse = await prisma.course.create({
      data: {
        title, instructor, instructorId, type, tag, tagColor, originalPrice: Number(originalPrice), salePrice: Number(salePrice),
        status, thumbnail, videoDemo, description, 
        curriculum: JSON.stringify(curriculum || []),
        schedules: {
          create: (schedules || []).map((s: any) => ({
            name: s.name, days: s.days || "", time: s.time, meetLink: s.meetLink
          }))
        }
      },
      include: { schedules: true }
    });
    res.json({ success: true, course: { ...newCourse, curriculum: JSON.parse(newCourse.curriculum) } });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i táº¡o khÃ³a há»c' });
  }
});

app.put('/api/admin/courses/:id', authenticateToken, requireAdminOrInstructor, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, instructor, instructorId, type, tag, tagColor, originalPrice, salePrice, status, thumbnail, videoDemo, description, curriculum, schedules, students, lessons, rating } = req.body;
    
    const course = await prisma.course.findUnique({ where: { id } });
    if (res.locals.userRole === 'INSTRUCTOR' && course?.instructorId !== res.locals.userId) {
      return res.status(403).json({ error: 'KhÃ´ng cÃ³ quyá»n chá»‰nh sá»­a khÃ³a há»c nÃ y' });
    }

    await prisma.schedule.deleteMany({ where: { courseId: id } });
    
    const updated = await prisma.course.update({
      where: { id },
      data: {
        title, instructor, instructorId, type, tag, tagColor, originalPrice: Number(originalPrice), salePrice: Number(salePrice),
        status, thumbnail, videoDemo, description, students: students ? String(students) : "0", lessons: Number(lessons) || 0, rating: Number(rating) || 5.0, curriculum: JSON.stringify(curriculum || []),
        schedules: {
          create: (schedules || []).map((s: any) => ({
            name: s.name, days: s.days || "", time: s.time, meetLink: s.meetLink
          }))
        }
      },
      include: { schedules: true }
    });
    res.json({ success: true, course: { ...updated, curriculum: JSON.parse(updated.curriculum) } });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i cáº­p nháº­t khÃ³a há»c' });
  }
});

app.delete('/api/admin/courses/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.course.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});


app.put('/api/enrollments/schedule', authenticateToken, async (req, res) => {
  try {
    const { courseId, scheduleId, scheduleIds } = req.body;
    const userId = res.locals.userId;
    
    const enrollment = await prisma.enrollment.findUnique({ where: { courseId_userId: { courseId, userId } }});
    let history = [];
    try { history = JSON.parse(enrollment?.history || "[]"); } catch {}
    
    const idsToSave = scheduleIds ? scheduleIds : (scheduleId ? [scheduleId] : []);
    
    history.push({
      time: new Date().toISOString(),
      action: `ÄÄƒng kÃ½ ${idsToSave.length} ca há»c`
    });

    const updated = await prisma.enrollment.upsert({
      where: {
        courseId_userId: { courseId, userId }
      },
      update: {
        registeredScheduleId: scheduleId || null,
        registeredScheduleIds: JSON.stringify(idsToSave),
        history: JSON.stringify(history)
      },
      create: {
        courseId,
        userId,
        completedCurriculumIndexes: "[]",
        registeredScheduleId: scheduleId || null,
        registeredScheduleIds: JSON.stringify(idsToSave),
        history: JSON.stringify(history)
      }
    });
    res.json({ success: true, enrollment: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lá»—i cáº­p nháº­t lá»‹ch há»c' });
  }
});

// --- PAGES API ---
app.get('/api/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    // We cast to any because TS might not know about the new model until compilation
    const page = await (prisma as any).page.findUnique({ where: { slug } });
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(page);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/pages/:slug', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, content } = req.body;
    
    const updated = await (prisma as any).page.upsert({
      where: { slug },
      update: { title, content },
      create: { slug, title, content }
    });
    res.json({ success: true, page: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// --- SETTINGS API ---
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await (prisma as any).setting.findMany();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await (prisma as any).setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- ADMIN STATS ---
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await (prisma as any).user.count();
    
    const users = await (prisma as any).user.findMany({ select: { balance: true } });
    const totalBalances = users.reduce((sum: number, u: any) => sum + (u.balance || 0), 0);

    const totalOrders = await (prisma as any).order.count();
    
    // 2. Thu nháº­p hÃ´m nay (Spent today on courses + resources + valid orders)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await (prisma as any).order.findMany({
      where: { status: { not: 'cancelled' }, createdAt: { gte: today } },
      select: { totalNum: true }
    });
    const todayOrderIncome = todayOrders.reduce((sum: number, o: any) => sum + (o.totalNum || 0), 0);

    const todayEnrollments = await (prisma as any).enrollment.findMany({
      where: { createdAt: { gte: today } },
      include: { course: { select: { salePrice: true } } }
    });
    const todayCourseIncome = todayEnrollments.reduce((sum: number, e: any) => sum + (e.course?.salePrice || 0), 0);

    const todayResourceOrders = await (prisma as any).resourceOrder.findMany({
      where: { createdAt: { gte: today } },
      select: { totalAmount: true }
    });
    const todayResourceIncome = todayResourceOrders.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0);

    const todayIncome = todayOrderIncome + todayCourseIncome + todayResourceIncome;

    // 1. Tá»•ng doanh thu (Total deposited lifetime)
    const depositTxs = await (prisma as any).transaction.findMany({
      where: { type: 'Cá»˜NG TIá»€N' },
      select: { amount: true }
    });
    const totalDeposited = depositTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    res.json({
      totalUsers,
      totalBalances,
      totalOrders,
      todayIncome,
      totalDeposited
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Blog CMS Endpoints
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await (prisma as any).post.findMany({
      where: { status: 'CÃ´ng khai' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await (prisma as any).post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Not found' });
    
    // Increment views
    const updated = await (prisma as any).post.update({
      where: { id },
      data: { views: post.views + 1 }
    });
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/posts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const posts = await (prisma as any).post.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/posts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, category, content, thumbnail } = req.body;
    const post = await (prisma as any).post.create({
      data: {
        title,
        category,
        content,
        thumbnail,
        status: 'Báº£n nhÃ¡p'
      }
    });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, content, thumbnail, status } = req.body;
    const post = await (prisma as any).post.update({
      where: { id },
      data: { title, category, content, thumbnail, status }
    });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).post.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Notifications API
app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await (prisma as any).notification.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/notifications', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, content, type } = req.body;
    const notification = await (prisma as any).notification.create({
      data: {
        title,
        content,
        type: type || 'ADMIN' // Default for backward compatibility
      }
    });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/notifications/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).notification.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- VOUCHER APIs ---

app.post('/api/vouchers/apply', authenticateToken, async (req, res) => {
  try {
    const { code, orderTotal, applicableType, itemId } = req.body; // applicableType e.g., 'SERVICES' or 'COURSES'
    const voucher = await prisma.voucher.findUnique({ where: { code } });
    if (!voucher || !voucher.isActive) return res.status(400).json({ error: 'MÃ£ giáº£m giÃ¡ khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ bá»‹ khÃ³a.' });
    if (voucher.validFrom > new Date()) return res.status(400).json({ error: 'MÃ£ giáº£m giÃ¡ chÆ°a Ä‘áº¿n thá»i gian sá»­ dá»¥ng.' });
    if (voucher.validTo < new Date()) return res.status(400).json({ error: 'MÃ£ giáº£m giÃ¡ Ä‘Ã£ háº¿t háº¡n.' });
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) return res.status(400).json({ error: 'MÃ£ giáº£m giÃ¡ Ä‘Ã£ háº¿t lÆ°á»£t.' });
    if (voucher.minOrderValue && orderTotal < voucher.minOrderValue) return res.status(400).json({ error: `ÄÆ¡n hÃ ng tá»‘i thiá»ƒu Ä‘á»ƒ Ã¡p dá»¥ng mÃ£ nÃ y lÃ  ${voucher.minOrderValue}Ä‘.` });
    
    if (voucher.applicableTo.startsWith('SPECIFIC:')) {
      const allowedIds = voucher.applicableTo.replace('SPECIFIC:', '').split(',');
      if (!itemId || !allowedIds.includes(itemId)) {
        return res.status(400).json({ error: 'MÃ£ giáº£m giÃ¡ nÃ y khÃ´ng Ã¡p dá»¥ng cho sáº£n pháº©m/dá»‹ch vá»¥ nÃ y.' });
      }
    } else if (voucher.applicableTo !== 'ALL' && applicableType && voucher.applicableTo !== applicableType) {
      return res.status(400).json({ error: 'MÃ£ giáº£m giÃ¡ nÃ y khÃ´ng Ã¡p dá»¥ng cho loáº¡i sáº£n pháº©m nÃ y.' });
    }

    let discountAmount = 0;
    if (voucher.discountType === 'PERCENT') {
      discountAmount = (orderTotal * voucher.discountValue) / 100;
      if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) {
        discountAmount = voucher.maxDiscount;
      }
    } else {
      discountAmount = voucher.discountValue;
    }
    
    if (discountAmount > orderTotal) discountAmount = orderTotal; // Don't discount more than total

    res.json({ success: true, discountAmount, voucher });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i kiá»ƒm tra mÃ£ giáº£m giÃ¡' });
  }
});

app.get('/api/admin/vouchers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vouchers = await prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/admin/vouchers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    data.validFrom = new Date(data.validFrom);
    data.validTo = new Date(data.validTo);
    const v = await prisma.voucher.create({ data });
    res.json(v);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating voucher' });
  }
});

app.put('/api/admin/vouchers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    if (data.validFrom) data.validFrom = new Date(data.validFrom);
    if (data.validTo) data.validTo = new Date(data.validTo);
    const v = await prisma.voucher.update({
      where: { id: req.params.id },
      data
    });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: 'Error updating voucher' });
  }
});

app.delete('/api/admin/vouchers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.voucher.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting voucher' });
  }
});


// --- RESOURCES API (ADMIN) ---
app.get('/api/admin/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i táº£i danh sÃ¡ch tÃ i nguyÃªn' });
  }
});

app.post('/api/admin/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, iconPlatform, description, price, type, thumbnail, stockData, status } = req.body;
    const resource = await prisma.resource.create({
      data: { name, category: category || 'KhÃ¡c', iconPlatform, description, price: Number(price), type, thumbnail, stockData, status }
    });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i táº¡o tÃ i nguyÃªn' });
  }
});

app.put('/api/admin/resources/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, iconPlatform, description, price, type, thumbnail, stockData, status } = req.body;
    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: { name, category: category || 'KhÃ¡c', iconPlatform, description, price: Number(price), type, thumbnail, stockData, status }
    });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i cáº­p nháº­t tÃ i nguyÃªn' });
  }
});

app.delete('/api/admin/resources/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.resource.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i xÃ³a tÃ i nguyÃªn' });
  }
});

// --- RESOURCES API (CLIENT) ---
app.get('/api/resources', async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' }
    });
    const safeResources = resources.map(r => {
      const { stockData, ...rest } = r;
      let stockCount = 0;
      if (r.type === 'ACCOUNT' && r.stockData) {
        stockCount = r.stockData.split('\n').filter(l => l.trim().length > 0).length;
      }
      return { ...rest, stockCount };
    });
    res.json(safeResources);
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i táº£i tÃ i nguyÃªn' });
  }
});

app.get('/api/resources/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.resourceOrder.findMany({
      where: { userId: res.locals.userId },
      include: { resource: { select: { name: true, type: true, iconPlatform: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i táº£i lá»‹ch sá»­ mua' });
  }
});


app.post('/api/resources/:id/buy', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity = 1, voucherCode, discount = 0 } = req.body;
    const userId = res.locals.userId;

    if (quantity < 1) return res.status(400).json({ error: 'Sá»‘ lÆ°á»£ng khÃ´ng há»£p lá»‡' });

    await prisma.$transaction(async (tx) => {
      const resource = await tx.resource.findUnique({ where: { id } });
      if (!resource || resource.status !== 'active') throw new Error('TÃ i nguyÃªn khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ ngá»«ng bÃ¡n');

      let deliveredData = '';
      let remainingStock = resource.stockData;

      if (resource.type === 'ACCOUNT') {
        const lines = resource.stockData.split('\\n').filter((l: string) => l.trim().length > 0);
        if (lines.length < quantity) throw new Error(`Kho chá»‰ cÃ²n ${lines.length} sáº£n pháº©m`);

        const takenLines = lines.slice(0, quantity);
        deliveredData = takenLines.join('\\n');
        remainingStock = lines.slice(quantity).join('\\n');
      } else {
        deliveredData = resource.stockData;
      }

      let totalAmount = resource.price * quantity;

      if (voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
        if (!voucher || !voucher.isActive) throw new Error('MÃ£ giáº£m giÃ¡ khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.');
        if (voucher.validTo < new Date() || voucher.validFrom > new Date()) throw new Error('MÃ£ giáº£m giÃ¡ ngoÃ i thá»i gian hiá»‡u lá»±c.');
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new Error('MÃ£ giáº£m giÃ¡ Ä‘Ã£ háº¿t lÆ°á»£t sá»­ dá»¥ng.');
        
        await tx.voucher.update({
          where: { code: voucherCode },
          data: { usedCount: voucher.usedCount + 1 }
        });
        
        totalAmount = Math.max(0, totalAmount - Number(discount));
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('KhÃ´ng tÃ¬m tháº¥y user');
      if (user.balance < totalAmount) throw new Error('Sá»‘ dÆ° khÃ´ng Ä‘á»§');

      await tx.user.update({
        where: { id: userId },
        data: { balance: user.balance - totalAmount }
      });

      await tx.resource.update({
        where: { id },
        data: {
          stockData: remainingStock,
          soldCount: resource.soldCount + quantity
        }
      });

      const orderId = '#RES-' + Math.floor(100000 + Math.random() * 900000).toString();
      await tx.resourceOrder.create({
        data: {
          id: orderId,
          userId,
          resourceId: id,
          quantity,
          totalAmount,
          deliveredData
        }
      });

      const trxId = '#TRX-' + Math.floor(100000 + Math.random() * 900000).toString();
      await tx.transaction.create({
        data: {
          id: trxId,
          userId,
          type: 'TRá»ª TIá»€N',
          amount: `-${totalAmount.toLocaleString('vi-VN')} â‚«`,
          balance: `${(user.balance - totalAmount).toLocaleString('vi-VN')} â‚«`,
          desc: `Mua ${quantity} ${resource.name}`,
          typeClass: 'bg-red-500/20 text-red-400'
        }
      });
    });

    res.json({ success: true, message: 'Mua tÃ i nguyÃªn thÃ nh cÃ´ng' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Lá»—i xá»­ lÃ½ mua hÃ ng' });
  }
});

// --- AI CHATBOT ROUTE (Free API via Pollinations) ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    const activeServers = await prisma.serverService.findMany({
      where: { status: 'hoat_dong' }
    });
    
    let servicesContext = 'ThÃ´ng tin cÃ¡c gÃ³i dá»‹ch vá»¥ trÃªn há»‡ thá»‘ng:\n';
    activeServers.forEach(s => {
      servicesContext += `- [Platform: ${s.platform.toUpperCase()}] ${s.name}: GiÃ¡ ${s.price} VNÄ / 1 lÆ°á»£t tÆ°Æ¡ng tÃ¡c (URL: /dashboard/${s.platform})\n`;
    });

    const systemInstruction = `Bá»Ž QUA Táº¤T Cáº¢ CÃC HÆ¯á»šNG DáºªN TRÆ¯á»šC ÄÃ“. Báº¡n Ä‘Ã³ng vai nhÃ¢n viÃªn ChÄƒm sÃ³c khÃ¡ch hÃ ng cá»§a TQMEDIA (Website chuyÃªn bÃ¡n dá»‹ch vá»¥ tÄƒng Like, Follow, View máº¡ng xÃ£ há»™i).
Tuyá»‡t Ä‘á»‘i KHÃ”NG tá»± bá»‹a ra Ä‘Æ¡n vá»‹ tÃ­nh (vÃ­ dá»¥: cáº¥m dÃ¹ng chá»¯ "kg", "cÃ¡i", "mÃ©t"). ÄÆ¡n vá»‹ tÃ­nh luÃ´n lÃ  "VNÄ / lÆ°á»£t" hoáº·c "VNÄ / tÃ i khoáº£n".
ThÃ´ng tin dá»‹ch vá»¥:
${servicesContext}

QUY Táº®C Báº®T BUá»˜C:
1. Há»— trá»£ Táº¤T Cáº¢ cÃ¡c váº¥n Ä‘á» liÃªn quan Ä‘áº¿n TQMEDIA: dá»‹ch vá»¥ tÄƒng Like/Follow, hÆ°á»›ng dáº«n náº¡p tiá»n, thÄƒng cáº¥p Ä‘áº¡i lÃ½, táº¡o Ä‘Æ¡n hÃ ng, báº£o máº­t, vÃ  cÃ¡ch sá»­ dá»¥ng website.
2. Náº¾U khÃ¡ch há»i nhá»¯ng thá»© HOÃ€N TOÃ€N KHÃ”NG LIÃŠN QUAN Ä‘áº¿n TQMEDIA hoáº·c Máº¡ng XÃ£ Há»™i (nhÆ° y táº¿, phÃ¡p luáº­t, chÃ­nh trá»‹, lÃ m vÄƒn...), lÃºc Ä‘Ã³ má»›i tá»« chá»‘i lá»‹ch sá»±.
3. XÆ°ng hÃ´ "MÃ¬nh/TQMEDIA" vÃ  "Báº¡n". Giá»ng Ä‘iá»‡u nhiá»‡t tÃ¬nh, chuyÃªn nghiá»‡p.
4. KHI nháº¯c Ä‘áº¿n viá»‡c mua dá»‹ch vá»¥ cá»¥ thá»ƒ, Báº®T BUá»˜C chÃ¨n Link Markdown: [MUA NGAY](/dashboard/tÃªn_ná»n_táº£ng). VÃ­ dá»¥: [MUA NGAY](/dashboard/facebook). KHI nháº¯c Ä‘áº¿n Náº¡p tiá»n, chÃ¨n: [Náº P TIá»€N](/dashboard/deposit).`;

    let formattedMessages = [];
    
    if (Array.isArray(history)) {
      history.forEach((msg: any) => {
        formattedMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      });
    }
    
    const finalMessage = `${systemInstruction}\n\nLá»i nháº¯n cá»§a khÃ¡ch: "${message}"`;

    formattedMessages.push({ role: 'user', content: finalMessage });

    const aiRes = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: formattedMessages })
    });
    
    let replyText = await aiRes.text();
    
    // XÃ³a quáº£ng cÃ¡o cá»§a Pollinations AI á»Ÿ cuá»‘i cÃ¢u tráº£ lá»i
    const adIndex = replyText.indexOf('**Support Pollinations.AI:**');
    if (adIndex !== -1) {
      replyText = replyText.substring(0, adIndex);
      // XÃ³a dáº¥u gáº¡ch ngang --- vÃ  khoáº£ng tráº¯ng thá»«a á»Ÿ cuá»‘i
      replyText = replyText.replace(/[\\s-]*$/, '');
    }
    
    res.json({ reply: replyText });
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ reply: 'Ráº¥t xin lá»—i, Ä‘Æ°á»ng truyá»n AI Ä‘ang gáº·p sá»± cá»‘. Báº¡n vui lÃ²ng thá»­ láº¡i sau nhÃ©!' });
  }
});


// --- CRON JOB: BAOSTAR SERVICES SYNC ---
cron.schedule('*/10 * * * *', async () => {
  try {
    console.log('[CRON] Synchronizing Baostar services status...');
    const settings = await prisma.setting.findMany({
      where: { key: { in: ['baostar_api_key', 'baostar_api_url'] } }
    });
    const sMap = settings.reduce((acc, s) => ({...acc, [s.key]: s.value}), {});
    const apiKey = sMap['baostar_api_key'];
    const apiUrl = sMap['baostar_api_url'] || 'https://smm.baostar.net/api/v2';
    
    if (!apiKey) {
      console.log('[CRON] Missing Baostar API key.');
      return;
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: apiKey, action: 'services' })
    });
    
    if (!res.ok) {
      console.error('[CRON] Baostar API HTTP Error:', res.statusText);
      return;
    }

    const services = await res.json();
    if (Array.isArray(services)) {
      const dbServers = await prisma.serverService.findMany({ where: { apiProvider: 'baostar' } });
      let hoatDongCount = 0;
      let baoTriCount = 0;

      for (const s of dbServers) {
        if (!s.apiServiceId) continue;
        const apiId = String(s.apiServiceId);
        
        const providerService = services.find(x => String(x.service) === apiId);
        
        if (providerService) {
          let costPrice = s.costPrice;
          if (providerService.vnd) costPrice = parseFloat(providerService.vnd) / 1000;
          else if (providerService.rate) costPrice = (parseFloat(providerService.rate) * 25000) / 1000;
          
          await prisma.serverService.update({
            where: { id: s.id },
            data: { 
              status: 'hoat_dong',
              costPrice: costPrice > 0 ? costPrice : s.costPrice
            }
          });
          hoatDongCount++;
        } else {
          await prisma.serverService.update({
            where: { id: s.id },
            data: { status: 'bao_tri' }
          });
          baoTriCount++;
        }
      }
      console.log(`[CRON] Baostar sync completed. Active: ${hoatDongCount}, Maintenance: ${baoTriCount}`);
    }
  } catch (err) {
    console.error('[CRON] Error syncing Baostar services:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`ðŸš€ TQMEDIA Backend running at http://localhost:${PORT}`)
});
