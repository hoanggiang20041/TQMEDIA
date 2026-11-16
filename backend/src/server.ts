import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import Groq from 'groq-sdk'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OTP } from 'otplib'
import qrcode from 'qrcode'
import nodemailer from 'nodemailer'
import TelegramBot from 'node-telegram-bot-api'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import xss from 'xss'
import crypto from 'crypto'
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { AI_URL_CONTEXT } from './utils/aiContextUrls';

const otp = new OTP()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
})

const prisma = new PrismaClient()

let bot: TelegramBot | null = null;
let currentBotToken = '';

export async function initTelegramBot() {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ['telegram_bot_token'] } }
    });
    const token = settings.find((s: any) => s.key === 'telegram_bot_token')?.value || process.env.TELEGRAM_BOT_TOKEN;
    
    if (token && token !== currentBotToken) {
      if (bot) {
        bot.stopPolling();
      }
      bot = new TelegramBot(token, { polling: true });
      currentBotToken = token;
      
      // Setup callback query listener
      bot.on('callback_query', handleTelegramCallback);
      console.log('✅ Telegram Bot Polling Started');
    }
  } catch (err) {
    console.error('Failed to init Telegram bot:', err);
  }
}

async function handleTelegramCallback(callbackQuery: TelegramBot.CallbackQuery) {
  if (!bot) return;
  const data = callbackQuery.data;
  const message = callbackQuery.message;
  
  if (!data || !message) return;
  
  try {
    if (data.startsWith('approve_refund_')) {
      const orderId = data.replace('approve_refund_', '');
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return bot.answerCallbackQuery(callbackQuery.id, { text: 'Không tìm thấy đơn hàng' });
      if (order.status === 'cancelled') return bot.answerCallbackQuery(callbackQuery.id, { text: 'Đơn hàng đã hủy trước đó' });

      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: orderId }, data: { status: 'cancelled' } });
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
              type: 'HOÀN TIỀN',
              amount: `+${fmt(order.totalNum)} ₫`,
              balance: `${fmt(user.balance + order.totalNum)} ₫`,
              desc: `Hoàn tiền do KTV duyệt hủy đơn ${order.id}`,
              typeClass: 'text-blue-400 bg-blue-400/10 border-blue-400/30'
            }
          });
        }
      });
      
      await bot.editMessageText(`✅ Đã DUYỆT hủy đơn ${orderId} thành công. Khách hàng đã được hoàn lại tiền.`, {
        chat_id: message.chat.id,
        message_id: message.message_id
      });
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Đã duyệt hủy đơn và hoàn tiền!' });

    } else if (data.startsWith('reject_refund_')) {
      const orderId = data.replace('reject_refund_', '');
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return bot.answerCallbackQuery(callbackQuery.id, { text: 'Không tìm thấy đơn hàng' });
      
      if (order.status === 'refund_requested') {
         await prisma.order.update({ where: { id: orderId }, data: { status: 'running' } });
      }

      await bot.editMessageText(`❌ Đã TỪ CHỐI yêu cầu hủy đơn ${orderId}.`, {
        chat_id: message.chat.id,
        message_id: message.message_id
      });
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Đã từ chối hủy đơn' });
    }
  } catch(err) {
    console.error('Error handling telegram callback:', err);
    if (bot) bot.answerCallbackQuery(callbackQuery.id, { text: 'Đã xảy ra lỗi' });
  }
}

async function sendTelegramNotification(message: string, inlineKeyboard?: any) {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ['telegram_bot_token', 'telegram_chat_id'] } }
    });
    const sMap = settings.reduce((acc: any, s: any) => ({...acc, [s.key]: s.value}), {});
    const token = sMap['telegram_bot_token'] || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = sMap['telegram_chat_id'] || process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) return;
    
    const safeMessage = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;b&gt;/g, '<b>')
      .replace(/&lt;\/b&gt;/g, '</b>');
      
    if (bot && currentBotToken === token) {
       await bot.sendMessage(chatId, safeMessage, {
         parse_mode: 'HTML',
         reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined
       });
       return;
    }
    
    const body: any = {
      chat_id: chatId,
      text: safeMessage,
      parse_mode: 'HTML'
    };
    if (inlineKeyboard) {
      body.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      const errText = await res.text();
      console.error('Telegram API error:', errText);
    }
  } catch (err) {
    console.error('Telegram notification error:', err);
  }
}

const app = express()
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
(global as any).io = io; // Make io globally accessible

io.on("connection", (socket) => {
  console.log("New client connected: ", socket.id);
  
  socket.on("join", (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected: ", socket.id);
  });
});

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
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  skip: (req, res) => res.locals?.userRole === 'ADMIN',
  message: { reply: 'Bạn đã nhắn quá nhanh (Vượt giới hạn chống Spam). Vui lòng chờ 1 phút rồi thử lại nhé!' }
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 1000, // Tối đa 1000 requests / 15 phút
  message: { error: 'Quá nhiều yêu cầu từ IP của bạn, vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', globalLimiter)

// 5. Auth Rate Limiting (Anti-Brute Force for auth routes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Tối đa 2000 requests / 15 phút cho auth
  message: { error: 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.' },
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
      console.log('✅ Admin user created: admin@tqmedia.com / 123')
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
const optionalAuthenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (!err && user) {
      res.locals.userId = user.id;
      res.locals.userRole = user.role;
    }
    next();
  });
};

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Không có quyền truy cập (Missing token)' })

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token hết hạn hoặc không hợp lệ' })
    res.locals.userId = user.id
    res.locals.userRole = user.role
    next()
  })
}

const requireAdminOrInstructor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await (prisma as any).user.findUnique({ where: { id: res.locals.userId }, select: { role: true } });
    if (user?.role !== 'ADMIN' && user?.role !== 'INSTRUCTOR') return res.status(403).json({ error: 'Chỉ Admin hoặc Giảng viên mới có quyền.' });
    res.locals.userRole = user.role;
    next();
  } catch (e) { res.status(500).json({ error: 'Lỗi xác thực.' }); }
}

const requireAdminOrTechnician = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await (prisma as any).user.findUnique({ where: { id: res.locals.userId }, select: { role: true } });
    if (user?.role !== 'ADMIN' && user?.role !== 'TECHNICIAN') return res.status(403).json({ error: 'Chỉ Admin hoặc Kỹ thuật viên mới có quyền.' });
    res.locals.userRole = user.role;
    next();
  } catch (e) { res.status(500).json({ error: 'Lỗi xác thực.' }); }
}

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await (prisma as any).user.findUnique({ where: { id: res.locals.userId }, select: { role: true } });
    if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Chỉ Admin mới có quyền thực hiện hành động này.' });
    res.locals.userRole = user.role;
    next();
  } catch (e) { res.status(500).json({ error: 'Lỗi xác thực.' }); }
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
    subject: 'Mã xác thực Email từ TQMEDIA',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">Xác thực tài khoản TQMEDIA</h2>
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>Đây là mã xác thực 6 số của bạn. Vui lòng nhập mã này vào trang web để tiếp tục:</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; color: #111;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #6b7280; margin-top: 20px; text-align: center;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
      </div>
    `
  }
  await transporter.sendMail(mailOptions)
}


const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per window
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/forgot-password', verifyTurnstile, forgotPasswordLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ error: 'Email không tồn tại.' });
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
      subject: 'Yêu cầu khôi phục mật khẩu - TQMEDIA',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Khôi phục mật khẩu</h2>
          <p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu khôi phục mật khẩu cho tài khoản của bạn.</p>
          <p>Vui lòng click vào nút bên dưới để đặt lại mật khẩu (Link có hiệu lực 15 phút):</p>
          <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">ĐẶT LẠI MẬT KHẨU</a>
          <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email khôi phục đã được gửi!' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi xử lý yêu cầu.' });
  }
});

app.post('/api/auth/reset-password', verifyTurnstile, async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Thiếu thông tin.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
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

    res.json({ message: 'Đặt lại mật khẩu thành công!' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi đặt lại mật khẩu.' });
  }
});

app.post('/api/auth/register', verifyTurnstile, async (req: Request, res: Response) => {
  try {
    const { name, email, password, ref } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email đã được sử dụng' })

    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Default data
    let createData: any = { name, email, password: hashedPassword, role: 'GUEST', isEmailVerified: false };
    
    // Check referral
    if (ref) {
       const referrer = await prisma.user.findUnique({ where: { referralCode: ref } });
       if (referrer) {
           createData.referredById = referrer.id;
       }
    }
    
    const newUser = await prisma.user.create({
      data: createData
    })

    // Process Referral Milestone Reward
    if (newUser.referredById) {
      const settings = await prisma.setting.findMany({
        where: { key: { in: ['affiliate_enabled', 'affiliate_milestone_count', 'affiliate_milestone_reward'] } }
      });
      const sMap = settings.reduce((acc: any, s: any) => ({ ...acc, [s.key]: s.value }), {});
      
      if (sMap['affiliate_enabled'] !== 'false') {
        const milestoneCount = parseInt(sMap['affiliate_milestone_count'] || '3');
        const milestoneReward = parseInt(sMap['affiliate_milestone_reward'] || '50000');
        
        const totalValidReferrals = await prisma.user.count({ where: { referredById: newUser.referredById } });
        
        if (totalValidReferrals > 0 && totalValidReferrals % milestoneCount === 0) {
          
          // Send Telegram Notification for Affiliate Milestone
          const referrer = await prisma.user.findUnique({ where: { id: newUser.referredById } });
          if (referrer) {
            sendTelegramNotification(`<b>[YÊU CẦU DUYỆT HOA HỒNG]</b>\n👤 Đại lý: ${referrer.name} (${referrer.email})\n🎁 Yêu cầu duyệt thưởng mốc ${totalValidReferrals} giới thiệu\n💰 Số tiền thưởng: ${milestoneReward.toLocaleString('vi-VN')} ₫\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n👉 Vui lòng vào trang Quản trị -> Hoa hồng để duyệt.`);
          }

          await prisma.referralReward.create({
            data: {
              referrerId: newUser.referredById,
              referredUserId: newUser.id,
              amount: milestoneReward,
              reason: `Thưởng mốc ${totalValidReferrals} lượt giới thiệu thành công`,
              status: 'PENDING',
              ipAddress: Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown'
            }
          });
        }
      }
    }

    
    // Send Telegram Notification
    sendTelegramNotification(`<b>[ĐĂNG KÝ MỚI]</b>\n👤 Tên: ${newUser.name}\n📧 Email: ${newUser.email}\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    
    await sendVerificationEmail(newUser.id, newUser.email, newUser.name)

    const tempToken = jwt.sign({ id: newUser.id, pendingEmail: true }, JWT_SECRET, { expiresIn: '15m' })
    res.json({ success: true, requireEmailVerification: true, tempToken })
  } catch (err) {
    console.error('Register Error:', err)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

app.post('/api/auth/login', verifyTurnstile, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' })

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' })

    // Ghi nhận LoginLog
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
    res.status(500).json({ error: 'Lỗi server' })
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
    res.status(500).json({ error: 'Lỗi truy xuất lịch sử' })
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
    if (!user || !user.twoFactorSecret) return res.status(400).json({ error: 'Secret chưa được tạo' })

    const isValid = await otp.verify({ token, secret: user.twoFactorSecret })
    if (!isValid.valid) return res.status(400).json({ error: 'Mã xác thực không đúng' })

    await prisma.user.update({
      where: { id: user.id },
      data: { isTwoFactorEnabled: true }
    })

    res.json({ success: true, message: 'Đã bật 2FA thành công' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to enable 2FA' })
  }
})

app.post('/api/auth/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body // Require code to disable
    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } })
    if (!user || !user.twoFactorSecret) return res.status(400).json({ error: 'Secret chưa được tạo' })

    const isValid = await otp.verify({ token, secret: user.twoFactorSecret })
    if (!isValid.valid) return res.status(400).json({ error: 'Mã xác thực không đúng' })

    await prisma.user.update({
      where: { id: user.id },
      data: { isTwoFactorEnabled: false, twoFactorSecret: null }
    })

    res.json({ success: true, message: 'Đã tắt 2FA' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to disable 2FA' })
  }
})

app.post('/api/auth/2fa/verify-login', async (req, res) => {
  try {
    const { tempToken, code } = req.body
    if (!tempToken || !code) return res.status(400).json({ error: 'Thiếu thông tin' })

    const decoded = jwt.verify(tempToken, JWT_SECRET) as any
    if (!decoded.pending2FA) return res.status(401).json({ error: 'Token không hợp lệ' })

    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!user || !user.twoFactorSecret) return res.status(401).json({ error: 'Lỗi người dùng' })

    const isValid = await otp.verify({ token: code, secret: user.twoFactorSecret })
    if (!isValid.valid) return res.status(401).json({ error: 'Mã xác thực không đúng' })

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance } })
  } catch (err) {
    res.status(401).json({ error: 'Phiên bản hoặc mã xác nhận không hợp lệ' })
  }
})

// -- EMAIL VERIFICATION --

app.post('/api/auth/verify-login-email', async (req, res) => {
  try {
    const { tempToken, code } = req.body
    if (!tempToken || !code) return res.status(400).json({ error: 'Thiếu thông tin' })

    const decoded = jwt.verify(tempToken, JWT_SECRET) as any
    if (!decoded.pendingEmail) return res.status(401).json({ error: 'Token không hợp lệ' })

    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' })

    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ error: 'Mã xác thực không đúng' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerificationCode: null }
    })

    // Nếu có 2FA thì yêu cầu 2FA
    if (user.isTwoFactorEnabled) {
      const nextTempToken = jwt.sign({ id: user.id, pending2FA: true }, JWT_SECRET, { expiresIn: '5m' })
      return res.json({ success: true, require2FA: true, tempToken: nextTempToken })
    }

    // Nếu không có 2FA, cấp token đăng nhập luôn
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance } })
  } catch (err) {
    res.status(401).json({ error: 'Phiên bản hoặc mã xác nhận không hợp lệ' })
  }
})

app.post('/api/auth/send-verification', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } })
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' })
    if (user.isEmailVerified) return res.status(400).json({ error: 'Email đã được xác thực trước đó' })

    await sendVerificationEmail(user.id, user.email, user.name)
    res.json({ success: true, message: 'Đã gửi mã xác thực qua Email' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Không thể gửi email. Vui lòng kiểm tra lại cấu hình SMTP.' })
  }
})

app.post('/api/auth/verify-email', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Vui lòng nhập mã xác nhận' })

    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } })
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' })

    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ error: 'Mã xác thực không đúng' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerificationCode: null }
    })

    res.json({ success: true, message: 'Xác thực Email thành công' })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' })
  }
})

app.get('/api/auth/me', authenticateToken, async (_req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } })
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' })
    
    let agencyDiscounts = [];
    if (user.agencyLevel > 0) {
      agencyDiscounts = await (prisma as any).agencyDiscount.findMany({
        where: { agencyLevel: user.agencyLevel }
      });
    }
    
    res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, balance: user.balance, createdAt: user.createdAt, isTwoFactorEnabled: user.isTwoFactorEnabled, isEmailVerified: user.isEmailVerified, agencyLevel: user.agencyLevel, agencyDiscounts })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// --- USER ROUTES ---
// Lấy danh sách dịch vụ theo nền tảng (Public)
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

// Lịch sử đơn hàng của cá nhân
app.get('/api/orders', authenticateToken, async (_req, res) => {
  try {
    const userId = res.locals.userId;
    
    // User page chỉ thấy đơn của mình, dù là admin
    const where = { userId };

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    const formatted = orders.map(o => ({
      ...o,
      date: new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(o.createdAt)
    }))
    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// Lịch sử toàn bộ đơn hàng cho Admin
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' }
    })
    const formatted = orders.map(o => ({
      ...o,
      date: new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(o.createdAt)
    }))
    res.json(formatted)
} catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// KTV: Lấy danh sách đơn hàng (không hiển thị tiền)
app.get('/api/technician/orders', authenticateToken, requireAdminOrTechnician, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, name: true } } }
    })
    const formatted = orders.map(o => ({
      id: o.id,
      platform: o.platform,
      service: o.service,
      target: o.target,
      status: o.status,
      quantity: o.quantity,
      startCount: o.startCount,
      remains: o.remains,
      customData: o.customData,
      user: o.user,
      date: new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(o.createdAt)
    }))
    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

// KTV: Duyệt hủy đơn
app.put('/api/technician/orders/:id/approve-refund', authenticateToken, requireAdminOrTechnician, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (order.status === 'cancelled') return res.status(400).json({ error: 'Đơn hàng đã hủy trước đó' });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: 'cancelled' } });
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
            type: 'HOÀN TIỀN',
            amount: `+${fmt(order.totalNum)} ₫`,
            balance: `${fmt(user.balance + order.totalNum)} ₫`,
            desc: `Hoàn tiền do KTV duyệt hủy đơn ${order.id}`,
            typeClass: 'text-blue-400 bg-blue-400/10 border-blue-400/30'
          }
        });
      }
    });
    res.json({ success: true, message: 'Đã duyệt hủy đơn và hoàn tiền.' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi' });
  }
})

// KTV: Từ chối hủy đơn
app.put('/api/technician/orders/:id/reject-refund', authenticateToken, requireAdminOrTechnician, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (order.status === 'refund_requested') {
       await prisma.order.update({ where: { id: orderId }, data: { status: 'running' } });
    }
    res.json({ success: true, message: 'Đã từ chối hủy đơn.' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi' });
  }
})

// Toàn bộ giao dịch cho Admin (Tài chính & Dòng tiền)
app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const transactions = await (prisma as any).transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    
    const formatted = transactions.map((t: any) => ({
      ...t,
      date: new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(t.createdAt)
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching admin transactions:', err);
    res.status(500).json({ error: 'Database error' });
  }
});


// Cập nhật thông tin profile (chỉ cập nhật tên)
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên' });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, phone: phone || null }
    });
    res.json({ success: true, user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone, role: updatedUser.role, balance: updatedUser.balance } });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// Đổi mật khẩu
app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Mật khẩu cũ không đúng' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    
    // Send Telegram Notification
    const userUpdate = await prisma.user.findUnique({ where: { id: userId } });
    if (userUpdate) {
      sendTelegramNotification(`<b>[NÂNG CẤP ĐẠI LÝ]</b>\n👤 Tên: ${userUpdate.name} (${userUpdate.email})\n⭐ Lên cấp: Thành công\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// Tạo đơn hàng mới
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const userId = res.locals.userId;
    let { platform, serviceType, serverId, serverName, target, quantity, total, note, voucherCode, discount = 0 } = req.body
    
    // Strict numeric validation
    quantity = Number(quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Số lượng không hợp lệ.' })
    }

    if (!platform || !serviceType || !serverId || !target || total === undefined) {
      return res.status(400).json({ error: 'Thiếu thông tin đơn hàng.' })
    }

    const txResult = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found')

      const server = await tx.serverService.findUnique({ where: { id: serverId } })
      if (!server) throw new Error('Máy chủ không tồn tại.')
      if (server.status === 'bao_tri') {
        throw new Error('Máy chủ này đang được bảo trì. Vui lòng chọn máy chủ khác!')
      }

      if (quantity < server.min) {
        throw new Error(`Số lượng tối thiểu là ${server.min}.`)
      }
      if (quantity > server.max) {
        throw new Error(`Số lượng tối đa là ${server.max}.`)
      }

      let calculatedTotal = server.price * quantity;

      // Check voucher if present
      if (voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
        if (!voucher || !voucher.isActive) throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
        if (voucher.validTo < new Date() || voucher.validFrom > new Date()) throw new Error('Mã giảm giá ngoài thời gian hiệu lực.');
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new Error('Mã giảm giá đã hết lượt sử dụng.');
        
        if (voucher.discountType === 'PERCENTAGE') {
          calculatedTotal = Math.max(0, calculatedTotal * (1 - voucher.discountValue / 100));
        } else {
          calculatedTotal = Math.max(0, calculatedTotal - voucher.discountValue);
        }
        
        await tx.voucher.update({
          where: { code: voucherCode },
          data: { usedCount: voucher.usedCount + 1 }
        });
      }

      let maxPercent = -1;
      if (user.role === 'ADMIN') {
        maxPercent = 100;
      } else {
        if (user.agencyLevel > 0) {
          const agencyDiscount = await tx.agencyDiscount.findFirst({
            where: { agencyLevel: user.agencyLevel, itemType: 'SERVICE', itemId: { in: [server.id, 'ALL'] } },
            orderBy: { discountPercent: 'desc' }
          });
          if (agencyDiscount) {
            maxPercent = agencyDiscount.discountPercent;
          }
        }

        if (maxPercent === -1) {
          const globalDiscountSetting = await tx.setting.findUnique({ where: { key: `discount_${user.role}` } });
          if (globalDiscountSetting) {
            maxPercent = parseFloat(globalDiscountSetting.value) || 0;
          } else {
            maxPercent = 0;
          }
        }
      }

      if (maxPercent > 0) {
        calculatedTotal = Math.max(0, calculatedTotal * (1 - maxPercent / 100));
      }

      total = calculatedTotal;

      if (total > 0 && user.balance < total) {
        throw new Error('Số dư không đủ. Vui lòng nạp thêm tiền.');
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
          total: `${fmt(total)} đ`,
          totalNum: Number(total),
          voucherCode: voucherCode || null,
          discount: Number(discount) || 0,
          apiProvider: server.apiProvider || null,
          quantity: Number(quantity),
          costPrice: (server.costPrice || 0) * Number(quantity),
          profit: Number(total) - ((server.costPrice || 0) * Number(quantity))
        }
      })

      await tx.transaction.create({
        data: {
          id: `#TRX-${Date.now()}`,
          userId: user.id,
          type: 'TRỪ TIỀN',
          amount: `-${fmt(total)} ₫`,
          balance: `${fmt(newBalance)} ₫`,
          desc: `Tạo đơn ${orderId} (${platform.toUpperCase()} ${serviceType.toUpperCase()} - ${serverName})`,
          typeClass: 'text-red-400 bg-red-400/10 border-red-400/30'
        }
      })
      
      return { orderId, server }
    })
    
    const user = await prisma.user.findUnique({ where: { id: userId } })

    
    // Send Telegram Notification
    sendTelegramNotification(`<b>[ĐƠN TƯƠNG TÁC MỚI]</b>\n👤 Người đặt: ${user?.email}\n🚀 Dịch vụ: ${platform.toUpperCase()} ${serviceType.toUpperCase()} - ${serverName}\n🔗 Link: ${target}\n🔢 Số lượng: ${quantity}\n💰 Tổng tiền: ${total.toLocaleString('vi-VN')} ₫\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);

    res.json({ 
      success: true, 
      message: 'Tạo đơn thành công!',
      newBalance: user?.balance
    })

    // Gửi đơn cho bên thứ 3 ngầm ở phía sau (không làm chậm response)
    if (txResult.server.apiProvider && txResult.server.apiServiceId) {
      placeProviderOrder(
        txResult.orderId,
        txResult.server.apiProvider,
        txResult.server.apiServiceId,
        target,
        quantity
      ).catch(console.error);
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Lỗi hệ thống' })
  }
})


// --- API PROVIDER INTEGRATION ---
async function placeProviderOrder(orderId: string, provider: string, serviceId: string, target: string, quantity: number) {
  if (!provider || !serviceId) return;
  try {
    let apiUrl = '';
    let apiToken = '';
    
    const settings = await prisma.setting.findMany({
      where: { key: { in: ['subgiare_api_key', 'subgiare_api_url', '1dg_api_key', '1dg_api_url'] } }
    });
    const sMap = settings.reduce((acc: any, s: any) => ({...acc, [s.key]: s.value}), {});

    if (provider === 'subgiare') {
      apiUrl = sMap['subgiare_api_url'] || 'https://subgiare.vn/api/order';
      apiToken = sMap['subgiare_api_key'] || '';
    } else if (provider === '1dg') {
      apiUrl = sMap['1dg_api_url'] || 'https://1dg.me/api/v2';
      apiToken = sMap['1dg_api_key'] || '';
    } else if (provider === 'baostar') {
      apiUrl = sMap['baostar_api_url'] || 'https://smm.baostar.net/api/v2';
      apiToken = sMap['baostar_api_key'] || 'EAAABtpqnnsSwncubx7h0os2aga2socyat7i5oaSKittzi4t9gpJ4h4l/';
    }

    if (!apiToken || !apiUrl) {
      console.log(`[API] Missing token or url for ${provider}`);
      return;
    }

    const formData = new URLSearchParams();
    formData.append('key', apiToken);
    formData.append('action', 'add');
    formData.append('service', serviceId);
    formData.append('link', target);
    formData.append('quantity', quantity.toString());

    const res = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    
    if (data.error || data.status === 'error' || data.error === 'true') {
      console.log(`[API] ${provider} error for ${orderId}:`, data);
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order && order.status === 'processing') {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'cancelled', apiResponse: JSON.stringify(data) }
          });
          const user = await tx.user.findUnique({ where: { id: order.userId } });
          if (user) {
            await tx.user.update({
              where: { id: user.id },
              data: { balance: { increment: order.totalNum } }
            });
            await tx.transaction.create({
              data: {
                id: `#TRX-${Math.floor(1000 + Math.random() * 9000)}`,
                userId: user.id,
                type: 'HOÀN TIỀN',
                amount: `+${new Intl.NumberFormat('vi-VN').format(order.totalNum)} đ`,
                balance: `${new Intl.NumberFormat('vi-VN').format(user.balance + order.totalNum)} đ`,
                desc: `Hoàn tiền đơn ${order.id} (Nhà cung cấp từ chối)`,
                typeClass: 'text-green-400 bg-green-400/10 border-green-400/30'
              }
            });
          }
        });
      } else {
        await prisma.order.update({
          where: { id: orderId },
          data: { apiResponse: JSON.stringify(data) }
        });
      }
    } else {
      console.log(`[API] ${provider} success for ${orderId}:`, data);
      const externalId = data.order ? String(data.order) : (data.data?.id ? String(data.data.id) : null);
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          apiOrderId: externalId,
          apiResponse: JSON.stringify(data) 
        }
      });
    }
  } catch (err: any) {
    console.error(`[API] Network error calling ${provider}:`, err.message);
  }
}

// Khách hàng yêu cầu hủy đơn

app.put('/api/orders/:id/refund', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = res.locals.userId;
    const order = await prisma.order.findUnique({ where: { id }, include: { user: true } });
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    
    // Check permission
    if (res.locals.userRole !== 'ADMIN' && res.locals.userRole !== 'TECHNICIAN' && order.userId !== userId) {
      return res.status(403).json({ error: 'Không có quyền thao tác trên đơn hàng này' });
    }
    
    if (order.status === 'processing' || order.status === 'running') {
      await prisma.order.update({
        where: { id },
        data: { status: 'refund_requested' }
      });
      
      const inlineKeyboard = [
        [
          { text: '✅ Duyệt Hủy Đơn', callback_data: `approve_refund_${order.id}` },
          { text: '❌ Từ Chối', callback_data: `reject_refund_${order.id}` }
        ]
      ];
      
      await sendTelegramNotification(`⚠️ <b>YÊU CẦU HỦY ĐƠN TỪ KHÁCH HÀNG</b>\n\n👤 Khách: ${order.user.email}\n📦 Đơn: ${order.id} (${order.platform} ${order.service})\n🔗 Target: ${order.target}\n💰 Tổng tiền cần hoàn: ${order.total}\n\nVui lòng duyệt hoặc từ chối yêu cầu này.`, inlineKeyboard);

      return res.json({ success: true, message: 'Đã gửi yêu cầu hủy đơn cho Admin/KTV duyệt.' });
    } else {
      return res.status(400).json({ error: 'Không thể hủy đơn hàng ở trạng thái này.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// Lịch sử giao dịch
app.get('/api/transactions', authenticateToken, async (_req, res) => {
  try {
    const userId = res.locals.userId;
    
    // User page chỉ thấy giao dịch của mình, dù là admin
    const where = { userId };

    const transactions = await (prisma as any).transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    const formatted = transactions.map(t => ({
      ...t,
      time: new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(t.createdAt)
    }))
    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' })
  }
})

// Nạp tiền thủ công (Đã bị vô hiệu hóa vì chuyển sang SePay Webhook)
app.post('/api/deposits', authenticateToken, async (req, res) => {
  return res.status(400).json({ error: 'Tính năng nạp tiền thủ công đã bị khóa. Vui lòng quét mã QR và chuyển khoản đúng cú pháp để hệ thống tự động cộng tiền.' })
})

// --- SEPAY WEBHOOK ---
app.post('/api/sepay/webhook', async (req, res) => {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.includes(process.env.SEPAY_API_TOKEN || '')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  try {
    const {
      gateway,
      transferType,
      transferAmount,
      amountIn,
      referenceCode,
      transactionContent,
      content: sepayContent,
      body,
      description
    } = req.body

    const actualAmount = transferType === 'in' ? Number(transferAmount) : Number(amountIn || 0)
    const content = transactionContent || sepayContent || body || description || ''

    if (!content) {
      return res.json({ success: true, message: 'No content found' })
    }
    if (transferType !== 'in' || !transferAmount || transferAmount <= 0) {
      return res.json({ success: true, message: 'Ignored non-incoming transaction' })
    }

    const chatMatch = content.match(/KTVTQ\s*([a-zA-Z0-9\-]{6})/i)
    if (chatMatch) {
      const shortId = chatMatch[1]
      const session = await (prisma as any).chatSession.findFirst({
        where: { id: { startsWith: shortId } },
        include: { user: true, technician: true }
      })
      if (!session) {
        return res.json({ success: true, message: 'Chat session not found for ID: ' + shortId })
      }

      // Fetch latest invoice to get service context
      const latestInvoice = await (prisma as any).chatMessage.findFirst({
        where: { sessionId: session.id, content: { startsWith: '[INVOICE:' } },
        orderBy: { createdAt: 'desc' }
      });
      const invoiceDesc = latestInvoice ? (latestInvoice.content.match(/\|(.*?)(?:\||\])/)?.[1] || 'Tư vấn KTV') : 'Tư vấn KTV';
      const technicianName = session.technician?.name || 'Hệ thống';

      // Record Order for Revenue Analytics
      await prisma.order.create({
        data: {
          id: '#ORD-CHAT-' + Math.floor(Math.random() * 100000000),
          userId: session.userId,
          platform: 'Live Chat',
          service: invoiceDesc,
          target: session.id,
          status: 'completed',
          total: `${transferAmount.toLocaleString('vi-VN')} ₫`,
          totalNum: transferAmount,
          quantity: 1,
          unitPrice: transferAmount,
          profit: transferAmount,
          costPrice: 0,
          apiProvider: 'manual'
        }
      });

      // Record Transaction for Admin Finance
      await (prisma as any).transaction.create({
        data: {
          id: '#TRX-CHAT-' + Math.floor(Math.random() * 100000000),
          userId: session.userId,
          type: 'HÓA ĐƠN CHAT',
          amount: `+${transferAmount.toLocaleString('vi-VN')} ₫`,
          balance: `${session.user.balance} ₫`,
          desc: `Thanh toán hóa đơn trực tiếp cho KTV: ${invoiceDesc}`,
          typeClass: 'text-purple-400 bg-purple-400/10 border-purple-400/30'
        }
      });

      // Notify Telegram
      sendTelegramNotification(`<b>[THANH TOÁN HÓA ĐƠN CHAT]</b>\n👤 Khách hàng: ${session.user?.name}\n📧 Email: ${session.user?.email}\n💰 Số tiền: ${transferAmount.toLocaleString('vi-VN')} ₫\n🆔 Session ID: ${shortId}\n🛠 Dịch vụ: ${invoiceDesc}\n👨‍💻 KTV Hỗ trợ: ${technicianName}\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);

      // Add System Message to Chat
      const msg = await (prisma as any).chatMessage.create({
        data: {
          sessionId: session.id,
          senderRole: 'SYSTEM',
          content: `[PAYMENT_SUCCESS: ${transferAmount} | ${invoiceDesc}]`
        },
        include: { session: { include: { user: true } } }
      })

      // Emit Socket
      const io = (global as any).io;
      if (io) {
        io.to('admin_room').emit('new_admin_message', { ...msg, userName: session.user?.name });
        io.emit('receive_message_' + session.userId, msg);
      }

      return res.json({ success: true, message: 'Chat invoice payment processed successfully' })
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

    // Cộng tiền
    await prisma.$transaction(async (tx) => {
      const newBalance = user.balance + transferAmount
      
      const depositTxs = await tx.transaction.findMany({
        where: { userId: user.id, type: 'CỘNG TIỀN' }
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
          type: 'CỘNG TIỀN',
          amount: `+${fmt(transferAmount)} ₫`,
          balance: `${fmt(newBalance)} ₫`,
          desc: `Nạp tiền tự động (SePay)`,
          typeClass: 'text-green-400 bg-green-400/10 border-green-400/30'
        }
      })
    })
    
    
    // Send Telegram Notification
    sendTelegramNotification(`<b>[NẠP TIỀN THÀNH CÔNG]</b>\n👤 Tên: ${user.name} (${user.email})\n💰 Số tiền nạp: ${transferAmount.toLocaleString('vi-VN')} ₫\n🏦 Cổng nạp: ${gateway || 'N/A'}\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);

    return res.json({ success: true, message: 'Processed successfully' })
  } catch (err) {
    console.error('SePay Webhook Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// --- ADMIN ROUTES ---
app.get('/api/admin/users', authenticateToken, requireAdminOrTechnician, async (_req, res) => {
  try {
    const role = res.locals.userRole;
    let users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, balance: true, agencyLevel: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    
    if (role === 'TECHNICIAN') {
      users = users.map((u: any) => ({ ...u, balance: 0 }));
    }
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, role, balance, agencyLevel } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email đã tồn tại' });
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, phone: phone || null, role: role || 'GUEST', balance: Number(balance) || 0, agencyLevel: Number(agencyLevel) || 0 }
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo thành viên' });
  }
});

app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, role, balance, agencyLevel } = req.body;
    let updateData: any = { name, email, phone: phone || null, role, balance: Number(balance) };
    if (agencyLevel !== undefined) updateData.agencyLevel = Number(agencyLevel);
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    await prisma.user.update({ where: { id }, data: updateData });
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa' });
  }
});

app.post('/api/admin/users/:id/refund', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Số tiền không hợp lệ' });
    
    await (prisma as any).$transaction(async (tx: any) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new Error('Không tìm thấy người dùng');
      
      const newBalance = user.balance + amount;
      
      await tx.user.update({
        where: { id },
        data: { balance: newBalance }
      });
      
      const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
      
      await tx.transaction.create({
        data: {
          id: `#RFD-${Math.floor(1000 + Math.random() * 9000)}`,
          userId: user.id,
          type: 'CỘNG TIỀN',
          amount: `+${fmt(amount)} ₫`,
          balance: `${fmt(newBalance)} ₫`,
          desc: reason || 'Admin hoàn tiền',
          typeClass: 'text-green-400 bg-green-400/10 border-green-400/30'
        }
      });
    });
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi hệ thống' });
  }
});

app.post('/api/admin/users/:id/revoke', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Số tiền không hợp lệ' });
    
    await (prisma as any).$transaction(async (tx: any) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new Error('Không tìm thấy người dùng');
      
      const newBalance = user.balance - amount;
      
      await tx.user.update({
        where: { id },
        data: { balance: newBalance }
      });
      
      const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
      
      await tx.transaction.create({
        data: {
          id: `#RVK-${Math.floor(1000 + Math.random() * 9000)}`,
          userId: user.id,
          type: 'TRỪ TIỀN',
          amount: `-${fmt(amount)} ₫`,
          balance: `${fmt(newBalance)} ₫`,
          desc: reason || 'Admin thu hồi tiền',
          typeClass: 'text-orange-400 bg-orange-400/10 border-orange-400/30'
        }
      });
    });
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi hệ thống' });
  }
});

app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await prisma.user.update({ where: { id }, data: { role } });
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật' });
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
    const { platform, serviceType, name, price, costPrice, min, max, desc, hot, status, apiProvider, apiServiceId, tags } = req.body;
    const newServer = await prisma.serverService.create({
      data: {
        platform, serviceType, name, price: Number(price), costPrice: Number(costPrice) || 0,
        min: Number(min), max: Number(max), desc: desc || '', hot: Boolean(hot), status: status || 'hoat_dong',
        apiProvider: apiProvider || '', apiServiceId: apiServiceId || '', tags: tags || ''
      }
    })
    res.json({ success: true, message: 'Thêm server thành công', server: newServer });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
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
        status: updates.status,
        apiProvider: updates.apiProvider,
        apiServiceId: updates.apiServiceId,
        tags: updates.tags
      }
    });
    res.json({ success: true, message: 'Cập nhật server thành công' });
  } catch (err) {
    res.status(404).json({ error: 'Không tìm thấy server' });
  }
});

app.delete('/api/admin/servers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.serverService.delete({ where: { id: req.params.id } })
    res.json({ success: true, message: 'Xóa server thành công' });
  } catch (err) {
    res.status(404).json({ error: 'Không tìm thấy server' });
  }
});

app.put('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

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
                userId: user.id, type: 'HOÀN TIỀN', amount: `+${fmt(refundAmount)} ₫`, balance: `${fmt(newBalance)} ₫`,
                desc: percentage === 100 ? `Hoàn tiền do hủy đơn hàng ${order.id}` : `Hoàn tiền do hủy đơn hàng ${order.id} (Trừ 20% phí)`,
                typeClass: 'text-blue-400 bg-blue-400/10 border-blue-400/30'
              }
            });
          }
        }
      });
      return res.json({ success: true, message: 'Đã hủy đơn' });
    }

    if (status === 'completed' && (order.status === 'processing' || order.status === 'running')) {
      await prisma.order.update({ where: { id }, data: { status: 'completed' } });
      return res.json({ success: true, message: 'Hoàn thành' });
    }
    if (status === 'running' && (order.status === 'processing' || order.status === 'refund_requested')) {
      await prisma.order.update({ where: { id }, data: { status: 'running' } });
      return res.json({ success: true, message: 'Đang chạy' });
    }
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// --- USER REFERRAL ENDPOINT ---
app.get('/api/referrals', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    const enabledSetting = await prisma.setting.findUnique({ where: { key: 'affiliate_enabled' } });
    const affiliateEnabled = enabledSetting?.value === 'true';

    const milestoneSetting = await prisma.setting.findUnique({ where: { key: 'affiliate_milestone_count' } });
    const milestoneCount = parseInt(milestoneSetting?.value || '3', 10);
    
    const rewardSetting = await prisma.setting.findUnique({ where: { key: 'affiliate_milestone_reward' } });
    const milestoneReward = parseInt(rewardSetting?.value || '50000', 10);

    const rewards = await (prisma as any).referralReward.findMany({
      where: { referrerId: userId },
      include: { referredUser: { select: { name: true, email: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const totalValidReferrals = await prisma.user.count({
      where: { referredById: userId }
    });

    res.json({
      success: true,
      affiliateEnabled,
      referralCode: user?.referralCode,
      totalValidReferrals,
      milestoneCount,
      milestoneReward,
      rewards
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi tải dữ liệu hoa hồng' });
  }
});

app.get('/api/admin/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    
      const days = parseInt(req.query.days as string);
      const offset = parseInt(req.query.offset as string) || 0;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);
      const startDateQuery = req.query.startDate as string;
      const endDateQuery = req.query.endDate as string;
      
      let dateLimit = new Date();
      let dateUpperLimit = null;
      let prevDateLimit = new Date();
      
      if (startDateQuery && endDateQuery) {
        dateLimit = new Date(startDateQuery);
        dateUpperLimit = new Date(endDateQuery);
        const duration = dateUpperLimit.getTime() - dateLimit.getTime();
        prevDateLimit = new Date(dateLimit.getTime() - duration);
      } else if (month && year) {
        dateLimit = new Date(year, month - 1, 1);
        dateUpperLimit = new Date(year, month, 1);
        prevDateLimit = new Date(year, month - 2, 1);
      } else if (!isNaN(days)) {
        dateUpperLimit = new Date();
        dateUpperLimit.setDate(dateUpperLimit.getDate() - offset);
        dateLimit = new Date(dateUpperLimit);
        if (days !== 9999) {
          dateLimit.setDate(dateLimit.getDate() - days);
        } else {
          dateLimit = new Date(0); // beginning of time
        }
        prevDateLimit = new Date(dateLimit);
        if (days !== 9999) {
          prevDateLimit.setDate(prevDateLimit.getDate() - days);
        } else {
          prevDateLimit = new Date(0);
        }
      } else {
        dateLimit.setDate(dateLimit.getDate() - 30);
        prevDateLimit.setDate(prevDateLimit.getDate() - 60);
      }

      const dateFilter: any = { gte: dateLimit };
      if (dateUpperLimit && (offset > 0 || month || startDateQuery)) {
        (dateFilter as any).lt = dateUpperLimit;
      }
      
      const prevDateFilter = { gte: prevDateLimit, lt: dateLimit };
      const notAdminUserFilter = { user: { role: { not: 'ADMIN' } } };

    const totalUsers = await prisma.user.count({ where: { role: { not: 'ADMIN' } } });
    const sumBalanceAggr = await prisma.user.aggregate({ _sum: { balance: true }, where: { role: { not: 'ADMIN' } } });
    const totalBalance = sumBalanceAggr._sum.balance || 0;

    const totalOrders = await prisma.order.count({ where: { createdAt: dateFilter, ...notAdminUserFilter } });
    const recentOrders = await prisma.order.findMany({ 
      where: { createdAt: dateFilter, status: { not: 'cancelled' }, ...notAdminUserFilter },
      select: { totalNum: true, profit: true, createdAt: true }
    });
    const orderRevenue = recentOrders.reduce((sum: number, o: any) => sum + (o.totalNum || 0), 0);
    const orderProfit = recentOrders.reduce((sum: number, o: any) => sum + (o.profit || 0), 0);

    const enrollments = await (prisma as any).enrollment.findMany({
      where: { createdAt: dateFilter, ...notAdminUserFilter },
      include: { course: { select: { salePrice: true } } }
    });
    const courseRevenue = enrollments.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
    const courseProfit = enrollments.reduce((sum: number, e: any) => sum + ((e.totalAmount || 0) - (e.totalImportAmount || 0)), 0);

    const recentResourceOrders = await (prisma as any).resourceOrder.findMany({
      where: { createdAt: dateFilter, ...notAdminUserFilter },
      select: { totalAmount: true, totalImportAmount: true, createdAt: true }
    });
    const resourceRevenue = recentResourceOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
    const resourceProfit = recentResourceOrders.reduce((sum: number, o: any) => sum + ((o.totalAmount || 0) - (o.totalImportAmount || 0)), 0);

    const recentRevokeTxs = await (prisma as any).transaction.findMany({
      where: { 
        type: 'TRỪ TIỀN',
        desc: { startsWith: 'Admin thu hồi tiền' },
        createdAt: dateFilter,
        ...notAdminUserFilter
      },
      select: { amount: true }
    });
    const revokeRevenue = recentRevokeTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    const totalIncome = orderRevenue + courseRevenue + resourceRevenue + revokeRevenue;
    const totalProfit = orderProfit + courseProfit + resourceProfit + revokeRevenue;

    const depositTxs = await (prisma as any).transaction.findMany({
      where: { 
         type: 'CỘNG TIỀN',
         desc: { startsWith: 'Nạp tiền' },
         createdAt: dateFilter
      },
      select: { amount: true }
    });
    const totalDeposited = depositTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    // Prev Income calculation
    const prevOrders = await prisma.order.findMany({ 
      where: { createdAt: prevDateFilter, status: { not: 'cancelled' }, ...notAdminUserFilter },
      select: { totalNum: true, profit: true }
    });
    const prevOrderRevenue = prevOrders.reduce((sum: number, o: any) => sum + (o.totalNum || 0), 0);
    const prevOrderProfit = prevOrders.reduce((sum: number, o: any) => sum + (o.profit || 0), 0);

    const prevEnrollments = await (prisma as any).enrollment.findMany({
      where: { createdAt: prevDateFilter, ...notAdminUserFilter },
      include: { course: { select: { salePrice: true } } }
    });
    const prevCourseRevenue = prevEnrollments.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
    const prevCourseProfit = prevEnrollments.reduce((sum: number, e: any) => sum + ((e.totalAmount || 0) - (e.totalImportAmount || 0)), 0);

    const prevResourceOrders = await (prisma as any).resourceOrder.findMany({
      where: { createdAt: prevDateFilter, ...notAdminUserFilter },
      select: { totalAmount: true, totalImportAmount: true }
    });
    const prevResourceRevenue = prevResourceOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
    const prevResourceProfit = prevResourceOrders.reduce((sum: number, o: any) => sum + ((o.totalAmount || 0) - (o.totalImportAmount || 0)), 0);

    const prevRevokeTxs = await (prisma as any).transaction.findMany({
      where: { 
        type: 'TRỪ TIỀN',
        desc: { startsWith: 'Admin thu hồi tiền' },
        createdAt: prevDateFilter,
        ...notAdminUserFilter
      },
      select: { amount: true }
    });
    const prevRevokeRevenue = prevRevokeTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    const prevIncome = prevOrderRevenue + prevCourseRevenue + prevResourceRevenue + prevRevokeRevenue;
    const prevProfit = prevOrderProfit + prevCourseProfit + prevResourceProfit + prevRevokeRevenue;

    const prevDepositTxs = await (prisma as any).transaction.findMany({
      where: { 
        type: 'CỘNG TIỀN',
        desc: { startsWith: 'Nạp tiền' },
        createdAt: prevDateFilter
      },
      select: { amount: true }
    });
    const prevDeposited = prevDepositTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    const currentUsers = await (prisma as any).user.count({ where: { createdAt: dateFilter, role: { not: 'ADMIN' } } });
    const prevUsers = await (prisma as any).user.count({ where: { createdAt: prevDateFilter, role: { not: 'ADMIN' } } });

    const calcTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? '+100%' : '0%';
      const percent = ((current - prev) / prev) * 100;
      return (percent > 0 ? '+' : '') + percent.toFixed(1) + '%';
    };

    const transactions = await (prisma as any).transaction.findMany({
      where: { createdAt: dateFilter, ...notAdminUserFilter },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } }
    });

    const monthlyDataMap = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      monthlyDataMap.set(d.toLocaleDateString('vi-VN'), 0);
    }
    
    recentOrders.forEach((o: any) => {
      const d = new Date(o.createdAt).toLocaleDateString('vi-VN');
      if (monthlyDataMap.has(d)) monthlyDataMap.set(d, monthlyDataMap.get(d)! + o.totalNum);
    });
    enrollments.forEach((e: any) => {
      const d = new Date(e.createdAt).toLocaleDateString('vi-VN');
      if (monthlyDataMap.has(d)) monthlyDataMap.set(d, monthlyDataMap.get(d)! + (e.totalAmount || 0));
    });
    recentResourceOrders.forEach((o: any) => {
      const d = new Date(o.createdAt).toLocaleDateString('vi-VN');
      if (monthlyDataMap.has(d)) monthlyDataMap.set(d, monthlyDataMap.get(d)! + o.totalAmount);
    });
    
    const monthlyData = Array.from(monthlyDataMap.entries()).map(([name, income]) => ({ name, income }));

    const paymentMethods = [
      { name: 'Ngân hàng', value: 80 },
      { name: 'Momo', value: 20 },
    ];

    res.json({
      success: true,
      stats: { totalUsers, totalBalance, totalOrders, totalIncome, totalDeposited, totalProfit },
      trends: { 
        incomeTrend: calcTrend(totalIncome, prevIncome), 
        depositTrend: calcTrend(totalDeposited, prevDeposited), 
        usersTrend: calcTrend(currentUsers, prevUsers),
        profitTrend: calcTrend(totalProfit, prevProfit)
      },
      transactions,
      monthlyData,
      paymentMethods
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({ 
      include: { 
        schedules: true,
        _count: {
          select: { enrollments: true }
        }
      } 
    });
    const formatted = courses.map(c => ({ 
      ...c, 
      curriculum: JSON.parse(c.curriculum),
      realStudentCount: c._count.enrollments
    }));
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
    res.status(500).json({ error: 'Lỗi tạo khóa học' });
  }
});

app.put('/api/admin/courses/:id', authenticateToken, requireAdminOrInstructor, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, instructor, instructorId, type, tag, tagColor, originalPrice, salePrice, status, thumbnail, videoDemo, description, curriculum, schedules, students, lessons, rating } = req.body;
    
    const course = await prisma.course.findUnique({ where: { id } });
    if (res.locals.userRole === 'INSTRUCTOR' && course?.instructorId !== res.locals.userId) {
      return res.status(403).json({ error: 'Không có quyền chỉnh sửa khóa học này' });
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
    res.status(500).json({ error: 'Lỗi cập nhật khóa học' });
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
      action: `Đăng ký ${idsToSave.length} ca học`
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
    
    const userForNotif = await prisma.user.findUnique({ where: { id: userId } });
    const courseForNotif = await prisma.course.findUnique({ where: { id: courseId } });
    sendTelegramNotification(`<b>[ĐĂNG KÝ LỊCH HỌC]</b>\n👤 Học viên: ${userForNotif?.name} (${userForNotif?.email})\n📚 Khóa học: ${courseForNotif?.title}\n🕒 Thời gian đăng ký: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    res.json({ success: true, enrollment: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi cập nhật lịch học' });
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
    const sensitiveKeys = ['telegram_bot_token', 'telegram_chat_id', 'groq_api_key'];
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      if (!sensitiveKeys.includes(curr.key)) {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {});
    res.json(settingsObj);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
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
    const notAdminFilter = { user: { role: { not: 'ADMIN' } } };

    const totalUsers = await (prisma as any).user.count();
    
    const users = await (prisma as any).user.findMany({ 
      where: { role: { not: 'ADMIN' } },
      select: { balance: true } 
    });
    const totalBalances = users.reduce((sum: number, u: any) => sum + (u.balance || 0), 0);

    const totalOrders = await (prisma as any).order.count({ where: notAdminFilter });
    
    // 2. Thu nhập hôm nay (Spent today on courses + resources + valid orders)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await (prisma as any).order.findMany({
      where: { status: { not: 'cancelled' }, createdAt: { gte: today }, ...notAdminFilter },
      select: { totalNum: true }
    });
    const todayOrderIncome = todayOrders.reduce((sum: number, o: any) => sum + (o.totalNum || 0), 0);

    const todayEnrollments = await (prisma as any).enrollment.findMany({
      where: { createdAt: { gte: today }, ...notAdminFilter },
      select: { totalAmount: true }
    });
    const todayCourseIncome = todayEnrollments.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);

    const todayResourceOrders = await (prisma as any).resourceOrder.findMany({
      where: { createdAt: { gte: today }, ...notAdminFilter },
      select: { totalAmount: true }
    });
    const todayResourceIncome = todayResourceOrders.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0);

    const todayRevokeTxs = await (prisma as any).transaction.findMany({
      where: { 
        createdAt: { gte: today },
        type: 'TRỪ TIỀN',
        desc: { startsWith: 'Admin thu hồi tiền' },
        ...notAdminFilter
      },
      select: { amount: true }
    });
    const todayRevokeIncome = todayRevokeTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    const todayIncome = todayOrderIncome + todayCourseIncome + todayResourceIncome + todayRevokeIncome;

    // 1. Tổng doanh thu (Total deposited lifetime)
    const depositTxs = await (prisma as any).transaction.findMany({
      where: { 
        type: 'CỘNG TIỀN',
        desc: { startsWith: 'Nạp tiền' }
      },
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
      where: { status: 'Công khai' },
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
        status: 'Bản nháp'
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
    if (!voucher || !voucher.isActive) return res.status(400).json({ error: 'Mã giảm giá không tồn tại hoặc đã bị khóa.' });
    if (voucher.validFrom > new Date()) return res.status(400).json({ error: 'Mã giảm giá chưa đến thời gian sử dụng.' });
    if (voucher.validTo < new Date()) return res.status(400).json({ error: 'Mã giảm giá đã hết hạn.' });
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) return res.status(400).json({ error: 'Mã giảm giá đã hết lượt.' });
    if (voucher.minOrderValue && orderTotal < voucher.minOrderValue) return res.status(400).json({ error: `Đơn hàng tối thiểu để áp dụng mã này là ${voucher.minOrderValue}đ.` });
    
    if (voucher.applicableTo.startsWith('SPECIFIC:')) {
      const allowedIds = voucher.applicableTo.replace('SPECIFIC:', '').split(',');
      if (!itemId || !allowedIds.includes(itemId)) {
        return res.status(400).json({ error: 'Mã giảm giá này không áp dụng cho sản phẩm/dịch vụ này.' });
      }
    } else if (voucher.applicableTo !== 'ALL' && applicableType && voucher.applicableTo !== applicableType) {
      return res.status(400).json({ error: 'Mã giảm giá này không áp dụng cho loại sản phẩm này.' });
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
    res.status(500).json({ error: 'Lỗi kiểm tra mã giảm giá' });
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
// --- ADMIN RESOURCE ORDERS & REVOKE ---
app.get('/api/admin/resource-orders', authenticateToken, requireAdminOrTechnician, async (req, res) => {
  try {
    const role = res.locals.userRole;
    let orders = await prisma.resourceOrder.findMany({
      include: {
        user: { select: { email: true } },
        resource: { select: { name: true, category: true, type: true } },
        variant: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (role === 'TECHNICIAN') {
      orders = orders.map((o: any) => ({ ...o, totalAmount: 0, totalImportAmount: 0 }));
    }
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/resource-orders/:id/revoke', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { refund } = req.body;
    
    const order = await prisma.resourceOrder.findUnique({
      where: { id },
      include: { user: true, variant: true, resource: true }
    });
    
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    
    // 1. Add data back to stock
    if (order.deliveredData) {
      if (order.variantId && order.variant) {
        const newStock = (order.variant.stockData ? order.variant.stockData + '\n' : '') + order.deliveredData;
        await prisma.resourceVariant.update({
          where: { id: order.variantId },
          data: { 
            stockData: newStock,
            soldCount: { decrement: order.quantity }
          }
        });
      } else if (order.resourceId && order.resource) {
        const newStock = (order.resource.stockData ? order.resource.stockData + '\n' : '') + order.deliveredData;
        await prisma.resource.update({
          where: { id: order.resourceId },
          data: { 
            stockData: newStock,
            soldCount: { decrement: order.quantity }
          }
        });
      }
    }
    
    // 2. Process refund if needed
    if (refund && order.totalAmount > 0) {
      const user = await prisma.user.findUnique({ where: { id: order.userId } });
      const newBalance = (user?.balance || 0) + order.totalAmount;
      
      await prisma.user.update({
        where: { id: order.userId },
        data: { balance: newBalance }
      });
      
      const trxId = `#TRX-${Math.floor(10000 + Math.random() * 90000)}`;
      await prisma.transaction.create({
        data: {
          id: trxId,
          userId: order.userId,
          type: 'HOÀN TIỀN',
          amount: `+${new Intl.NumberFormat('vi-VN').format(order.totalAmount)} đ`,
          balance: `${new Intl.NumberFormat('vi-VN').format(newBalance)} đ`,
          desc: `Hoàn tiền thu hồi đơn tài nguyên ${order.id}`,
          typeClass: 'bg-green-500/20 text-green-400'
        }
      });
    }
    
    // 3. Delete order
    await prisma.resourceOrder.delete({ where: { id: order.id } });
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi thu hồi sản phẩm' });
  }
});

app.get('/api/admin/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({ include: { variants: true }, orderBy: { createdAt: 'desc' } });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải danh sách tài nguyên' });
  }
});

app.post('/api/admin/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, iconPlatform, description, type, thumbnail, status, variants } = req.body;
    let minPrice = 0;
    if (variants && variants.length > 0) {
      minPrice = Math.min(...variants.map((v: any) => Number(v.price) || 0));
    }
    const resource = await prisma.resource.create({
      data: { 
        name, category: category || 'Khác', iconPlatform, description, price: minPrice, type, thumbnail, status,
        variants: variants ? {
          create: variants.map((v: any) => ({
            name: v.name || 'Mặc định',
            importPrice: Number(v.importPrice) || 0,
            price: Number(v.price) || 0,
            stockData: v.stockData || ''
          }))
        } : undefined
      },
      include: { variants: true }
    });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo tài nguyên' });
  }
});

app.put('/api/admin/resources/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, iconPlatform, description, type, thumbnail, status, variants } = req.body;
    
    let minPrice = 0;
    if (variants && variants.length > 0) {
      minPrice = Math.min(...variants.map((v: any) => Number(v.price) || 0));
    }

    // Better approach: Update existing, create new, delete missing to preserve ID and soldCount
    const resource = await (prisma as any).$transaction(async (tx: any) => {
      const res = await tx.resource.update({
        where: { id: req.params.id },
        data: { name, category: category || 'Khác', iconPlatform, description, price: minPrice, type, thumbnail, status }
      });

      if (variants) {
        const existingVariants = await tx.resourceVariant.findMany({ where: { resourceId: req.params.id } });
        const existingIds = existingVariants.map((v: any) => v.id);
        const incomingIds = variants.map((v: any) => v.id).filter(Boolean);

        const toDelete = existingIds.filter((id: string) => !incomingIds.includes(id));
        if (toDelete.length > 0) {
          await tx.resourceVariant.deleteMany({ where: { id: { in: toDelete } } });
        }

        for (const v of variants) {
          if (v.id && existingIds.includes(v.id)) {
            await tx.resourceVariant.update({
              where: { id: v.id },
              data: {
                name: v.name || 'Mặc định',
                importPrice: Number(v.importPrice) || 0,
                price: Number(v.price) || 0,
                stockData: v.stockData || ''
              }
            });
          } else {
            await tx.resourceVariant.create({
              data: {
                resourceId: req.params.id,
                name: v.name || 'Mặc định',
                importPrice: Number(v.importPrice) || 0,
                price: Number(v.price) || 0,
                stockData: v.stockData || '',
                soldCount: 0
              }
            });
          }
        }
      }

      return await tx.resource.findUnique({
        where: { id: req.params.id },
        include: { variants: true }
      });
    });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật tài nguyên' });
  }
});

app.delete('/api/admin/resources/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const resourceId = req.params.id;
    await prisma.resourceOrder.deleteMany({ where: { resourceId } });
    const variants = await prisma.resourceVariant.findMany({ where: { resourceId } });
    const variantIds = variants.map((v: any) => v.id);
    await prisma.agencyDiscount.deleteMany({ where: { itemType: 'RESOURCE', itemId: { in: [resourceId, ...variantIds] } } });
    await prisma.resourceVariant.deleteMany({ where: { resourceId } });
    await prisma.resource.delete({ where: { id: resourceId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi xóa tài nguyên' });
  }
});

// --- RESOURCES API (CLIENT) ---
app.get('/api/resources', async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { status: 'active' },
      include: { variants: true },
      orderBy: { createdAt: 'desc' }
    });
    const safeResources = resources.map(r => {
      const { stockData, variants, ...rest } = r;
      const safeVariants = (variants || []).map((v: any) => {
        const { stockData: vStockData, ...vRest } = v;
        let vStockCount = 0;
        if (r.type === 'ACCOUNT' && vStockData) {
          vStockCount = vStockData.split(/\n|\r?\n/).filter((l: string) => l.trim().length > 0).length;
        }
        return { ...vRest, stockCount: vStockCount };
      });
      return { ...rest, variants: safeVariants };
    });
    res.json(safeResources);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải tài nguyên' });
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
    res.status(500).json({ error: 'Lỗi tải lịch sử mua' });
  }
});


app.post('/api/resources/:id/buy', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let { quantity = 1, voucherCode, discount = 0, variantId } = req.body;
    const userId = res.locals.userId;

    // Strict numeric validation
    quantity = Number(quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
       return res.status(400).json({ error: 'Số lượng không hợp lệ' });
    }

    await prisma.$transaction(async (tx) => {
      const resource = await tx.resource.findUnique({ where: { id } });
      if (!resource || resource.status !== 'active') throw new Error('Tài nguyên không tồn tại hoặc đã ngừng bán');

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Không tìm thấy user');

      let deliveredData = '';
      let actualPrice = 0;
      let importPrice = 0;

      if (resource.type === 'ACCOUNT') {
        if (!variantId) throw new Error('Vui lòng chọn phân loại');
        const variant = await tx.resourceVariant.findUnique({ where: { id: variantId } });
        if (!variant || variant.resourceId !== id) throw new Error('Phân loại không hợp lệ');
        importPrice = variant.importPrice;

        const lines = variant.stockData.split(/\n|\r?\n/).filter((l: string) => l.trim().length > 0);
        if (lines.length < quantity) throw new Error(`Kho chỉ còn ${lines.length} sản phẩm`);

        const takenLines = lines.slice(0, quantity);
        deliveredData = takenLines.join('\n');
        const remainingStock = lines.slice(quantity).join('\n');

        await tx.resourceVariant.update({
          where: { id: variantId },
          data: { stockData: remainingStock, soldCount: variant.soldCount + quantity }
        });
        
        actualPrice = variant.price * quantity;
      } else {
        // LINK/FILE: no stock deduction, no variant required
        deliveredData = resource.stockData || '';
        if (variantId) {
          const variant = await tx.resourceVariant.findUnique({ where: { id: variantId } });
          if (variant) {
            importPrice = variant.importPrice;
            actualPrice = variant.price * quantity;
            await tx.resourceVariant.update({
              where: { id: variantId },
              data: { soldCount: variant.soldCount + quantity }
            });
          } else {
            actualPrice = resource.price * quantity;
          }
        } else {
          actualPrice = resource.price * quantity;
        }
      }

      // 1. Apply Agency Discount or Fallback Global Discount
      let maxPercent = -1;
      if (user.role === 'ADMIN') {
        maxPercent = 100;
      } else {
        if (user.agencyLevel > 0) {
          const agencyDiscount = await tx.agencyDiscount.findFirst({
            where: { agencyLevel: user.agencyLevel, itemType: 'RESOURCE', itemId: { in: [resource.id, 'ALL', ...(variantId ? [variantId] : [])] } },
            orderBy: { discountPercent: 'desc' }
          });
          if (agencyDiscount) {
            maxPercent = agencyDiscount.discountPercent;
          }
        }

        if (maxPercent === -1) {
          const globalDiscountSetting = await tx.setting.findUnique({ where: { key: `discount_${user.role}` } });
          if (globalDiscountSetting) {
            maxPercent = parseFloat(globalDiscountSetting.value) || 0;
          } else {
            maxPercent = 0;
          }
        }
      }

      if (maxPercent > 0) {
        actualPrice = Math.max(0, actualPrice * (1 - maxPercent / 100));
      }

      // 2. Apply Voucher
      actualPrice = Math.max(0, actualPrice - (discount || 0));
      
      // Update Voucher Usage if present
      if (voucherCode) {
         const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
         if (voucher) {
            await tx.voucher.update({
               where: { code: voucherCode },
               data: { usedCount: voucher.usedCount + 1 }
            });
         }
      }

      if (actualPrice > 0 && user.balance < actualPrice) {
        throw new Error('Số dư không đủ. Vui lòng nạp thêm tiền.');
      }

      // Deduct balance
      await tx.user.update({
        where: { id: userId },
        data: { balance: user.balance - actualPrice }
      });

      const orderId = `#RSC-${Math.floor(1000 + Math.random() * 9000)}`;
      const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

      await tx.transaction.create({
        data: {
          id: orderId,
          userId,
          type: 'TRỪ TIỀN',
          amount: `-${fmt(actualPrice)} đ`,
          balance: `${fmt(user.balance - actualPrice)} đ`,
          desc: `Mua tài nguyên: ${resource.name} x${quantity}`,
          typeClass: 'text-red-400 bg-red-400/10 border-red-400/30'
        }
      });

      
      
      const v = variantId ? await tx.resourceVariant.findUnique({ where: { id: variantId } }) : null;
      const resourceDisplayName = v ? `${resource.name} (${v.name})` : resource.name;
      // Send Telegram Notification
      sendTelegramNotification(`<b>[MUA TÀI NGUYÊN]</b>\n👤 Người mua: ${user.name} (${user.email})\n📦 Tài nguyên: ${resourceDisplayName}\n🔢 Số lượng: ${quantity}\n💰 Tổng tiền: ${actualPrice.toLocaleString('vi-VN')} ₫\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    

      await tx.resourceOrder.create({
        data: {
          id: orderId,
          resourceId: id,
          variantId: variantId || null,
          userId,
          quantity,
          totalAmount: actualPrice,
          totalImportAmount: importPrice * quantity,
          deliveredData
        }
      });
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/enrollments/progress', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courseId, completedIndexes } = req.body;
    let userId = res.locals.userId;
    
    // If the caller provides a userId and they are an ADMIN/INSTRUCTOR, allow them to update other users
    if (req.body.userId && req.body.userId !== userId) {
      const caller = await (prisma as any).user.findUnique({ where: { id: userId } });
      if (caller && (caller.role === 'ADMIN' || caller.role === 'INSTRUCTOR')) {
        userId = req.body.userId;
      }
    }
    
    const updated = await (prisma as any).enrollment.update({
      where: { courseId_userId: { courseId, userId } },
      data: {
        completedCurriculumIndexes: JSON.stringify(completedIndexes)
      }
    });
    res.json({ success: true, enrollment: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});


app.post('/api/courses/:id/enroll', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { voucherCode, discount = 0 } = req.body; // Frontend sends voucher discount in 'discount'
    const userId = res.locals.userId;

    await (prisma as any).$transaction(async (tx: any) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      const course = await tx.course.findUnique({ where: { id } });
      if (!course) throw new Error('Khóa học không tồn tại');

      const existing = await tx.enrollment.findUnique({
        where: { courseId_userId: { courseId: id, userId } }
      });
      if (existing) throw new Error('Bạn đã mua khóa học này rồi');

      let actualPrice = course.salePrice !== null ? course.salePrice : course.price;

      // 1. Apply Agency Discount FIRST (matching frontend)
      if (user.role === 'ADMIN') {
        actualPrice = 0;
      } else if (user.agencyLevel > 0) {
        const agencyDiscount = await tx.agencyDiscount.findFirst({
          where: { agencyLevel: user.agencyLevel, itemType: 'COURSE', itemId: { in: [course.id, 'ALL'] } },
          orderBy: { discountPercent: 'desc' }
        });
        if (agencyDiscount) {
          actualPrice = Math.max(0, actualPrice * (1 - agencyDiscount.discountPercent / 100));
        }
      }

      // 2. Apply Voucher (passed as discount amount from frontend)
      actualPrice = Math.max(0, actualPrice - (discount || 0));

      if (actualPrice > 0 && user.balance < actualPrice) {
        throw new Error('Số dư không đủ. Vui lòng nạp thêm tiền.');
      }

      // Deduct balance
      await tx.user.update({
        where: { id: userId },
        data: { balance: user.balance - actualPrice }
      });

      const orderId = `#CRS-${Math.floor(1000 + Math.random() * 9000)}`;
      const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

      await tx.transaction.create({
        data: {
          id: orderId,
          userId,
          type: 'TRỪ TIỀN',
          amount: `-${fmt(actualPrice)} đ`,
          balance: `${fmt(user.balance - actualPrice)} đ`,
          desc: `Mua khóa học: ${course.title}`,
          typeClass: 'text-red-400 bg-red-400/10 border-red-400/30'
        }
      });

      
      // Send Telegram Notification
      sendTelegramNotification(`<b>[MUA KHÓA HỌC]</b>\n👤 Người mua: ${user.name} (${user.email})\n📘 Khóa học: ${course.title}\n💰 Số tiền: ${actualPrice.toLocaleString('vi-VN')} ₫\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);

      await tx.enrollment.create({
        data: {
          courseId: id,
          userId,
          completedCurriculumIndexes: '[]',
          totalAmount: actualPrice,
          totalImportAmount: 0 // Optional: if courses have import cost
        }
      });
      // Increment students count
      let currentStudents = parseInt(course.students);
      if (isNaN(currentStudents)) currentStudents = 0;
      await tx.course.update({
        where: { id },
        data: { students: (currentStudents + 1).toString() }
      });

    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});



app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }

    
    // Send Telegram Notification
    sendTelegramNotification(`<b>[YÊU CẦU HỖ TRỢ]</b>\n👤 Tên: ${name}\n📧 Email: ${email}\n📞 Phone: ${phone || 'N/A'}\n📝 Chủ đề: ${subject || 'Khác'}\n💬 Nội dung:\n${message}\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);

    const ticket = await prisma.supportTicket.create({
      data: { name, email, phone, subject: subject || 'Khác', message }
    });


    // 1. Gửi email thông báo cho Admin
    const mailOptions = {
      from: `"TQMEDIA Thông Báo" <${process.env.SMTP_EMAIL}>`,
      to: process.env.SMTP_EMAIL, 
      subject: `[Liên hệ] ${subject || 'Khác'} - Từ ${name}`,
      html: `
        <h3>Có một liên hệ mới từ khách hàng:</h3>
        <p><strong>Họ và tên:</strong> ${name}</p>\n        <p><strong>Số điện thoại:</strong> ${phone || "Không cung cấp"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Chủ đề:</strong> ${subject}</p>
        <p><strong>Nội dung:</strong></p>
        <blockquote style="border-left: 4px solid #ddd; padding-left: 10px;">
          ${message.replace(/\n/g, '<br/>')}
        </blockquote>
      `
    };
    await transporter.sendMail(mailOptions);

    // 2. Gửi email tự động trả lời cho Khách hàng
    const autoReplyOptions = {
      from: `"TQMEDIA CSKH" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: `[TQMEDIA] Xác nhận yêu cầu hỗ trợ thành công`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center;">
            <img src="https://tqsocial.vn/logo.png" alt="TQMEDIA" style="width: 80px; height: 80px; margin-bottom: 20px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.2); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));" onerror="this.src='https://ui-avatars.com/api/?name=TQ&background=3b82f6&color=fff&size=100'" />
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">Xin chào ${name}!</h1>
            <p style="color: #94a3b8; font-size: 16px; margin: 10px 0 0 0;">Yêu cầu của bạn đã được ghi nhận</p>
          </div>
          
          <!-- Body -->
          <div style="padding: 35px 30px; background-color: #ffffff;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0;">
              Cảm ơn bạn đã liên hệ với <strong>TQMEDIA</strong>. Chúng tôi rất trân trọng sự quan tâm của bạn đến các dịch vụ của chúng tôi.
            </p>
            
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              Yêu cầu của bạn về chủ đề <strong>"${subject || 'Khác'}"</strong> đã được hệ thống ghi nhận và chuyển đến chuyên viên hỗ trợ. Dưới đây là nội dung bạn đã gửi:
            </p>

            <div style="background-color: #f8fafc; border-left: 4px solid #06b6d4; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
              <p style="color: #475569; margin: 0; font-size: 15px; font-style: italic; line-height: 1.6;">
                "${message.replace(/\n/g, '<br/>')}"
              </p>
            </div>
            
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              Đội ngũ CSKH của chúng tôi sẽ xem xét thông tin và phản hồi lại bạn <strong>trong vòng 12-24h làm việc</strong>. Trong trường hợp cần hỗ trợ khẩn cấp, bạn có thể liên hệ trực tiếp qua Zalo hoặc Fanpage.
            </p>
            
            <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
              <a href="https://tqsocial.vn" style="background: linear-gradient(to right, #3b82f6, #06b6d4); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);">Trở về trang chủ</a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #64748b;">TQMEDIA - Dịch vụ Tăng tương tác MXH</p>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;">Email này được gửi tự động từ hệ thống TQMEDIA. Vui lòng không trả lời trực tiếp.</p>
          </div>
        </div>
      `
    };
    await transporter.sendMail(autoReplyOptions);

    res.json({ success: true, message: 'Gửi thành công' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Lỗi khi gửi email' });
  }
});


// --- ADMIN SUPPORT TICKETS API ---
app.get('/api/admin/support-tickets', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/admin/support-tickets/:id/reply', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Không tìm thấy yêu cầu hỗ trợ' });

    // Send email to customer
    const replyMailOptions = {
      from: `"TQMEDIA Support" <${process.env.SMTP_EMAIL}>`,
      to: ticket.email,
      subject: `[TQMEDIA] Phản hồi yêu cầu: ${ticket.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
          <h2 style="color: #3b82f6;">Xin chào ${ticket.name},</h2>
          <p>Cảm ơn bạn đã liên hệ với TQMEDIA. Chuyên viên hỗ trợ của chúng tôi xin phản hồi yêu cầu của bạn như sau:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            ${replyMessage.replace(/\n/g, '<br/>')}
          </div>
          <p><b>Yêu cầu ban đầu của bạn:</b></p>
          <blockquote style="border-left: 4px solid #ddd; padding-left: 10px; color: #666;">
            ${ticket.message.replace(/\n/g, '<br/>')}
          </blockquote>
          <p>Nếu bạn có bất kỳ thắc mắc nào khác, vui lòng trả lời trực tiếp email này hoặc liên hệ hotline của chúng tôi.</p>
          <br/>
          <p><i>Trân trọng,<br/>TQMEDIA Support Team</i></p>
        </div>
      `
    };
    await transporter.sendMail(replyMailOptions);

    // Update DB status
    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: { status: 'resolved', replyMessage }
    });

    res.json(updatedTicket);
  } catch (err) {
    console.error('Reply error:', err);
    res.status(500).json({ error: 'Lỗi khi gửi email phản hồi' });
  }
});

app.delete('/api/admin/support-tickets/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.supportTicket.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});


import cron from 'node-cron';

// Cron job đồng bộ đơn hàng từ Subgiare/1dg (chạy mỗi 15 phút)
cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('[CRON] Starting order sync with API providers...');
    
    // Tìm các đơn hàng đang xử lý và có apiOrderId
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['processing', 'running'] },
        apiProvider: { not: '' },
        apiOrderId: { not: null }
      }
    });

    if (orders.length === 0) return;

    const settings = await prisma.setting.findMany({
      where: { key: { in: ['subgiare_api_key', 'subgiare_api_url', '1dg_api_key', '1dg_api_url'] } }
    });
    const sMap = settings.reduce((acc: any, s: any) => ({...acc, [s.key]: s.value}), {});

    for (const order of orders) {
      try {
        let apiUrl = '';
        let apiToken = '';
        
        if (order.apiProvider === 'subgiare') {
          apiUrl = sMap['subgiare_api_url'] || 'https://subgiare.vn/api/order';
          apiToken = sMap['subgiare_api_key'] || '';
        } else if (order.apiProvider === '1dg') {
          apiUrl = sMap['1dg_api_url'] || 'https://1dg.me/api/v2';
          apiToken = sMap['1dg_api_key'] || '';
        }

        if (!apiToken || !apiUrl) continue;

        const formData = new URLSearchParams();
        formData.append('key', apiToken);
        formData.append('action', 'status');
        formData.append('order', order.apiOrderId!);

        const res = await fetch(apiUrl, {
          method: 'POST',
          body: formData
        });
        
        const data = await res.json();
        if (data.status === 'error' || data.error) {
          console.log(`[CRON] Error syncing ${order.id} from ${order.apiProvider}:`, data);
          continue;
        }

        // data format for single order usually: { "status": "Completed", "remains": 0, "start_count": 0, "currency": "VND" }
        // or { "charge": "0.27819", "start_count": "3572", "status": "Partial", "remains": "157", "currency": "USD" }
        
        if (data && data.status) {
          const providerStatus = data.status.toLowerCase();
          let newStatus = order.status;
          
          if (providerStatus === 'completed' || providerStatus === 'success') newStatus = 'completed';
          else if (providerStatus === 'processing' || providerStatus === 'in progress') newStatus = 'running';
          else if (providerStatus === 'partial') newStatus = 'completed'; // Partially completed is still closed
          else if (providerStatus === 'canceled' || providerStatus === 'cancelled') newStatus = 'cancelled';
          else if (providerStatus === 'refunded') newStatus = 'cancelled'; // If refunded, we treat as cancelled
          
          let updateData: any = {};
          if (newStatus !== order.status) updateData.status = newStatus;
          if (data.remains !== undefined) updateData.remains = Number(data.remains);
          if (data.start_count !== undefined) updateData.startCount = Number(data.start_count);
          
          if (Object.keys(updateData).length > 0) {
            console.log(`[CRON] Updating order ${order.id} status to ${newStatus}`);
            await prisma.order.update({
              where: { id: order.id },
              data: updateData
            });

            // Nếu đơn bị hủy từ hệ thống mẹ, tự động hoàn tiền cho user
            if (newStatus === 'cancelled' && order.status !== 'cancelled') {
              const user = await prisma.user.findUnique({ where: { id: order.userId } });
              if (user) {
                await prisma.user.update({
                  where: { id: user.id },
                  data: { balance: { increment: order.totalNum } }
                });
                
                const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
                await prisma.transaction.create({
                  data: {
                    id: `#TRX-${Math.floor(1000 + Math.random() * 9000)}`,
                    userId: user.id,
                    type: 'HOÀN TIỀN',
                    amount: `+${fmt(order.totalNum)} ₫`,
                    balance: `${fmt(user.balance + order.totalNum)} ₫`,
                    desc: `Hoàn tiền đơn ${order.id} (Nhà cung cấp hủy)`,
                    typeClass: 'text-green-400 bg-green-400/10 border-green-400/30'
                  }
                });
              }
            }
          }
        }
      } catch (err) {
        console.error(`[CRON] Failed to sync order ${order.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[CRON] Sync error:', err);
  }
});


app.post('/api/admin/send-email', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, to, subject, message } = req.body;
    const recipient = email || to;
    if (!recipient || !subject || !message) return res.status(400).json({ error: 'Missing fields' });

    const mailOptions = {
      from: `"TQMEDIA" <${process.env.SMTP_EMAIL}>`,
      to: recipient,
      subject,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center;">
            <img src="https://tqsocial.vn/logo.png" alt="TQMEDIA" style="width: 70px; height: 70px; margin-bottom: 15px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.2);" />
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">${subject}</h1>
          </div>
          
          <!-- Body -->
          <div style="padding: 35px 30px; background-color: #ffffff;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0;">
              ${message.replace(/\n/g, '<br/>')}
            </p>
            
            <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
              <a href="https://tqsocial.vn" style="background: linear-gradient(to right, #3b82f6, #06b6d4); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 30px; font-weight: 600; font-size: 15px; display: inline-block;">Truy cập TQMEDIA</a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #64748b;">TQMEDIA - Dịch vụ Tăng tương tác MXH</p>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;">Email này được gửi từ hệ thống TQMEDIA.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error('Send email error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});


app.post('/api/chat', chatLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { message, history } = req.body;
    
    // Authenticate user manually from token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let user: any = null;
    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        user = await prisma.user.findUnique({ where: { id: decoded.userId || decoded.id } });
      } catch (err) {}
    }

    if (!user) {
      return res.json({ reply: 'Vui lòng đăng nhập vào tài khoản của bạn trên website để sử dụng tính năng Chat nhé!' });
    }

    // Check ChatSession
    let session = await (prisma as any).chatSession.findUnique({ where: { userId: user.id } });
    if (!session) {
      session = await (prisma as any).chatSession.create({
        data: { userId: user.id, status: 'AI_MODE' }
      });
    }

    // Save User message
    const savedUserMsg = await (prisma as any).chatMessage.create({
      data: { sessionId: session.id, senderRole: 'USER', content: message }
    });

    const io = (global as any).io;
    // Emit to admin if live chat
    if (session.status === 'LIVE_CHAT') {
      if (io) {
        io.to('admin_room').emit('new_chat_message', {
          sessionId: session.id,
          senderRole: 'USER',
          content: message,
          userName: user.name,
          createdAt: savedUserMsg.createdAt
        });
      }
      sendTelegramNotification(`<b>[💬 TIN NHẮN MỚI (LIVE CHAT)]</b>\n👤 Khách hàng: ${user.name}\n💬 Nội dung: ${message}`);
      return res.json({ reply: null }); // Don't return an AI reply
    }

    // --- AI_MODE logic ---
    const groqSetting = await (prisma as any).setting.findUnique({ where: { key: 'groq_api_key' } });
    const apiKey = groqSetting?.value || process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return res.json({ reply: 'Hệ thống AI chưa được cấu hình API Key.' });
    }

    const groq = new Groq({ apiKey: apiKey });

    // Fetch services to feed AI context
    const services = await prisma.serverService.findMany({ select: { platform: true } });
    const platforms = Array.from(new Set(services.map((s: any) => s.platform))).join(', ');

    const tools = [
      {
        type: "function",
        function: {
          name: "create_support_ticket",
          description: "Gửi yêu cầu hỗ trợ (support ticket) tới admin. Gọi hàm này khi người dùng muốn báo lỗi, gửi phản hồi, yêu cầu trợ giúp.",
          parameters: {
            type: "object",
            properties: {
              subject: {
                type: "string",
                description: 'Chủ đề hỗ trợ. Chỉ được chọn 1 trong 4: "Hỗ trợ kỹ thuật", "Tư vấn dịch vụ", "Thanh toán & Hóa đơn", "Khác".',
              },
              message: {
                type: "string",
                description: "Nội dung chi tiết của yêu cầu hỗ trợ từ người dùng.",
              }
            },
            required: ["subject", "message"],
          },
        }
      }
    ];

    const systemInstruction = `Bạn là Oanh - Trợ lý AI của hệ thống TQMEDIA. Các dịch vụ hiện có: ${platforms}. Nhiệm vụ của bạn: 1. Trả lời các câu hỏi của khách hàng một cách thân thiện, RẤT NGẮN GỌN, đi thẳng vào vấn đề và tuyệt đối KHÔNG nói lan man. 2. NẾU khách hàng muốn chuyển đến trang dịch vụ nào đó, hãy trả lời và chèn thêm cú pháp: [REDIRECT:/duong-dan] vào cuối. Dưới đây là danh sách đường dẫn (ưu tiên chèn theo bảng này): \n${AI_URL_CONTEXT}\n 3. CHỈ GỌI TOOL 'create_support_ticket' KHI VÀ CHỈ KHI khách hàng ĐÒI GẶP ADMIN, HOẶC YÊU CẦU 'GỬI ĐƠN HỖ TRỢ', HOẶC CÓ LỖI NẠP TIỀN/LỖI ĐƠN HÀNG MÀ BẠN KHÔNG THỂ GIẢI QUYẾT. Khi gọi tool này, BẠN HÃY TỰ ĐỘNG SUY LUẬN CHỦ ĐỀ VÀ NỘI DUNG TỪ TIN NHẮN CỦA KHÁCH. ĐỐI VỚI PHẦN NỘI DUNG (MESSAGE), HÃY TÓM TẮT LẠI YÊU CẦU BẰNG TIẾNG VIỆT CHUẨN MỰC VÀ TỰ ĐỘNG SỬA CÁC LỖI CHÍNH TẢ CỦA KHÁCH NẾU CÓ (ví dụ khách gõ "gắc CTv" thì sửa thành "gặp KTV"). TUYỆT ĐỐI KHÔNG HỎI LẠI KHÁCH HÀNG KIỂU "Chủ đề hỗ trợ là gì?". Tuyệt đối KHÔNG tự ý gọi tool tạo đơn hỗ trợ nếu khách chỉ đang hỏi thông thường hoặc nhờ dẫn link. 4. TUYỆT ĐỐI KHÔNG TRẢ LỜI CÁC CÂU HỎI NGOÀI LUỒNG (ví dụ: 1+1 bằng mấy, em ăn cơm chưa, đau bụng quá, v.v...). Hãy lịch sự từ chối và yêu cầu khách hàng chỉ hỏi về dịch vụ của hệ thống.`;

    const messages = [
      { role: 'system', content: systemInstruction },
      ...(history || []).map((m: any) => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text
      })),
      { role: 'user', content: message }
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages as any,
      tools: tools as any,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0]?.message;
    let replyText = responseMessage?.content || '';

    if (responseMessage?.tool_calls) {
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === 'create_support_ticket') {
          const args = JSON.parse(toolCall.function.arguments);
          const subject = args.subject;
          const content = args.message;
          
          await prisma.supportTicket.create({
            data: { 
              name: user.name, 
              email: user.email, 
              phone: user.phone || '', 
              subject: subject || 'Khác', 
              message: content 
            }
          });

          sendTelegramNotification(`<b>[YÊU CẦU HỖ TRỢ TỪ AI]</b>\n👤 Tên: ${user.name}\n📧 Email: ${user.email}\n📞 Phone: ${user.phone || 'N/A'}\n📌 Chủ đề: ${subject || 'Khác'}\n📝 Nội dung:\n${content}\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
          
          messages.push(responseMessage as any);
          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: "create_support_ticket",
            content: "Thành công",
          } as any);

          const followUp = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: messages as any,
          });
          replyText = followUp.choices[0]?.message?.content || 'Đã gửi yêu cầu hỗ trợ thành công tới hệ thống admin!';
        }
      }
    }

    // Save AI response
    await (prisma as any).chatMessage.create({
      data: { sessionId: session.id, senderRole: 'AI', content: replyText }
    });

    return res.json({ reply: replyText });
  } catch (err: any) {
    console.error('Chat AI Error:', err);
    return res.json({ reply: 'Rất xin lỗi, đường truyền AI đang gặp sự cố. Vui lòng thử lại sau.' });
  }
});


// --- LIVE CHAT APIs ---
app.get('/api/chat/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    let session = await (prisma as any).chatSession.findUnique({
      where: { userId }
    });
    if (!session) {
      session = await (prisma as any).chatSession.create({
        data: { userId, status: 'AI_MODE' }
      });
      return res.json({ history: [], status: session.status });
    }
    const history = await (prisma as any).chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ history, status: session.status });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/chat/request-live-chat', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const { message } = req.body || {};
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let session = await (prisma as any).chatSession.findUnique({ where: { userId } });
    if (!session) {
      session = await (prisma as any).chatSession.create({ data: { userId, status: 'PENDING_LIVE_CHAT' } });
    } else {
      session = await (prisma as any).chatSession.update({
        where: { id: session.id },
        data: { status: 'PENDING_LIVE_CHAT' }
      });
    }

    // Gửi Telegram
    let msgStr = `<b>[YÊU CẦU HỖ TRỢ TRỰC TIẾP]</b>\n👤 Khách hàng: ${user.name}\n📧 Email: ${user.email}\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
    if (message) {
      msgStr += `\n📝 Nội dung: ${message}`;
    }
    msgStr += `\n⚠️ Cần gặp Kỹ thuật viên ngay!`;
    sendTelegramNotification(msgStr);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/chat/end-session', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const session = await (prisma as any).chatSession.findUnique({ where: { userId } });
    if (!session || session.status === 'AI_MODE') {
      return res.json({ success: true });
    }

    const updatedSession = await (prisma as any).chatSession.update({
      where: { id: session.id },
      data: { status: 'AI_MODE', technicianId: null },
      include: { user: true }
    });

    const io = (global as any).io;
    if (io) {
      io.to('admin_room').emit('chat_session_updated', updatedSession);
      io.emit('chat_status_changed_' + userId, { status: 'AI_MODE' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.get('/api/admin/chat-sessions', authenticateToken, requireAdminOrTechnician, async (req: Request, res: Response) => {
  try {
    const sessions = await (prisma as any).chatSession.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        technician: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.get('/api/admin/chat-sessions/:id/messages', authenticateToken, requireAdminOrTechnician, async (req: Request, res: Response) => {
  try {
    const messages = await (prisma as any).chatMessage.findMany({
      where: { sessionId: req.params.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/admin/chat-sessions/:id/join', authenticateToken, requireAdminOrTechnician, async (req: Request, res: Response) => {
  try {
    const technicianId = res.locals.userId;
    const session = await (prisma as any).chatSession.update({
      where: { id: req.params.id },
      data: { technicianId, status: 'LIVE_CHAT' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        technician: { select: { id: true, name: true } }
      }
    });

    const io = (global as any).io;
    if (io) {
      io.to('admin_room').emit('chat_session_updated', session);
      io.emit('chat_status_changed_' + session.userId, { status: 'LIVE_CHAT', technicianName: session.technician?.name });
    }

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/admin/chat-sessions/:id/message', authenticateToken, requireAdminOrTechnician, async (req: Request, res: Response) => {
  try {
    const technicianId = res.locals.userId;
    const { content } = req.body;
    const tech = await prisma.user.findUnique({ where: { id: technicianId } });

    const msg = await (prisma as any).chatMessage.create({
      data: {
        sessionId: req.params.id,
        senderRole: 'TECHNICIAN',
        content
      }
    });

    const session = await (prisma as any).chatSession.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() }
    });

    const payload = { ...msg, technicianName: tech?.name };

    const io = (global as any).io;
    if (io) {
      io.to('admin_room').emit('new_admin_message', payload);
      io.emit('receive_message_' + session.userId, payload);
    }

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/admin/chat-sessions/:id/end', authenticateToken, requireAdminOrTechnician, async (req: Request, res: Response) => {
  try {
    const sessionCheck = await (prisma as any).chatSession.findUnique({ where: { id: req.params.id } });
    if (!sessionCheck) {
      return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
    }

    const session = await (prisma as any).chatSession.update({
      where: { id: req.params.id },
      data: { status: 'AI_MODE', technicianId: null },
      include: { user: true }
    });

    const io = (global as any).io;
    if (io) {
      io.to('admin_room').emit('chat_session_updated', session);
      io.emit('chat_status_changed_' + session.userId, { status: 'AI_MODE' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/admin/chat-sessions/:id/messages/:msgId/cancel', authenticateToken, requireAdminOrTechnician, async (req: Request, res: Response) => {
  try {
    const { id, msgId } = req.params;
    const msg = await (prisma as any).chatMessage.findUnique({
      where: { id: msgId },
      include: { session: true }
    });

    if (!msg || msg.sessionId !== id) {
      return res.status(404).json({ error: 'Không tìm thấy tin nhắn' });
    }

    if (msg.content.startsWith('[INVOICE:')) {
      const updatedMsg = await (prisma as any).chatMessage.update({
        where: { id: msgId },
        data: { content: msg.content.replace('[INVOICE:', '[INVOICE_CANCELLED:') },
        include: { session: true }
      });

      const io = (global as any).io;
      if (io) {
        io.to('admin_room').emit('message_updated', updatedMsg);
        io.emit('message_updated_' + msg.session?.userId, updatedMsg);
      }
      res.json({ success: true, updatedMsg });
    } else {
      res.status(400).json({ error: 'Tin nhắn này không phải mã QR thanh toán' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

initTelegramBot();
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
});

// --- ENROLLMENTS APIs ---
app.get('/api/enrollments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const role = res.locals.userRole;
    if (role === 'ADMIN' && req.query.all === 'true') {
      const all = await (prisma as any).enrollment.findMany({
        include: { course: { include: { schedules: true } }, user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });
      const mapped = all.map((e: any) => {
        let completed = [];
        let schedules = [];
        let hist = [];
        try { if (e.completedCurriculumIndexes) completed = JSON.parse(e.completedCurriculumIndexes); } catch(err){}
        try { if (e.registeredScheduleIds) schedules = JSON.parse(e.registeredScheduleIds); } catch(err){}
        try { if (e.history) hist = JSON.parse(e.history); } catch(err){}
        return {
          ...e,
          completedCurriculumIndexes: completed,
          registeredSchedules: schedules,
          history: hist,
          userName: e.user?.name,
          userEmail: e.user?.email,
          courseTitle: e.course?.title,
          courseCurriculum: e.course?.curriculum ? JSON.parse(e.course.curriculum) : []
        };
      });
      res.json(mapped);
    } else if (role === 'INSTRUCTOR' && req.query.all === 'true') {
      const all = await (prisma as any).enrollment.findMany({
        where: { course: { instructorId: userId } },
        include: { course: { include: { schedules: true } }, user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });
      const mapped = all.map((e: any) => {
        let completed = [];
        let schedules = [];
        let hist = [];
        try { if (e.completedCurriculumIndexes) completed = JSON.parse(e.completedCurriculumIndexes); } catch(err){}
        try { if (e.registeredScheduleIds) schedules = JSON.parse(e.registeredScheduleIds); } catch(err){}
        try { if (e.history) hist = JSON.parse(e.history); } catch(err){}
        return {
          ...e,
          completedCurriculumIndexes: completed,
          registeredSchedules: schedules,
          history: hist,
          userName: e.user?.name,
          userEmail: e.user?.email,
          courseTitle: e.course?.title,
          courseCurriculum: e.course?.curriculum ? JSON.parse(e.course.curriculum) : []
        };
      });
      res.json(mapped);
    } else {
      const userEnrolls = await (prisma as any).enrollment.findMany({
        where: { userId },
        include: { course: { include: { schedules: true } } },
        orderBy: { createdAt: 'desc' }
      });
      const mappedUserEnrolls = userEnrolls.map((e: any) => {
        let completed = [];
        let schedules = [];
        let hist = [];
        try { if (e.completedCurriculumIndexes) completed = JSON.parse(e.completedCurriculumIndexes); } catch(err){}
        try { if (e.registeredScheduleIds) schedules = JSON.parse(e.registeredScheduleIds); } catch(err){}
        try { if (e.history) hist = JSON.parse(e.history); } catch(err){}
        return {
          ...e,
          completedCurriculumIndexes: completed,
          registeredSchedules: schedules,
          history: hist
        };
      });
      res.json(mappedUserEnrolls);
    }
  } catch (err) {
    res.status(500).json({ error: 'Lỗi' });
  }
});

app.post('/api/admin/enrollments', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email, courseId } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ error: 'Không tìm thấy user với email này' });

      const course = await (prisma as any).course.findUnique({ where: { id: courseId } });
      if (!course) return res.status(404).json({ error: 'Không tìm thấy khóa học' });

      const existing = await (prisma as any).enrollment.findUnique({
        where: { courseId_userId: { courseId, userId: user.id } }
      });
      if (existing) return res.status(400).json({ error: 'Học viên này đã được thêm vào khóa học rồi' });

      const enrollment = await (prisma as any).enrollment.create({
        data: {
          courseId,
          userId: user.id,
          completedCurriculumIndexes: '[]',
          totalAmount: 0
        },
        include: { course: true, user: { select: { id: true, name: true, email: true } } }
      });
      
      res.json({
        ...enrollment,
        userName: enrollment.user?.name,
        userEmail: enrollment.user?.email,
        courseTitle: enrollment.course?.title,
        courseCurriculum: enrollment.course?.curriculum ? JSON.parse(enrollment.course.curriculum) : [],
        completedCurriculumIndexes: []
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  app.delete('/api/admin/enrollments/:courseId/:userId', authenticateToken, requireAdminOrInstructor, async (req: Request, res: Response) => {
  try {
    const { courseId, userId } = req.params;
    await (prisma as any).enrollment.delete({
      where: { courseId_userId: { courseId, userId } }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi' });
  }
});

// --- AGENCY CONFIG APIs ---

app.get('/api/user/agency-upgrade-config', authenticateToken, async (req, res) => {
  try {
    const userId = res.locals.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const config = await prisma.agencyUpgradeConfig.findMany({ orderBy: { level: 'asc' } });
    res.json({ success: true, config, currentLevel: user.agencyLevel, balance: user.balance });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/user/upgrade-agency', authenticateToken, async (req, res) => {
  try {
    const { targetLevel } = req.body;
    const userId = res.locals.userId;
    
    await (prisma as any).$transaction(async (tx) => {
       const user = await tx.user.findUnique({ where: { id: userId } });
       if (!user) throw new Error('User not found');
       if (user.agencyLevel >= targetLevel) throw new Error('Không thể hạ cấp hoặc mua lại cấp độ hiện tại');
       
       const cfg = await tx.agencyUpgradeConfig.findUnique({ where: { level: targetLevel } });
       if (!cfg) throw new Error('Cấp độ không tồn tại');
       
       if (cfg.price > 0 && user.balance < cfg.price) throw new Error('Số dư không đủ');
       
       await tx.user.update({
         where: { id: userId },
         data: {
           balance: user.balance - cfg.price,
           agencyLevel: targetLevel
         }
       });
       
       const fmt = (val) => new Intl.NumberFormat('vi-VN').format(val);
       await tx.transaction.create({
         data: {
           id: `#UPG-${Date.now()}`,
           userId: userId,
           type: 'TRỪ TIỀN',
           amount: `-${fmt(cfg.price)} đ`,
           balance: `${fmt(user.balance - cfg.price)} đ`,
           desc: `Nâng cấp Đại lý cấp ${targetLevel}`,
           typeClass: 'text-red-400 bg-red-400/10 border-red-400/30'
         }
       });
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/agency-upgrade-config', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const config = await (prisma as any).agencyUpgradeConfig.findMany();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi' });
  }
});

app.put('/api/admin/agency-upgrade-config', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configs } = req.body;
    for (const cfg of configs) {
      await (prisma as any).agencyUpgradeConfig.upsert({
        where: { level: cfg.level },
        update: { price: cfg.price },
        create: { level: cfg.level, price: cfg.price }
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi' });
  }
});

app.get('/api/admin/agency-invite-links', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const links = await (prisma as any).agencyInviteLink.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, links });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi' });
  }
});

app.post('/api/admin/agency-invite-links', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { level, usageLeft, email } = req.body;
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await (prisma as any).agencyInviteLink.create({
      data: { code, level, usageLeft, email }
    });
    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi' });
  }
});

app.delete('/api/admin/agency-invite-links/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    await (prisma as any).agencyInviteLink.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi' });
  }
});


// --- AGENCY DISCOUNTS APIs ---
app.get('/api/admin/agency-discounts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const discounts = await (prisma as any).agencyDiscount.findMany();
    const services = await prisma.serverService.findMany({ select: { id: true, name: true, platform: true } });
    const resources = await (prisma as any).resource.findMany({ select: { id: true, name: true, variants: { select: { id: true, name: true } } } });
    const courses = await (prisma as any).course.findMany({ select: { id: true, title: true } });

    const enriched = discounts.map((d: any) => {
      let itemName = d.itemId;
      if (d.itemId === 'ALL') {
         itemName = 'Tất cả sản phẩm';
      } else if (d.itemType === 'SERVICE') {
         const s = services.find((x: any) => x.id === d.itemId);
         if (s) itemName = `[${(s.platform || 'Khác').toUpperCase()}] - ${s.name}`;
      } else if (d.itemType === 'RESOURCE') {
         const r = resources.find((x: any) => x.id === d.itemId);
         if (r) {
           itemName = r.name;
         } else {
           // Maybe it's a variant?
           let foundVariant = null;
           for (const res of resources) {
             if (res.variants) {
               const v = res.variants.find((v: any) => v.id === d.itemId);
               if (v) { foundVariant = v; itemName = res.name + ' - ' + (v.name || 'Variant'); break; }
             }
           }
         }
      } else if (d.itemType === 'COURSE') {
         const c = courses.find((x: any) => x.id === d.itemId);
         if (c) itemName = c.title;
      }
      return { ...d, itemName };
    });

    res.json({ success: true, discounts: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi' });
  }
});

app.put('/api/admin/agency-discounts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { agencyLevel, itemType, itemId, discountPercent } = req.body;
    
    // Check if it exists to update, else create
    const existing = await (prisma as any).agencyDiscount.findFirst({
      where: { agencyLevel, itemType, itemId }
    });
    
    if (existing) {
      await (prisma as any).agencyDiscount.update({
        where: { id: existing.id },
        data: { discountPercent }
      });
    } else {
      await (prisma as any).agencyDiscount.create({
        data: { agencyLevel, itemType, itemId, discountPercent }
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi' });
  }
});

app.delete('/api/admin/agency-discounts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { agencyLevel, itemType, itemId } = req.body;
    
    const existing = await (prisma as any).agencyDiscount.findFirst({
      where: { agencyLevel, itemType, itemId }
    });
    
    if (existing) {
      await (prisma as any).agencyDiscount.delete({
        where: { id: existing.id }
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi' });
  }
});

app.put('/api/admin/users/:id/agency-level', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { agencyLevel } = req.body;
    await prisma.user.update({
      where: { id },
      data: { agencyLevel: Number(agencyLevel) }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật cấp bậc đại lý' });
  }
});

// Admin Referrals endpoints
app.get('/api/admin/referrals', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rewards = await prisma.referralReward.findMany({
      include: {
        referrer: { select: { name: true, email: true } },
        referredUser: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/admin/referrals/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const reward = await prisma.referralReward.findUnique({ where: { id: req.params.id } });
    if (!reward) return res.status(404).json({ error: 'Không tìm thấy phần thưởng' });

    await prisma.$transaction(async (tx) => {
      const updated = await tx.referralReward.update({
        where: { id: req.params.id },
        data: { status, reason: reason || reward.reason }
      });

      if (status === 'COMPLETED' && reward.status !== 'COMPLETED') {
        const user = await tx.user.findUnique({ where: { id: reward.referrerId } });
        if (user) {
          await tx.user.update({
            where: { id: user.id },
            data: { balance: user.balance + reward.amount }
          });
          await tx.transaction.create({
            data: {
              id: `#TRX-${Date.now()}`,
              userId: user.id,
              type: 'CỘNG TIỀN',
              amount: `+${new Intl.NumberFormat('vi-VN').format(reward.amount)} ₫`,
              balance: `${new Intl.NumberFormat('vi-VN').format(user.balance + reward.amount)} ₫`,
              desc: `Nhận thưởng giới thiệu: ${reward.reason || 'Cộng tiền tự động'}`,
              typeClass: 'text-green-500'
            }
          });
        }
      }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật phần thưởng' });
  }
});
