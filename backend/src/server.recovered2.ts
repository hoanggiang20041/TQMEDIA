const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deployBackendPatch() {
  await ssh.connect({ host: '103.195.238.62', username: 'root', password: 'Giangdz2004@' });
  console.log('Uploading server.ts...');
  await ssh.putFile('d:/TQMEDIA/backend/src/server.ts', '/var/www/tqmedia/backend/src/server.ts');
  
  console.log('Restarting tqmedia-backend...');
  const res = await ssh.execCommand('pm2 restart tqmedia-backend');
  console.log(res.stdout);
  
  console.log('Done!');
  ssh.dispose();
}
deployBackendPatch();

    });
    res.json({ success: true, enrollment: updated });`;
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

async function getDiscountedPrice(basePrice: number, agencyLevel: number, itemType: string, itemId: string): Promise<number> {
  if (agencyLevel <= 0) return basePrice;
  const discounts = await (prisma as any).agencyDiscount.findMany({
    where: {
      agencyLevel,
      itemType,
      itemId: { in: [itemId, 'ALL'] }
    }
  });

  if (discounts.length === 0) return basePrice;
  const specificDiscount = discounts.find((d: any) => d.itemId === itemId);
  const bestDiscount = specificDiscount || discounts[0];
  const percent = bestDiscount.discountPercent;
  
  return Math.max(0, basePrice * (1 - percent / 100));
}

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
  message: { reply: 'Báº¡n Ä‘Ã£ nháº¯n quÃ¡ nhanh (VÆ°á»£t giá»›i háº¡n chá»‘ng Spam). Vui lÃ²ng chá» 1 phÃºt rá»“i thá»­ láº¡i nhÃ©!' }
});

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

// Helper: Xá»­ lÃ½ cá»™ng tiá»n hoa há»“ng náº¿u cÃ³
async function processReferralReward(userId: string, txClient: any = prisma) {
  const pendingReward = await txClient.referralReward.findFirst({
    where: { referredUserId: userId, status: 'PENDING' }
  });
  if (pendingReward) {
    await txClient.referralReward.update({
      where: { id: pendingReward.id },
      data: { status: 'COMPLETED' }
    });
    const referrer = await txClient.user.findUnique({ where: { id: pendingReward.referrerId } });
    if (referrer) {
      await txClient.user.update({
        where: { id: referrer.id },
        data: { balance: referrer.balance + pendingReward.amount }
      });
      const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
      await txClient.transaction.create({
        data: {
          id: `#TRX-${Math.floor(1000 + Math.random() * 9000)}`,
          userId: referrer.id,
          type: 'Cá»˜NG TIá»€N',
          amount: `+${fmt(pendingReward.amount)} â‚«`,
          balance: `${fmt(referrer.balance + pendingReward.amount)} â‚«`,
          desc: 'Hoa há»“ng giá»›i thiá»‡u ngÆ°á»i dÃ¹ng má»›i',
          typeClass: 'text-green-400 bg-green-400/10 border-green-400/30'
        }
      });
    }
  }
}

// Helper: Sinh token
function generateToken(user: any) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
/* MISSING_LINE_241 */
/* MISSING_LINE_242 */
/* MISSING_LINE_243 */
/* MISSING_LINE_244 */
/* MISSING_LINE_245 */
/* MISSING_LINE_246 */
/* MISSING_LINE_247 */
/* MISSING_LINE_248 */
/* MISSING_LINE_249 */
          <div style="background-color: #f8fafc; border-left: 4px solid #06b6d4; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
            <p style="color: #475569; margin: 0; font-size: 15px; line-height: 1.6;">
              ${replyMessage.replace(/\n/g, '<br/>')}
            </p>
          </div>
          <p><b>YÃªu cáº§u ban Ä‘áº§u cá»§a báº¡n:</b></p>
          <blockquote style="border-left: 4px solid #ddd; padding-left: 10px; color: #666; font-style: italic;">
            ${ticket.message.replace(/\n/g, '<br/>')}
          </blockquote>
          <p>Náº¿u báº¡n cÃ³ báº¥t ká»³ tháº¯c máº¯c nÃ o khÃ¡c, vui lÃ²ng liÃªn há»‡ hotline cá»§a chÃºng tÃ´i.</p>
        `,
        "Trá»Ÿ vá» trang chá»§",
        process.env.FRONTEND_URL || "https://tqsocial.vn"
      )
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
    res.status(500).json({ error: 'Lá»—i khi gá»­i email pháº£n há»“i' });
  }
});

app.delete('/api/admin/support-tickets/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.supportTicket.delete({ where: { id: req.params.id } });

app.post('/api/admin/send-email', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    
    if (!email || !subject || !message) {
      return res.status(400).json({ error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin' });
    }

    const mailOptions = {
      from: `"TQMEDIA" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: `[TQMEDIA] ${subject}`,
      html: buildEmailTemplate(
        subject,
        `
          <div style="white-space: pre-wrap; font-family: inherit;">${message}</div>
        `,
/* MISSING_LINE_301 */
/* MISSING_LINE_302 */
/* MISSING_LINE_303 */
/* MISSING_LINE_304 */
/* MISSING_LINE_305 */
/* MISSING_LINE_306 */
/* MISSING_LINE_307 */
/* MISSING_LINE_308 */
/* MISSING_LINE_309 */
/* MISSING_LINE_310 */
/* MISSING_LINE_311 */
/* MISSING_LINE_312 */
/* MISSING_LINE_313 */
/* MISSING_LINE_314 */
/* MISSING_LINE_315 */
/* MISSING_LINE_316 */
/* MISSING_LINE_317 */
/* MISSING_LINE_318 */
/* MISSING_LINE_319 */
    res.status(500).json({ error: 'Lá»—i server khi Ä‘áº·t láº¡i máº­t kháº©u.' });
  }
});

app.post('/api/auth/register', verifyTurnstile, async (req: Request, res: Response) => {
  try {
    const { name, email, password, inviteCode } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin' })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng' })

    let finalAgencyLevel = 0;
    if (inviteCode) {
      const invite = await prisma.agencyInviteLink.findUnique({ where: { code: inviteCode } });
      if (invite && invite.usageLeft !== 0) {
        finalAgencyLevel = invite.level;
        if (invite.usageLeft > 0) {
          await prisma.agencyInviteLink.update({
            where: { id: invite.id },
    if (existing) return res.status(400).json({ error: 'Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng' })

    let finalAgencyLevel = 0;
    if (inviteCode) {
      const invite = await prisma.agencyInviteLink.findUnique({ where: { code: inviteCode } });
      if (invite && invite.usageLeft !== 0) {
        finalAgencyLevel = invite.level;
        if (invite.usageLeft > 0) {
          await prisma.agencyInviteLink.update({
            where: { id: invite.id },
            data: { usageLeft: invite.usageLeft - 1 }
          });
        }
      }
    }

    let referredById: string | null = null;
    let referralStatus = 'PENDING';
    let referralReason: string | null = null;

    const affiliateSetting = await prisma.setting.findUnique({ where: { key: 'affiliate_enabled' } });
    const isAffiliateEnabled = affiliateSetting ? affiliateSetting.value === 'true' : true;

    if (ref && isAffiliateEnabled) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: ref } });
      if (referrer) {
        referredById = referrer.id;
        const referrerLogs = await prisma.loginLog.findFirst({ where: { userId: referrer.id, ip } });
        if (referrerLogs) {
          referralStatus = 'REJECTED';
          referralReason = 'TrÃ¹ng IP vá»›i ngÆ°á»i giá»›i thiá»‡u';
        } else {
          const existingRef = await prisma.referralReward.findFirst({ where: { ipAddress: ip } });
          if (existingRef) {
            referralStatus = 'REJECTED';
            referralReason = 'IP nÃ y Ä‘Ã£ Ä‘Äƒng kÃ½ qua link giá»›i thiá»‡u trÆ°á»›c Ä‘Ã³';
          }
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'GUEST', isEmailVerified: false, agencyLevel: finalAgencyLevel, referredById }
    })

    if (referredById) {
      await prisma.referralReward.create({
        data: {
          referrerId: referredById,
          referredUserId: newUser.id,
          status: referralStatus,
          ipAddress: ip,
          reason: referralReason,
          amount: 50000
        }
      });
    }

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
    const { email, password, inviteCode } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Vui lÃ²ng nháº­p Ä‘á»§ thÃ´ng tin' })

    let user = await prisma.user.findUnique({ where: { email } })
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
/* MISSING_LINE_431 */
/* MISSING_LINE_432 */
/* MISSING_LINE_433 */
/* MISSING_LINE_434 */
/* MISSING_LINE_435 */
/* MISSING_LINE_436 */
/* MISSING_LINE_437 */
/* MISSING_LINE_438 */
/* MISSING_LINE_439 */
/* MISSING_LINE_440 */
/* MISSING_LINE_441 */
/* MISSING_LINE_442 */
/* MISSING_LINE_443 */
/* MISSING_LINE_444 */
/* MISSING_LINE_445 */
/* MISSING_LINE_446 */
/* MISSING_LINE_447 */
/* MISSING_LINE_448 */
/* MISSING_LINE_449 */
/* MISSING_LINE_450 */
/* MISSING_LINE_451 */
/* MISSING_LINE_452 */
/* MISSING_LINE_453 */
/* MISSING_LINE_454 */
/* MISSING_LINE_455 */
/* MISSING_LINE_456 */
/* MISSING_LINE_457 */
/* MISSING_LINE_458 */
/* MISSING_LINE_459 */
/* MISSING_LINE_460 */
/* MISSING_LINE_461 */
/* MISSING_LINE_462 */
/* MISSING_LINE_463 */
/* MISSING_LINE_464 */
/* MISSING_LINE_465 */
/* MISSING_LINE_466 */
/* MISSING_LINE_467 */
/* MISSING_LINE_468 */
/* MISSING_LINE_469 */
/* MISSING_LINE_470 */
/* MISSING_LINE_471 */
/* MISSING_LINE_472 */
/* MISSING_LINE_473 */
/* MISSING_LINE_474 */
/* MISSING_LINE_475 */
/* MISSING_LINE_476 */
/* MISSING_LINE_477 */
/* MISSING_LINE_478 */
/* MISSING_LINE_479 */
/* MISSING_LINE_480 */
/* MISSING_LINE_481 */
/* MISSING_LINE_482 */
/* MISSING_LINE_483 */
/* MISSING_LINE_484 */
/* MISSING_LINE_485 */
/* MISSING_LINE_486 */
/* MISSING_LINE_487 */
/* MISSING_LINE_488 */
/* MISSING_LINE_489 */
/* MISSING_LINE_490 */
/* MISSING_LINE_491 */
/* MISSING_LINE_492 */
/* MISSING_LINE_493 */
/* MISSING_LINE_494 */
/* MISSING_LINE_495 */
/* MISSING_LINE_496 */
/* MISSING_LINE_497 */
/* MISSING_LINE_498 */
/* MISSING_LINE_499 */
/* MISSING_LINE_500 */
/* MISSING_LINE_501 */
/* MISSING_LINE_502 */
/* MISSING_LINE_503 */
/* MISSING_LINE_504 */
/* MISSING_LINE_505 */
/* MISSING_LINE_506 */
/* MISSING_LINE_507 */
/* MISSING_LINE_508 */
/* MISSING_LINE_509 */
/* MISSING_LINE_510 */
/* MISSING_LINE_511 */
/* MISSING_LINE_512 */
/* MISSING_LINE_513 */
/* MISSING_LINE_514 */
/* MISSING_LINE_515 */
/* MISSING_LINE_516 */
/* MISSING_LINE_517 */
/* MISSING_LINE_518 */
/* MISSING_LINE_519 */

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
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, agencyLevel: user.agencyLevel, balance: user.balance } })
  } catch (err) {
    res.status(401).json(
/* MISSING_LINE_552 */
/* MISSING_LINE_553 */
/* MISSING_LINE_554 */
/* MISSING_LINE_555 */
/* MISSING_LINE_556 */
/* MISSING_LINE_557 */
/* MISSING_LINE_558 */
/* MISSING_LINE_559 */
/* MISSING_LINE_560 */
/* MISSING_LINE_561 */
    res.json({ success: true, message: 'ÄÃ£ gá»­i mÃ£ xÃ¡c thá»±c qua Email' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'KhÃ´ng thá»ƒ gá»­i email. Vui lÃ²ng kiá»ƒm tra láº¡i cáº¥u hÃ¬nh SMTP.' })
  }
})

app.post('/api/auth/verify-email', authenticateToken, async (req, res) => {
  try {
app.get('/api/admin/vouchers', authenticateToken, requireAdmin, async (req, res) => {
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
    res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, agencyLevel: user.agencyLevel, balance: user.balance, createdAt: user.createdAt, isTwoFactorEnabled: user.isTwoFactorEnabled, isEmailVerified: user.isEmailVerified })
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i server' })
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
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  skip: (req, res) => res.locals?.userRole === 'ADMIN',
  message: { reply: 'Báº¡n Ä‘Ã£ nháº¯n quÃ¡ nhanh (VÆ°á»£t giá»›i háº¡n chá»‘ng Spam). Vui lÃ²ng chá» 1 phÃºt rá»“i thá»­ láº¡i nhÃ©!' }
});

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
  
/* MISSING_LINE_655 */
/* MISSING_LINE_656 */
/* MISSING_LINE_657 */
/* MISSING_LINE_658 */
/* MISSING_LINE_659 */
/* MISSING_LINE_660 */
/* MISSING_LINE_661 */
/* MISSING_LINE_662 */
/* MISSING_LINE_663 */
/* MISSING_LINE_664 */
/* MISSING_LINE_665 */
/* MISSING_LINE_666 */
/* MISSING_LINE_667 */
/* MISSING_LINE_668 */
/* MISSING_LINE_669 */
/* MISSING_LINE_670 */
/* MISSING_LINE_671 */
/* MISSING_LINE_672 */
/* MISSING_LINE_673 */
/* MISSING_LINE_674 */
/* MISSING_LINE_675 */
/* MISSING_LINE_676 */
/* MISSING_LINE_677 */
/* MISSING_LINE_678 */
/* MISSING_LINE_679 */
/* MISSING_LINE_680 */
/* MISSING_LINE_681 */
/* MISSING_LINE_682 */
/* MISSING_LINE_683 */
/* MISSING_LINE_684 */
/* MISSING_LINE_685 */
/* MISSING_LINE_686 */
/* MISSING_LINE_687 */
/* MISSING_LINE_688 */
/* MISSING_LINE_689 */

// Äá»•i máº­t kháº©u
app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const userId = res.locals.userId;
    const { oldPassword, newPassword } = req.body;
    
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

      const order = await tx.order.create({
        data: {
          id: orderId,
          userId: user.id,
          platform: platform,
          service: `${platform.toUpperCase()} ${serviceType.toUpperCase()} - ${serverName}`,
          target: target,
          status: 'processing',
          total: `${fmt(total)} Ä‘`,
          totalNum: Number(total),
          quantity: Number(quantity),
          unitPrice: Number(total) / Number(quantity),
          costPrice: server.costPrice,
          profit: Number(total) - (server.costPrice * Number(quantity)),
          customData: customData ? JSON.stringify(customData) : null,
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
/* MISSING_LINE_801 */
/* MISSING_LINE_802 */
/* MISSING_LINE_803 */
/* MISSING_LINE_804 */
/* MISSING_LINE_805 */
/* MISSING_LINE_806 */
/* MISSING_LINE_807 */
/* MISSING_LINE_808 */
/* MISSING_LINE_809 */
/* MISSING_LINE_810 */
/* MISSING_LINE_811 */
/* MISSING_LINE_812 */
/* MISSING_LINE_813 */
/* MISSING_LINE_814 */
/* MISSING_LINE_815 */
/* MISSING_LINE_816 */
/* MISSING_LINE_817 */
/* MISSING_LINE_818 */
/* MISSING_LINE_819 */
/* MISSING_LINE_820 */
/* MISSING_LINE_821 */
/* MISSING_LINE_822 */
/* MISSING_LINE_823 */
/* MISSING_LINE_824 */
/* MISSING_LINE_825 */
/* MISSING_LINE_826 */
/* MISSING_LINE_827 */
/* MISSING_LINE_828 */
/* MISSING_LINE_829 */
/* MISSING_LINE_830 */
/* MISSING_LINE_831 */
/* MISSING_LINE_832 */
/* MISSING_LINE_833 */
/* MISSING_LINE_834 */
/* MISSING_LINE_835 */
/* MISSING_LINE_836 */
/* MISSING_LINE_837 */
/* MISSING_LINE_838 */
/* MISSING_LINE_839 */
/* MISSING_LINE_840 */
/* MISSING_LINE_841 */
/* MISSING_LINE_842 */
/* MISSING_LINE_843 */
/* MISSING_LINE_844 */
/* MISSING_LINE_845 */
/* MISSING_LINE_846 */
/* MISSING_LINE_847 */
/* MISSING_LINE_848 */
/* MISSING_LINE_849 */
/* MISSING_LINE_850 */
/* MISSING_LINE_851 */
/* MISSING_LINE_852 */
/* MISSING_LINE_853 */
/* MISSING_LINE_854 */
/* MISSING_LINE_855 */
/* MISSING_LINE_856 */
/* MISSING_LINE_857 */
/* MISSING_LINE_858 */
/* MISSING_LINE_859 */
/* MISSING_LINE_860 */
/* MISSING_LINE_861 */
/* MISSING_LINE_862 */
/* MISSING_LINE_863 */
/* MISSING_LINE_864 */
/* MISSING_LINE_865 */
/* MISSING_LINE_866 */
/* MISSING_LINE_867 */
/* MISSING_LINE_868 */
/* MISSING_LINE_869 */
/* MISSING_LINE_870 */
/* MISSING_LINE_871 */
/* MISSING_LINE_872 */
/* MISSING_LINE_873 */
/* MISSING_LINE_874 */
/* MISSING_LINE_875 */
/* MISSING_LINE_876 */
/* MISSING_LINE_877 */
/* MISSING_LINE_878 */
/* MISSING_LINE_879 */
/* MISSING_LINE_880 */
/* MISSING_LINE_881 */
/* MISSING_LINE_882 */
/* MISSING_LINE_883 */
/* MISSING_LINE_884 */
/* MISSING_LINE_885 */
/* MISSING_LINE_886 */
/* MISSING_LINE_887 */
/* MISSING_LINE_888 */
/* MISSING_LINE_889 */
    // Xá»­ lÃ½ API Baostar ngoÃ i transaction Ä‘á»ƒ trÃ¡nh lock db quÃ¡ lÃ¢u
    if (txResult.server.apiServiceId && txResult.server.apiServiceId.trim() !== '') {
      try {
        const formData = new URLSearchParams();
        formData.append('key', 'EAAABtpqnnsSwncubx7h0os2aga2socyat7i5oaSKittzi4t9gJJ2hIiB');
        formData.append('action', 'add');
        formData.append('service', txResult.server.apiServiceId.trim());
        formData.append('link', target);
        formData.append('quantity', String(quantity));

        const apiRes = await fetch('https://smm.baostar.net/api/v2', {
          method: 'POST',
          body: formData
        });
        
        const apiData = await apiRes.json();
        
        if (apiData.order) {
          // ThÃ nh cÃ´ng
          await prisma.order.update({
            where: { id: txResult.order.id },
            data: { 
              status: 'running', 
              apiOrderId: String(apiData.order),
              apiResponse: JSON.stringify(apiData)
            }
          });
        } else {
          // Lá»—i API -> Há»§y Ä‘Æ¡n vÃ  hoÃ n tiá»n
          await prisma.order.update({
            where: { id: txResult.order.id },
            data: { 
              status: 'cancelled',
              apiResponse: 'SMM Error: ' + (apiData.error || JSON.stringify(apiData))
            }
          });
          const currentUser = await prisma.user.findUnique({ where: { id: txResult.order.userId } });
          if (currentUser) {
            const newBalance = currentUser.balance + txResult.order.totalNum;
            await prisma.user.update({ where: { id: currentUser.id }, data: { balance: newBalance } });
            await prisma.transaction.create({
              data: {
                id: `#TRX-${Math.floor(1000 + Math.random() * 9000)}`,
                userId: currentUser.id,
                type: 'HOÃ€N TIá»€N',
                amount: `+${fmt(txResult.order.totalNum)} â‚«`,
                balance: `${fmt(newBalance)} â‚«`,
                desc: `HoÃ n tiá»n Ä‘Æ¡n ${txResult.order.id} (Lá»—i API MÃ¡y chá»§)`,
                typeClass: 'text-green-400 bg-green-400/10 border-green-400/30'
              }
            });
          }
        }
      } catch (apiErr: any) {
        // Lá»—i káº¿t ná»‘i -> Há»§y Ä‘Æ¡n vÃ  hoÃ n tiá»n
        await prisma.order.update({ 
          where: { id: txResult.order.id }, 
          data: { 
            status: 'cancelled',
            apiResponse: 'Network/SMM Error: ' + apiErr.message
          } 
  }
});

// Lá»‹ch sá»­ giao dá»‹ch
app.get('/api/transactions', authenticateToken, a
/* MISSING_LINE_956 */
/* MISSING_LINE_957 */
/* MISSING_LINE_958 */
/* MISSING_LINE_959 */
/* MISSING_LINE_960 */
/* MISSING_LINE_961 */
/* MISSING_LINE_962 */
/* MISSING_LINE_963 */
/* MISSING_LINE_964 */
/* MISSING_LINE_965 */
/* MISSING_LINE_966 */
/* MISSING_LINE_967 */
/* MISSING_LINE_968 */
/* MISSING_LINE_969 */
/* MISSING_LINE_970 */
/* MISSING_LINE_971 */
/* MISSING_LINE_972 */
/* MISSING_LINE_973 */
/* MISSING_LINE_974 */
/* MISSING_LINE_975 */
/* MISSING_LINE_976 */
/* MISSING_LINE_977 */
/* MISSING_LINE_978 */
/* MISSING_LINE_979 */
/* MISSING_LINE_980 */
/* MISSING_LINE_981 */
/* MISSING_LINE_982 */
/* MISSING_LINE_983 */
/* MISSING_LINE_984 */
/* MISSING_LINE_985 */
/* MISSING_LINE_986 */
/* MISSING_LINE_987 */
/* MISSING_LINE_988 */
/* MISSING_LINE_989 */
/* MISSING_LINE_990 */
/* MISSING_LINE_991 */
/* MISSING_LINE_992 */
/* MISSING_LINE_993 */
/* MISSING_LINE_994 */
/* MISSING_LINE_995 */
/* MISSING_LINE_996 */
/* MISSING_LINE_997 */
/* MISSING_LINE_998 */
/* MISSING_LINE_999 */
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
    co
      

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

/* MISSING_LINE_1081 */
/* MISSING_LINE_1082 */
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
    
    return res.json({ success: true, message: 'Processed successfully' })
  } catch (err) {
    console.error('SePay Webhook Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/referrals', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const rewards = await prisma.referralReward.findMany({
      where: { referrerId: userId },
      include: { referredUser: { select: { name: true, email: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({
      success: true,
      referralCode: user?.referralCode,
      rewards
    });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i láº¥y dá»¯ liá»‡u giá»›i thiá»‡u' });
  }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email Ä‘Ã£ tá»“n táº¡i' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, phone: phone || null, role: role || 'GUEST', balance: Number(balance) || 0 }
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i táº¡o thÃ nh viÃªn' });
    });
    res.json({
      success: true,
      referralCode: user.referralCode,
      rewards
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i táº£i dá»¯ liá»‡u giá»›i thiá»‡u' });
  }
});

app.put('/api/admin/referrals/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const reward = await prisma.referralReward.update({
      where: { id: req.params.id },
      data: { status, reason }
    });
    res.json({ success: true, reward });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i cáº­p nháº­t tráº¡ng thÃ¡i' });
  }
});

app.post('/api/admin/enrollments', authenticateToken, requireAdminOrInstructor, async (req, res) => {
  try {
    const { email, courseId } = req.body;
});

app.put('/api/admin/referrals/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const reward = await prisma.referralReward.update({
      where: { id: req.params.id },
      data: { status, reason }
    });
    res.json({ success: true, reward });
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i cáº­p nháº­t tráº¡ng thÃ¡i' });
  }
});

app.post('/api/admin/enrollments', authenticateToken, requireAdminOrInstructor, async (req, res) => {
  try {
    const { email, courseId } = req.body;
    if (!email || !courseId) return res.status(400).json({ error: 'Thiáº¿u thÃ´ng tin email hoáº·c khÃ³a há»c' });
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
        prevDateLimit.setDate(prevDateLimit.getDate() - diffDays - 1);
        prevEndDateLimit = new Date(dateLimit);
      } else if (reqMonth && reqYear) {
      isMonthMode = true;
      dateLimit = new Date(Date.UTC(reqYear, reqMonth - 1, 1));
      endDateLimit = new Date(Date.UTC(reqYear, reqMonth, 1));
      
      prevDateLimit = new Date(Date.UTC(reqYear, reqMonth - 2, 1));
      prevEndDateLimit = new Date(Date.UTC(reqYear, reqMonth - 1, 1));
    } else {
      days = parseInt(req.query.days as string) || 30;
      dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);
      endDateLimit = new Date();
      
      prevDateLimit = new Date(dateLimit);
      prevDateLimit.setDate(prevDateLimit.getDate() - days);
      prevEndDateLimit = new Date(dateLimit);
    }

    const totalUsers = await prisma.user.count();
    const sumBalanceAggr = await prisma.user.aggregate({ _sum: { balance: true } });
    const totalBalance = sumBalanceAggr._sum.balance || 0;

    const totalOrders = await prisma.order.count({ where: { createdAt: { gte: dateLimit, lt: endDateLimit } } });
    const sumOrderAggr = await (prisma as any).order.aggregate({ 
      _sum: { totalNum: true }, 
      where: { createdAt: { gte: dateLimit, lt: endDateLimit }, status: { not: 'cancelled' } } 
    });
    const orderRevenue = sumOrderAggr._sum.totalNum || 0;

    const enrollments = await (prisma as any).enrollment.findMany({
      where: { createdAt: { gte: dateLimit, lt: endDateLimit } },
      include: { course: { select: { salePrice: true } } }
    });
    const courseRevenue = enrollments.reduce((sum: number, e: any) => sum + (e.course?.salePrice || 0), 0);

    const sumResourceAggr = await (prisma as any).resourceOrder.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: dateLimit, lt: endDateLimit } }
    });
    const resourceRevenue = sumResourceAggr._sum.totalAmount || 0;

    const sumOrderProfitAggr = await (prisma as any).order.aggregate({ 
      _sum: { profit: true }, 
      where: { createdAt: { gte: dateLimit, lt: endDateLimit }, status: { not: 'cancelled' } } 
    });
    const orderProfit = sumOrderProfitAggr._sum.profit || 0;
    
    // Resource profit = Revenue - Import Cost
    const resourceProfit = resourceRevenue - (sumResourceAggr._sum.totalImportAmount || 0);
    // Course profit = Revenue (100% margin)
    const courseProfit = courseRevenue;

    const totalIncome = orderRevenue + courseRevenue + resourceRevenue;
    const totalProfit = orderProfit + courseProfit + resourceProfit;

    const depositTxs = await (prisma as any).transaction.findMany({
      where: { type: 'Cá»˜NG TIá»€N', createdAt: { gte: dateLimit, lt: endDateLimit } },
      select: { amount: true, desc: true }
    });
    const totalDeposited = depositTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    let bankCount = 0;
    let momoCount = 0;
    let otherCount = 0;
    depositTxs.forEach((t: any) => {
      const desc = (t.desc || '').toLowerCase();
      if (desc.includes('momo')) momoCount++;
      else if (desc.includes('chuyá»ƒn khoáº£n') || desc.includes('ngÃ¢n hÃ ng') || desc.includes('bank')) bankCount++;
    } else {
      paymentMethods.push({ name: 'NgÃ¢n hÃ ng', value: 0 }, { name: 'Momo', value: 0 });
    }

    const prevSumOrderAggr = await (prisma as any).order.aggregate({ 
      _sum: { totalNum: true }, 
      where: { createdAt: { gte: prevDateLimit, lt: prevEndDateLimit }, status: { not: 'cancelled' } } 
    });
    const prevOrderRevenue = prevSumOrderAggr._sum.totalNum || 0;
    const prevEnrollments = await (prisma as any).enrollment.findMany({
      where: { createdAt: { gte: prevDateLimit, lt: prevEndDateLimit } },
      include: { course: { select: { salePrice: true } } }
    });
    const prevCourseRevenue = prevEnrollments.reduce((sum: number, e: any) => sum + (e.course?.salePrice || 0), 0);
    const prevSumResourceAggr = await (prisma as any).resourceOrder.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: prevDateLimit, lt: prevEndDateLimit } }
    });
    const prevResourceRevenue = prevSumResourceAggr._sum.totalAmount || 0;
    const prevIncome = prevOrderRevenue + prevCourseRevenue + prevResourceRevenue;

    const prevDepositTxs = await (prisma as any).transaction.findMany({
      where: { type: 'Cá»˜NG TIá»€N', createdAt: { gte: prevDateLimit, lt: prevEndDateLimit } },
      select: { amount: true }
    });
    const prevDeposited = prevDepositTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    const currentUsers = await (prisma as any).user.count({ where: { createdAt: { gte: dateLimit, lt: endDateLimit } } });
    const prevUsers = await (prisma as any).user.count({ where: { createdAt: { gte: prevDateLimit, lt: prevEndDateLimit } } });

    const calcTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? '+100%' : '0%';
      const percent = ((current - prev) / prev) * 100;
      return (percent > 0 ? '+' : '') + percent.toFixed(1) + '%';
    };

    const transactions = await (prisma as any).transaction.findMany({
      where: { createdAt: { gte: dateLimit, lt: endDateLimit } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } }
    });

});

app.get('/api/admin/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let dateLimit: Date;
    let endDateLimit: Date;
    let prevDateLimit: Date;
    let prevEndDateLimit: Date;
    
    const reqMonth = req.query.month ? parseInt(req.query.month as string) : null;
      const reqYear = req.query.year ? parseInt(req.query.year as string) : null;
      const reqStartDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
      const reqEndDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
      
      let isMonthMode = false;
      let days = 30;
      
      if (reqStartDate && reqEndDate) {
        dateLimit = new Date(reqStartDate.setHours(0,0,0,0));
        endDateLimit = new Date(reqEndDate.setHours(23,59,59,999));
        
        const diffTime = Math.abs(reqEndDate.getTime() - reqStartDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        prevDateLimit = new Date(dateLimit);
        prevDateLimit.setDate(prevDateLimit.getDate() - diffDays - 1);
        prevEndDateLimit = new Date(dateLimit);
      } else if (reqMonth && reqYear) {
      isMonthMode = true;
      dateLimit = new Date(Date.UTC(reqYear, reqMonth - 1, 1));
      endDateLimit = new Date(Date.UTC(reqYear, reqMonth, 1));
      
      prevDateLimit = new Date(Date.UTC(reqYear
/* MISSING_LINE_1557 */
/* MISSING_LINE_1558 */
/* MISSING_LINE_1559 */
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
    let dateLimit: Date;
    let endDateLimit: Date;
    let prevDateLimit: Date;
    let prevEndDateLimit: Date;
    
    const reqMonth = req.query.month ? parseInt(req.query.month as string) : null;
      const reqYear = req.query.year ? parseInt(req.query.year as string) : null;
      const reqStartDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
      const reqEndDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
      
      let isMonthMode = false;
      let days = 30;
      
      if (reqStartDate && reqEndDate) {
        dateLimit = new Date(reqStartDate.setHours(0,0,0,0));
        endDateLimit = new Date(reqEndDate.setHours(23,59,59,999));
        
        const diffTime = Math.abs(reqEndDate.getTime() - reqStartDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        prevDateLimit = new Date(dateLimit);
        prevDateLimit.setDate(prevDateLimit.getDate() - diffDays - 1);
        prevEndDateLimit = new Date(dateLimit);
      } else if (reqMonth && reqYear) {
      isMonthMode = true;
      dateLimit = new Date(Date.UTC(reqYear, reqMonth - 1, 1));
      endDateLimit = new Date(Date.UTC(reqYear, reqMonth, 1));
      
      prevDateLimit = new Date(Date.UTC(reqYear, reqMonth - 2, 1));
      prevEndDateLimit = new Date(Date.UTC(reqYear, reqMonth - 1, 1));
    } else {
      days = parseInt(req.query.days as string) || 30;
      dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);
      endDateLimit = new Date();
      
      prevDateLimit = new Date(dateLimit);
      prevDateLimit.setDate(prevDateLimit.getDate() - days);
      prevEndDateLimit = new Date(dateLimit);
    }

    const totalUsers = await prisma.user.count();
    const sumBalanceAggr = await prisma.user.aggregate({ _sum: { balance: true } });
    const totalBalance = sumBalanceAggr._sum.balance || 0;

    const totalOrders = await prisma.order.count({ where: { createdAt: { gte: dateLimit, lt: endDateLimit } } });
    const sumOrderAggr = await (prisma as any).order.aggregate({ 
      _sum: { totalNum: true }, 
      where: { createdAt: { gte: dateLimit, lt: endDateLimit }, status: { not: 'cancelled' } } 
    });
    const orderRevenue = sumOrderAggr._sum.totalNum || 0;

    const enrollments = await (prisma as any).enrollment.findMany({
      where: { createdAt: { gte: dateLimit, lt: endDateLimit } },
      include: { course: { select: { salePrice: true } } }
    });
    const courseRevenue = enrollments.reduce((sum: number, e: any) => sum + (e.totalAmount || e.course?.salePrice || 0), 0);
    const courseImportCost = enrollments.reduce((sum: number, e: any) => sum + (e.totalImportAmount || 0), 0);

    const sumResourceAggr = await (prisma as any).resourceOrder.aggregate({
      _sum: { totalAmount: true, totalImportAmount: true },
      where: { createdAt: { gte: dateLimit, lt: endDateLimit } }
    });
    const resourceRevenue = sumResourceAggr._sum.totalAmount || 0;

    const sumOrderProfitAggr = await (prisma as any).order.aggregate({ 
      _sum: { profit: true }, 
      where: { createdAt: { gte: dateLimit
    });
    const orderProfit = sumOrderProfitAggr._sum.profit || 0;
    
    // Resource profit = Revenue - Import Cost
    const resourceProfit = resourceRevenue - (sumResourceAggr._sum.totalImportAmount || 0);
    // Course profit = Revenue - Import Cost
    const courseProfit = courseRevenue - courseImportCost;

    const totalIncome = orderRevenue + courseRevenue + resourceRevenue;
    const totalProfit = orderProfit + courseProfit + resourceProfit;

    const depositTxs = await (prisma as any).transaction.findMany({
      where: { type: 'Cá»˜NG TIá»€N', createdAt: { gte: dateLimit, lt: endDateLimit }, user: { role: { not: 'ADMIN' } } },
      select: { amount: true, desc: true }
    });
    const totalDeposited = depositTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    let bankCount = 0;
    let momoCount = 0;
    let otherCount = 0;
    depositTxs.forEach((t: any) => {
      const desc = (t.desc || '').toLowerCase();
      if (desc.includes('momo')) momoCount++;
      else if (desc.includes('chuyá»ƒn khoáº£n') || desc.includes('ngÃ¢n hÃ ng') || desc.includes('bank')) bankCount++;
      else otherCount++;
    });
    const totalTxCount = bankCount + momoCount + otherCount;
    const paymentMethods = [];
    if (totalTxCount > 0) {
      if (bankCount > 0) paymentMethods.push({ name: 'NgÃ¢n hÃ ng', value: Math.round((bankCount/totalTxCount)*100) });
      if (momoCount > 0) paymentMethods.push({ name: 'Momo', value: Math.round((momoCount/totalTxCount)*100) });
      if (otherCount > 0) paymentMethods.push({ name: 'KhÃ¡c', value: Math.round((otherCount/totalTxCount)*100) });
    } else {
      paymentMethods.push({ name: 'NgÃ¢n hÃ ng', value: 0 }, { name: 'Momo', value: 0 });
    }

    const prevSumOrderAggr = await (prisma as any).order.aggregate({ 
      _sum: { totalNum: true }, 
      where: { createdAt: { gte: prevDateLimit, lt: prevEndDateLimit }, status: { not: 'cancelled' } } 
    });
    const prevOrderRevenue = prevSumOrderAggr._sum.totalNum || 0;
    const prevEnrollments = await (prisma as any).enrollment.findMany({
      where: { createdAt: { gte: prevDateLimit, lt: prevEndDateLimit } },
      include: { course: { select: { salePrice: true } } }
    });
    const prevCourseRevenue = prevEnrollments.reduce((sum: number, e: any) => sum + (e.totalAmount || e.course?.salePrice || 0), 0);
    const prevSumResourceAggr = await (prisma as any).resourceOrder.aggregate({
      _sum: { totalAmount: true, totalImportAmount: true },
      where: { createdAt: { gte: prevDateLimit, lt: prevEndDateLimit } }
    });
    const prevResourceRevenue = prevSumResourceAggr._sum.totalAmount || 0;
    const prevIncome = prevOrderRevenue + prevCourseRevenue + prevResourceRevenue;

    const prevDepositTxs = await (prisma as any).transaction.findMany({
      where: { type: 'Cá»˜N
      select: { amount: true }
    });
    const prevDeposited = prevDepositTxs.reduce((sum: number, t: any) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

    const currentUsers = await (prisma as any).user.count({ where: { createdAt: { gte: dateLimit, lt: endDateLimit } } });
    const prevUsers = await (prisma as any).user.count({ where: { createdAt: { gte: prevDateLimit, lt: prevEndDateLimit } } });

    const calcTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? '+100%' : '0%';
      const percent = ((current - prev) / prev) * 100;
      return (percent > 0 ? '+' : '') + percent.toFixed(1) + '%';
    };

    const transactions = await (prisma as any).transaction.findMany({
      where: { createdAt: { gte: dateLimit, lt: endDateLimit } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } }
    });

    let chartData: any[] = [];
    const vnOffset = 7 * 60 * 60 * 1000;
    
    if (days <= 31) {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000 + vnOffset);
        chartData.push({
          name: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`,
          income: 0,
          dateStr: `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`
        });
      }
      
      const ordersRange = await prisma.order.findMany({
        where: { createdAt: { gte: dateLimit }, status: { not: 'cancelled' } },
        select: { createdAt: true, totalNum: true }
      });
      const enrollmentsRange = await (prisma as any).enrollment.findMany({
        where: { createdAt: { gte: dateLimit } },
        include: { course: { select: { salePrice: true } } }
      });
      const resourceOrdersRange = await (prisma as any).resourceOrder.findMany({
        where: { createdAt: { gte: dateLimit } },
        select: { createdAt: true, totalAmount: true }
      });
      
      const addIncome = (items: any[], getVal: (item: any) => number) => {
        items.forEach(item => {
          const d = new Date(item.createdAt.getTime() + vnOffset);
          const dateStr = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
          const found = chartData.find(c => c.dateStr === dateStr);
          if (found) found.income += getVal(item);
        });
      };
      addIncome(ordersRange, o => o.totalNum || 0);
      addIncome(enrollmentsRange, e => e.course?.salePrice || 0);
      addIncome(resourceOrdersRange, r => r.totalAmount || 0);
    } else {
      chartData = Array.from({ length: 12 }, (_, i) => ({
        name: `T${i + 1}`,
        income: 0,
      }));
      
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const ordersYear = await prisma.order.findMany({
        where: { createdAt: { gte: startOfYear }, s
      });
      const enrollmentsYear = await (prisma as any).enrollment.findMany({
        where: { createdAt: { gte: startOfYear } },
        include: { course: { select: { salePrice: true } } }
      });
      });
      const resourceOrdersYear = await (prisma as any).resourceOrder.findMany({
        where: { createdAt: { gte: startOfYear } },
        select: { createdAt: true, totalAmount: true }
      });
      
      const getVnMonth = (date: Date) => new Date(date.getTime() + vnOffset).getUTCMonth();
      ordersYear.forEach((o: any) => { chartData[getVnMonth(o.createdAt)].income += o.totalNum || 0; });
      enrollmentsYear.forEach((e: any) => { chartData[getVnMonth(e.createdAt)].income += e.course?.salePrice || 0; });
      resourceOrdersYear.forEach((r: any) => { chartData[getVnMonth(r.createdAt)].income += r.totalAmount || 0; });
    }

    res.json({
      success: true,
      stats: { totalUsers, totalBalance, totalOrders, totalIncome, totalDeposited, totalProfit },
      trends: { incomeTrend: calcTrend(totalIncome, prevIncome), depositTrend: calcTrend(totalDeposited, prevDeposited), usersTrend: calcTrend(currentUsers, prevUsers) },
      transactions,
      monthlyData: chartData,
      paymentMethods
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/courses/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const courseId = req.params.id;
    const { voucherCode, discount = 0 } = req.body;
    const userId = res.locals.userId;

    await prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({ where: { id: courseId } });
      if (!course || course.status !== 'active') throw new Error('KhÃ³a há»c khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ ngá»«ng bÃ¡n');
/* MISSING_LINE_1801 */
/* MISSING_LINE_1802 */
/* MISSING_LINE_1803 */
/* MISSING_LINE_1804 */
/* MISSING_LINE_1805 */
/* MISSING_LINE_1806 */
/* MISSING_LINE_1807 */
/* MISSING_LINE_1808 */
/* MISSING_LINE_1809 */
/* MISSING_LINE_1810 */
/* MISSING_LINE_1811 */
/* MISSING_LINE_1812 */
/* MISSING_LINE_1813 */
/* MISSING_LINE_1814 */
/* MISSING_LINE_1815 */
/* MISSING_LINE_1816 */
/* MISSING_LINE_1817 */
/* MISSING_LINE_1818 */
/* MISSING_LINE_1819 */
/* MISSING_LINE_1820 */
/* MISSING_LINE_1821 */
/* MISSING_LINE_1822 */
/* MISSING_LINE_1823 */
/* MISSING_LINE_1824 */
/* MISSING_LINE_1825 */
/* MISSING_LINE_1826 */
/* MISSING_LINE_1827 */
/* MISSING_LINE_1828 */
/* MISSING_LINE_1829 */
/* MISSING_LINE_1830 */
/* MISSING_LINE_1831 */
/* MISSING_LINE_1832 */
/* MISSING_LINE_1833 */
/* MISSING_LINE_1834 */
/* MISSING_LINE_1835 */
/* MISSING_LINE_1836 */
/* MISSING_LINE_1837 */
/* MISSING_LINE_1838 */
/* MISSING_LINE_1839 */
/* MISSING_LINE_1840 */
/* MISSING_LINE_1841 */
/* MISSING_LINE_1842 */
/* MISSING_LINE_1843 */
/* MISSING_LINE_1844 */
/* MISSING_LINE_1845 */
/* MISSING_LINE_1846 */
/* MISSING_LINE_1847 */
/* MISSING_LINE_1848 */
/* MISSING_LINE_1849 */
/* MISSING_LINE_1850 */
/* MISSING_LINE_1851 */
/* MISSING_LINE_1852 */
/* MISSING_LINE_1853 */
/* MISSING_LINE_1854 */
/* MISSING_LINE_1855 */
/* MISSING_LINE_1856 */
/* MISSING_LINE_1857 */
/* MISSING_LINE_1858 */
/* MISSING_LINE_1859 */
/* MISSING_LINE_1860 */
/* MISSING_LINE_1861 */
/* MISSING_LINE_1862 */
/* MISSING_LINE_1863 */
/* MISSING_LINE_1864 */
/* MISSING_LINE_1865 */
/* MISSING_LINE_1866 */
/* MISSING_LINE_1867 */
/* MISSING_LINE_1868 */
/* MISSING_LINE_1869 */
/* MISSING_LINE_1870 */
/* MISSING_LINE_1871 */
/* MISSING_LINE_1872 */
/* MISSING_LINE_1873 */
/* MISSING_LINE_1874 */
/* MISSING_LINE_1875 */
/* MISSING_LINE_1876 */
/* MISSING_LINE_1877 */
/* MISSING_LINE_1878 */
/* MISSING_LINE_1879 */
/* MISSING_LINE_1880 */
/* MISSING_LINE_1881 */
/* MISSING_LINE_1882 */
/* MISSING_LINE_1883 */
/* MISSING_LINE_1884 */
/* MISSING_LINE_1885 */
/* MISSING_LINE_1886 */
/* MISSING_LINE_1887 */
/* MISSING_LINE_1888 */
/* MISSING_LINE_1889 */
/* MISSING_LINE_1890 */
/* MISSING_LINE_1891 */
/* MISSING_LINE_1892 */
/* MISSING_LINE_1893 */
/* MISSING_LINE_1894 */
/* MISSING_LINE_1895 */
/* MISSING_LINE_1896 */
/* MISSING_LINE_1897 */
/* MISSING_LINE_1898 */
/* MISSING_LINE_1899 */
/* MISSING_LINE_1900 */
/* MISSING_LINE_1901 */
/* MISSING_LINE_1902 */
/* MISSING_LINE_1903 */
/* MISSING_LINE_1904 */
/* MISSING_LINE_1905 */
/* MISSING_LINE_1906 */
/* MISSING_LINE_1907 */
/* MISSING_LINE_1908 */
/* MISSING_LINE_1909 */
/* MISSING_LINE_1910 */
/* MISSING_LINE_1911 */
/* MISSING_LINE_1912 */
/* MISSING_LINE_1913 */
/* MISSING_LINE_1914 */
/* MISSING_LINE_1915 */
/* MISSING_LINE_1916 */
/* MISSING_LINE_1917 */
/* MISSING_LINE_1918 */
/* MISSING_LINE_1919 */
/* MISSING_LINE_1920 */
/* MISSING_LINE_1921 */
/* MISSING_LINE_1922 */
/* MISSING_LINE_1923 */
/* MISSING_LINE_1924 */
/* MISSING_LINE_1925 */
/* MISSING_LINE_1926 */
/* MISSING_LINE_1927 */
/* MISSING_LINE_1928 */
/* MISSING_LINE_1929 */
/* MISSING_LINE_1930 */
/* MISSING_LINE_1931 */
/* MISSING_LINE_1932 */
/* MISSING_LINE_1933 */
/* MISSING_LINE_1934 */
/* MISSING_LINE_1935 */
/* MISSING_LINE_1936 */
/* MISSING_LINE_1937 */
/* MISSING_LINE_1938 */
/* MISSING_LINE_1939 */
/* MISSING_LINE_1940 */
/* MISSING_LINE_1941 */
/* MISSING_LINE_1942 */
/* MISSING_LINE_1943 */
/* MISSING_LINE_1944 */
/* MISSING_LINE_1945 */
/* MISSING_LINE_1946 */
/* MISSING_LINE_1947 */
/* MISSING_LINE_1948 */
/* MISSING_LINE_1949 */
/* MISSING_LINE_1950 */
/* MISSING_LINE_1951 */
/* MISSING_LINE_1952 */
/* MISSING_LINE_1953 */
/* MISSING_LINE_1954 */
/* MISSING_LINE_1955 */
/* MISSING_LINE_1956 */
/* MISSING_LINE_1957 */
/* MISSING_LINE_1958 */
/* MISSING_LINE_1959 */
/* MISSING_LINE_1960 */
/* MISSING_LINE_1961 */
/* MISSING_LINE_1962 */
/* MISSING_LINE_1963 */
/* MISSING_LINE_1964 */
/* MISSING_LINE_1965 */
/* MISSING_LINE_1966 */
/* MISSING_LINE_1967 */
/* MISSING_LINE_1968 */
/* MISSING_LINE_1969 */
/* MISSING_LINE_1970 */
/* MISSING_LINE_1971 */
/* MISSING_LINE_1972 */
/* MISSING_LINE_1973 */
/* MISSING_LINE_1974 */
/* MISSING_LINE_1975 */
/* MISSING_LINE_1976 */
/* MISSING_LINE_1977 */
/* MISSING_LINE_1978 */
/* MISSING_LINE_1979 */
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

app.put('/api/enrollments/progress', authenticateToken, async (req, res) => {
  try {
/* MISSING_LINE_2001 */
/* MISSING_LINE_2002 */
        userName: e.user.name,
        userEmail: e.user.email,
        courseTitle: e.course.title,
        courseCurriculum,
        completedCurriculumIndexes,
        registeredSchedule,
        registeredSchedules,
        history
      };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
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
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) return res.status(400).json({ error: 'MÃ£ giáº£m giÃ¡ Ä‘Ã£ háº¿t lÆ°á»£t.' });
    if (voucher.minOrderValue && orderTotal < voucher.minOrderValue) return res.status(400).json({ error: `ÄÆ¡n hÃ ng tá»‘i thiá»ƒu Ä‘á»ƒ Ã¡p dá»¥ng mÃ£ nÃ y lÃ  ${voucher.minOrderValue}Ä‘.` });
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

app.put('/api/enrollments/progress', authenticateToken, async (req, res) => {
  try {
    const { courseId, userId, completedIndexes } = req.body;
    // Allow instructors and admins to update other users' progress, but regular users can only update their own
    if (res.locals.role !== 'ADMIN' && res.locals.role !== 'INSTRUCTOR' && res.locals.userId !== userId) {
      return res.status(403).json({ error: 'Khong co quyen cap nhat' });
    }
    
    let history = [];
    const enrollment = await prisma.enrollment.findUnique({ where: { courseId_userId: { courseId, userId } }});
    if (enrollment && enrollment.history) {
      try { history = JSON.parse(enrollment.history); } catch {}
    }
    history.push({
      time: new Date().toISOString(),
      action: `Cáº­p nháº­t tiáº¿n Ä‘á»™ bÃ i há»c: ${completedIndexes.length} bÃ i`
    });

    const updated = await prisma.enrollment.update({
      where: {
        courseId_userId: { courseId, userId }
      },
      dat
/* MISSING_LINE_2086 */
/* MISSING_LINE_2087 */
/* MISSING_LINE_2088 */
/* MISSING_LINE_2089 */
/* MISSING_LINE_2090 */
/* MISSING_LINE_2091 */
/* MISSING_LINE_2092 */
/* MISSING_LINE_2093 */
/* MISSING_LINE_2094 */
/* MISSING_LINE_2095 */
/* MISSING_LINE_2096 */
/* MISSING_LINE_2097 */
/* MISSING_LINE_2098 */
/* MISSING_LINE_2099 */
/* MISSING_LINE_2100 */
/* MISSING_LINE_2101 */
/* MISSING_LINE_2102 */
/* MISSING_LINE_2103 */
/* MISSING_LINE_2104 */
/* MISSING_LINE_2105 */
/* MISSING_LINE_2106 */
/* MISSING_LINE_2107 */
/* MISSING_LINE_2108 */
/* MISSING_LINE_2109 */
/* MISSING_LINE_2110 */
/* MISSING_LINE_2111 */
/* MISSING_LINE_2112 */
/* MISSING_LINE_2113 */
/* MISSING_LINE_2114 */
/* MISSING_LINE_2115 */
/* MISSING_LINE_2116 */
/* MISSING_LINE_2117 */
/* MISSING_LINE_2118 */
/* MISSING_LINE_2119 */
/* MISSING_LINE_2120 */
/* MISSING_LINE_2121 */
/* MISSING_LINE_2122 */
/* MISSING_LINE_2123 */
/* MISSING_LINE_2124 */
/* MISSING_LINE_2125 */
/* MISSING_LINE_2126 */
/* MISSING_LINE_2127 */
/* MISSING_LINE_2128 */
/* MISSING_LINE_2129 */
/* MISSING_LINE_2130 */
/* MISSING_LINE_2131 */
/* MISSING_LINE_2132 */
/* MISSING_LINE_2133 */
/* MISSING_LINE_2134 */
/* MISSING_LINE_2135 */
/* MISSING_LINE_2136 */
/* MISSING_LINE_2137 */
/* MISSING_LINE_2138 */
/* MISSING_LINE_2139 */
/* MISSING_LINE_2140 */
/* MISSING_LINE_2141 */
/* MISSING_LINE_2142 */
/* MISSING_LINE_2143 */
/* MISSING_LINE_2144 */
/* MISSING_LINE_2145 */
/* MISSING_LINE_2146 */
/* MISSING_LINE_2147 */
/* MISSING_LINE_2148 */
/* MISSING_LINE_2149 */
/* MISSING_LINE_2150 */
/* MISSING_LINE_2151 */
/* MISSING_LINE_2152 */
/* MISSING_LINE_2153 */
/* MISSING_LINE_2154 */
/* MISSING_LINE_2155 */
/* MISSING_LINE_2156 */
/* MISSING_LINE_2157 */
/* MISSING_LINE_2158 */
/* MISSING_LINE_2159 */
/* MISSING_LINE_2160 */
/* MISSING_LINE_2161 */
/* MISSING_LINE_2162 */
/* MISSING_LINE_2163 */
/* MISSING_LINE_2164 */
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
/* MISSING_LINE_2201 */
/* MISSING_LINE_2202 */
/* MISSING_LINE_2203 */
/* MISSING_LINE_2204 */
/* MISSING_LINE_2205 */
/* MISSING_LINE_2206 */
/* MISSING_LINE_2207 */
/* MISSING_LINE_2208 */
/* MISSING_LINE_2209 */
/* MISSING_LINE_2210 */
/* MISSING_LINE_2211 */
/* MISSING_LINE_2212 */
/* MISSING_LINE_2213 */
/* MISSING_LINE_2214 */
/* MISSING_LINE_2215 */
/* MISSING_LINE_2216 */
/* MISSING_LINE_2217 */
/* MISSING_LINE_2218 */
/* MISSING_LINE_2219 */
/* MISSING_LINE_2220 */
/* MISSING_LINE_2221 */
/* MISSING_LINE_2222 */
/* MISSING_LINE_2223 */
/* MISSING_LINE_2224 */
/* MISSING_LINE_2225 */
/* MISSING_LINE_2226 */
/* MISSING_LINE_2227 */
/* MISSING_LINE_2228 */
/* MISSING_LINE_2229 */
/* MISSING_LINE_2230 */
/* MISSING_LINE_2231 */
/* MISSING_LINE_2232 */
/* MISSING_LINE_2233 */
/* MISSING_LINE_2234 */
/* MISSING_LINE_2235 */
/* MISSING_LINE_2236 */
/* MISSING_LINE_2237 */
/* MISSING_LINE_2238 */
/* MISSING_LINE_2239 */
/* MISSING_LINE_2240 */
/* MISSING_LINE_2241 */
/* MISSING_LINE_2242 */
/* MISSING_LINE_2243 */
/* MISSING_LINE_2244 */
/* MISSING_LINE_2245 */
/* MISSING_LINE_2246 */
/* MISSING_LINE_2247 */
/* MISSING_LINE_2248 */
/* MISSING_LINE_2249 */
/* MISSING_LINE_2250 */
/* MISSING_LINE_2251 */
/* MISSING_LINE_2252 */
/* MISSING_LINE_2253 */
/* MISSING_LINE_2254 */
/* MISSING_LINE_2255 */
/* MISSING_LINE_2256 */
/* MISSING_LINE_2257 */
/* MISSING_LINE_2258 */
/* MISSING_LINE_2259 */
/* MISSING_LINE_2260 */
/* MISSING_LINE_2261 */
/* MISSING_LINE_2262 */
/* MISSING_LINE_2263 */
/* MISSING_LINE_2264 */
/* MISSING_LINE_2265 */
/* MISSING_LINE_2266 */
/* MISSING_LINE_2267 */
/* MISSING_LINE_2268 */
/* MISSING_LINE_2269 */
/* MISSING_LINE_2270 */
/* MISSING_LINE_2271 */
/* MISSING_LINE_2272 */
/* MISSING_LINE_2273 */
/* MISSING_LINE_2274 */
/* MISSING_LINE_2275 */
/* MISSING_LINE_2276 */
/* MISSING_LINE_2277 */
/* MISSING_LINE_2278 */
/* MISSING_LINE_2279 */
/* MISSING_LINE_2280 */
/* MISSING_LINE_2281 */
/* MISSING_LINE_2282 */
/* MISSING_LINE_2283 */
/* MISSING_LINE_2284 */
/* MISSING_LINE_2285 */
/* MISSING_LINE_2286 */
/* MISSING_LINE_2287 */
/* MISSING_LINE_2288 */
/* MISSING_LINE_2289 */
/* MISSING_LINE_2290 */
/* MISSING_LINE_2291 */
/* MISSING_LINE_2292 */
/* MISSING_LINE_2293 */
/* MISSING_LINE_2294 */
/* MISSING_LINE_2295 */
/* MISSING_LINE_2296 */
/* MISSING_LINE_2297 */
/* MISSING_LINE_2298 */
/* MISSING_LINE_2299 */
      let remainingStock = variant.stockData;

      if (resource.type === 'ACCOUNT') {
        const lines = variant.stockData.split(/\n|\r?\n/).filter((l: string) => l.trim().length > 0);
        if (lines.length < quantity) throw new Error(`Kho chá»‰ cÃ²n ${lines.length} sáº£n pháº©m`);

        const takenLines = lines.slice(0, quantity);
        deliveredData = takenLines.join('\n');
        remainingStock = lines.slice(quantity).join('\n');
      } else {
        deliveredData = variant.stockData;
      }

      let totalAmount = variant.price * quantity;
      let totalImportAmount = variant.importPrice * quantity;

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

        if (totalAmount > 0) {
          const newBalance = user.balance - totalAmount;
          await tx.transaction.create({
            data: {
              id: `#TRX-${Date.now().toString().slice(-6)}`,
              userId,
              type: "TRá»ª TIá»€N",
              amount: `-${new Intl.NumberFormat('vi-VN').format(totalAmount)} â‚«`,
              balance: `${new Intl.NumberFormat('vi-VN').format(newBalance)} â‚«`,
              desc: `Mua tÃ i nguyÃªn: ${resource.name}`,
              typeClass: "text-red-400 bg-red-400/10 border-red-400/30"
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
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  skip: (req, res) => res.locals?.userRole === 'ADMIN',
  message: { reply: 'Báº¡n Ä‘Ã£ nháº¯n quÃ¡ nhanh (VÆ°á»£t giá»›i háº¡n chá»‘ng Spam). Vui lÃ²ng chá» 1 phÃºt rá»“i thá»­ láº¡i nhÃ©!' }
});

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
    const resources = await prisma.resource.findMany({ 
      include: { variants: true },
      orderBy: { createdAt: 'desc' } 
    });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i táº£i danh sÃ¡ch tÃ i nguyÃªn' });
  }
});

app.post('/api/admin/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, iconPlatform, description, thumbnail, type, status, variants } = req.body;
/* MISSING_LINE_2386 */
/* MISSING_LINE_2387 */
/* MISSING_LINE_2388 */
/* MISSING_LINE_2389 */
/* MISSING_LINE_2390 */
/* MISSING_LINE_2391 */
/* MISSING_LINE_2392 */
/* MISSING_LINE_2393 */
/* MISSING_LINE_2394 */
/* MISSING_LINE_2395 */
/* MISSING_LINE_2396 */
/* MISSING_LINE_2397 */
/* MISSING_LINE_2398 */
/* MISSING_LINE_2399 */
/* MISSING_LINE_2400 */
/* MISSING_LINE_2401 */
/* MISSING_LINE_2402 */
app.put('/api/admin/resources/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, iconPlatform, description, type, thumbnail, status, variants } = req.body;
    const resourceId = req.params.id;

    const resource = await prisma.resource.update({
      where: { id: resourceId },
      data: { name, category: category || 'KhÃ¡c', iconPlatform, description, type, thumbnail, status },
      include: { variants: true }
    });

    // Handle variants manually to support create, update, delete
    if (variants && Array.isArray(variants)) {
      const incomingIds = variants.map(v => v.id).filter(id => id);
      // Delete missing variants
      await prisma.resourceVariant.deleteMany({
        where: { resourceId, id: { notIn: incomingIds } }
});


// --- RESOURCES API (ADMIN) ---
app.get('/api/admin/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({ 
      include: { variants: true },
      orderBy: { createdAt: 'desc' } 
    });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i táº£i danh sÃ¡ch tÃ i nguyÃªn' });
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
      const allowedIds = voucher.applicableTo.r

QUY Táº®C ÄIá»€U HÆ¯á»šNG Báº®T BUá»˜C:
  - Náº¾U khÃ¡ch nÃ³i muá»‘n tÄƒng like, tÄƒng follow, mua dá»‹ch vá»¥ cho ná»n táº£ng nÃ o Ä‘Ã³ (Facebook, Tiktok...), Báº®T BUá»˜C báº¡n pháº£i tráº£ lá»i ráº¥t ngáº¯n gá»n vÃ  chÃ¨n lá»‡nh REDIRECT á»Ÿ cuá»‘i cÃ¢u! 
  VÃ­ dá»¥: "Dáº¡ sáº¿p vÃ o Ä‘Ã¢y Ä‘á»ƒ mua dá»‹ch vá»¥ TikTok nhÃ©: [REDIRECT:/dashboard/tiktok]"
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
        const lines = resource.stockData.split(/\\n|\r?\n/).filter((l: string) => l.trim().length > 0);
        if (lines.length < quantity) throw new Error(`Kho chá»‰ cÃ²n ${lines.length} sáº£n pháº©m`);

        const takenLines = lines.slice(0, quantity);
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
    const resources = await prisma.resource.findMany({ 
      include: { variants: true },
      orderBy: { createdAt: 'desc' } 
    });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i táº£i danh sÃ¡ch tÃ i nguyÃªn' });
  }
});

app.post('/api/admin/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, iconPlatform, description, thumbnail, type, status, variants } = req.body;
    
    const processedVariants = (variants || []).map((v: any) => {
      const stockCount = v.stockData ? v.stockData.split(/\r?\n/).filter((l: string) => l.trim()).length : 0;
      return {
        name: v.name,
        importPrice: Number(v.importPrice) || 0,
        price: Number(v.price) || 0,
        stockData: v.stockData || '',
        stockCount: stockCount
      };
    });

    const resource = await prisma.resource.create({
      data: { 
        name, category: category || 'KhÃ¡c', iconPlatform, description, type, thumbnail, status,
        variants: {
          create: processedVariants
        }
      },
      include: { variants: true }
    });
    res.json(resource);
  } catch (err) {
    console.error('Create resource error:', err);
    res.status(500).json({ error: 'Lá»—i táº¡o tÃ i nguyÃªn' });
  }
    });

    // Handle variants manually to support cre

      const incomingIds = variants.map(v => v.id).filter(id => id);
      // Delete missing variants
      await prisma.resourceVariant.deleteMany({
        where: { resourceId, id: { notIn: incomingIds } }
      });
      // Upsert given variants
      for (const v of variants) {
        const stockCount = v.stockData ? v.stockData.split(/\r?\n/).filter((l: string) => l.trim()).length : 0;
        if (v.id) {
          await prisma.resourceVariant.update({
            where: { id: v.id },
            data: { name: v.name, importPrice: Number(v.importPrice), price: Number(v.price), stockData: v.stockData || '', stockCount }
          });
        } else {
          await prisma.resourceVariant.create({
            data: { resourceId, name: v.name, importPrice: Number(v.importPrice), price: Number(v.price), stockData: v.stockData || '', stockCount }
          });
        }
      },
            data: { name: v.name, importPrice: Number(v.importPrice), price: Number(v.price), stockData: v.stockData }
          });
        } else {
          await prisma.resourceVariant.create({
            data: { resourceId, name: v.name, importPrice: Number(v.importPrice), price: Number(v.price), stockData: v.stockData }
          });
        }
      }
    }

    const updatedResource = await prisma.resource.findUnique({ where: { id: resourceId }, include: { variants: true } });
    res.json(updatedResource);
  } catch (err) {
    res.status(500).json({ error: 'Lá»—i cáº­p nháº­t tÃ i nguyÃªn' });
  }
});

app.delete('/api/admin/resources/:id', authenticateToken, requireAdmin, async (req, res) => {
/* MISSING_LINE_2701 */
/* MISSING_LINE_2702 */
/* MISSING_LINE_2703 */
/* MISSING_LINE_2704 */
/* MISSING_LINE_2705 */
/* MISSING_LINE_2706 */
/* MISSING_LINE_2707 */
/* MISSING_LINE_2708 */
/* MISSING_LINE_2709 */
/* MISSING_LINE_2710 */
/* MISSING_LINE_2711 */
/* MISSING_LINE_2712 */
/* MISSING_LINE_2713 */
/* MISSING_LINE_2714 */
/* MISSING_LINE_2715 */
/* MISSING_LINE_2716 */
/* MISSING_LINE_2717 */
/* MISSING_LINE_2718 */
/* MISSING_LINE_2719 */
/* MISSING_LINE_2720 */
/* MISSING_LINE_2721 */
/* MISSING_LINE_2722 */
/* MISSING_LINE_2723 */
/* MISSING_LINE_2724 */
/* MISSING_LINE_2725 */
/* MISSING_LINE_2726 */
/* MISSING_LINE_2727 */
/* MISSING_LINE_2728 */
/* MISSING_LINE_2729 */
/* MISSING_LINE_2730 */
/* MISSING_LINE_2731 */
/* MISSING_LINE_2732 */
/* MISSING_LINE_2733 */
/* MISSING_LINE_2734 */
/* MISSING_LINE_2735 */
/* MISSING_LINE_2736 */
/* MISSING_LINE_2737 */
/* MISSING_LINE_2738 */
/* MISSING_LINE_2739 */
/* MISSING_LINE_2740 */
/* MISSING_LINE_2741 */
/* MISSING_LINE_2742 */
/* MISSING_LINE_2743 */
/* MISSING_LINE_2744 */
/* MISSING_LINE_2745 */
/* MISSING_LINE_2746 */
/* MISSING_LINE_2747 */
/* MISSING_LINE_2748 */
/* MISSING_LINE_2749 */
/* MISSING_LINE_2750 */
/* MISSING_LINE_2751 */
/* MISSING_LINE_2752 */
/* MISSING_LINE_2753 */
/* MISSING_LINE_2754 */
/* MISSING_LINE_2755 */
/* MISSING_LINE_2756 */
/* MISSING_LINE_2757 */
/* MISSING_LINE_2758 */
/* MISSING_LINE_2759 */
/* MISSING_LINE_2760 */
/* MISSING_LINE_2761 */
/* MISSING_LINE_2762 */
  VÃ­ dá»¥: "Dáº¡ sáº¿p vÃ o Ä‘Ã¢y Ä‘á»ƒ mua dá»‹ch vá»¥ TikTok nhÃ©: [REDIRECT:/dashboard/tiktok]"
  
  DANH SÃCH ÄÆ¯á»œNG DáºªN Báº®T BUá»˜C PHáº¢I DÃ™NG CHUáº¨N XÃC:
  - Trang chá»§ Báº£ng Ä‘iá»u khiá»ƒn: [REDIRECT:/dashboard]
  - Há»i náº¡p tiá»n: [REDIRECT:/dashboard/deposit]
  - Há»i xem lá»‹ch sá»­ Ä‘Æ¡n hÃ ng: [REDIRECT:/dashboard/orders]
  - Xem danh sÃ¡ch khÃ³a há»c: [REDIRECT:/dashboard/courses]
  - Xem tÃ i nguyÃªn/tÃ i khoáº£n: [REDIRECT:/dashboard/resources]
  - LiÃªn há»‡ CSKH: [REDIRECT:/contact]
  ${extraRoutingRules}
  
  KHÃ”NG ÄÆ¯á»¢C Tá»° Bá»ŠA ÄÆ¯á»œNG LINK KHÃ”NG Tá»’N Táº I Náº¾U KHÃCH Há»ŽI, Náº¾U Bá»ŠA RA LINK Sáº¼ Bá»Š PHáº T.
  `;
  
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

    const groqKey = process.env.GROQ_API_KEY;
    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: formattedMessages
      })
    });
// --- SMM PANEL SYNC ---
async function syncSMMOrders() {
  try {
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: { in: ['processing', 'running'] },
        apiOrderId: { not: null }
      }
    });

    if (pendingOrders.length === 0) return;

    const chunkSize = 100;
    for (let i = 0; i < pendingOrders.length; i += chunkSize) {
      const chunk = pendingOrders.slice(i, i + chunkSize);
      const apiIds = chunk.map(o => o.apiOrderId).join(',');

      const formData = new URLSearchParams();
      formData.append('key', 'EAAABtpqnnsSwncubx7h0os2aga2socyat7i5oaSKittzi4t9gJJ2hIiB');
      formData.append('action', 'orders');
      formData.append('orders', apiIds);

      const res = await fetch('https://smm.baostar.net/api/v2', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data && typeof data === 'object' && !data.error) {
        for (const order of chunk) {
          const apiData = data[order.apiOrderId as string];
          if (apiData) {
            let newStatus = order.status;
            const smmStatus = String(apiData.status || '').toLowerCase();
            if (smmStatus === 'completed') newStatus = 'completed';
            else if (smmStatus === 'canceled' || smmStatus === 'cancelled') newStatus = 'cancelled';
            else if (smmStatus === 'partial') newStatus = 'completed';
            else if (smmStatus === 'processing' || smmStatus === 'in progress') newStatus = 'running';

            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: newStatus,
                startCount: parseInt(apiData.start_count) || 0,
                remains: parseInt(apiData.remains) || 0
              }
            });
          }
/* MISSING_LINE_2851 */
/* MISSING_LINE_2852 */
/* MISSING_LINE_2853 */
/* MISSING_LINE_2854 */
/* MISSING_LINE_2855 */
/* MISSING_LINE_2856 */
/* MISSING_LINE_2857 */
/* MISSING_LINE_2858 */
/* MISSING_LINE_2859 */
/* MISSING_LINE_2860 */
/* MISSING_LINE_2861 */
/* MISSING_LINE_2862 */
/* MISSING_LINE_2863 */
/* MISSING_LINE_2864 */
/* MISSING_LINE_2865 */
/* MISSING_LINE_2866 */
/* MISSING_LINE_2867 */
/* MISSING_LINE_2868 */
/* MISSING_LINE_2869 */
/* MISSING_LINE_2870 */
/* MISSING_LINE_2871 */
/* MISSING_LINE_2872 */
/* MISSING_LINE_2873 */
/* MISSING_LINE_2874 */
/* MISSING_LINE_2875 */
/* MISSING_LINE_2876 */
/* MISSING_LINE_2877 */
/* MISSING_LINE_2878 */
/* MISSING_LINE_2879 */
/* MISSING_LINE_2880 */
/* MISSING_LINE_2881 */
/* MISSING_LINE_2882 */
/* MISSING_LINE_2883 */
/* MISSING_LINE_2884 */
/* MISSING_LINE_2885 */
/* MISSING_LINE_2886 */
/* MISSING_LINE_2887 */
/* MISSING_LINE_2888 */
/* MISSING_LINE_2889 */
/* MISSING_LINE_2890 */
/* MISSING_LINE_2891 */
/* MISSING_LINE_2892 */
/* MISSING_LINE_2893 */
/* MISSING_LINE_2894 */
/* MISSING_LINE_2895 */

      
      const userDiscount = await tx.user.findUnique({ where: { id: userId } });
      let baseVariantPrice = variant.price;
      if (userDiscount && userDiscount.agencyLevel > 0) {
        baseVariantPrice = await getDiscountedPrice(variant.price, userDiscount.agencyLevel, 'RESOURCE', resource.id);
      }
      let totalAmount = baseVariantPrice * quantity;


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

/* MISSING_LINE_2927 */
/* MISSING_LINE_2928 */
/* MISSING_LINE_2929 */
/* MISSING_LINE_2930 */
/* MISSING_LINE_2931 */
/* MISSING_LINE_2932 */
/* MISSING_LINE_2933 */
/* MISSING_LINE_2934 */
/* MISSING_LINE_2935 */
/* MISSING_LINE_2936 */
/* MISSING_LINE_2937 */
/* MISSING_LINE_2938 */
/* MISSING_LINE_2939 */
/* MISSING_LINE_2940 */
/* MISSING_LINE_2941 */
/* MISSING_LINE_2942 */
/* MISSING_LINE_2943 */
/* MISSING_LINE_2944 */
/* MISSING_LINE_2945 */
/* MISSING_LINE_2946 */
/* MISSING_LINE_2947 */
/* MISSING_LINE_2948 */
/* MISSING_LINE_2949 */
/* MISSING_LINE_2950 */
/* MISSING_LINE_2951 */
/* MISSING_LINE_2952 */
/* MISSING_LINE_2953 */
/* MISSING_LINE_2954 */
/* MISSING_LINE_2955 */
/* MISSING_LINE_2956 */
/* MISSING_LINE_2957 */
/* MISSING_LINE_2958 */
/* MISSING_LINE_2959 */
/* MISSING_LINE_2960 */
/* MISSING_LINE_2961 */
/* MISSING_LINE_2962 */
/* MISSING_LINE_2963 */
/* MISSING_LINE_2964 */
/* MISSING_LINE_2965 */
/* MISSING_LINE_2966 */
/* MISSING_LINE_2967 */
/* MISSING_LINE_2968 */
/* MISSING_LINE_2969 */
/* MISSING_LINE_2970 */
/* MISSING_LINE_2971 */
/* MISSING_LINE_2972 */
/* MISSING_LINE_2973 */
/* MISSING_LINE_2974 */
/* MISSING_LINE_2975 */
/* MISSING_LINE_2976 */
/* MISSING_LINE_2977 */
/* MISSING_LINE_2978 */
/* MISSING_LINE_2979 */
/* MISSING_LINE_2980 */
/* MISSING_LINE_2981 */
/* MISSING_LINE_2982 */
/* MISSING_LINE_2983 */
/* MISSING_LINE_2984 */
/* MISSING_LINE_2985 */
/* MISSING_LINE_2986 */
/* MISSING_LINE_2987 */
/* MISSING_LINE_2988 */
/* MISSING_LINE_2989 */
/* MISSING_LINE_2990 */
/* MISSING_LINE_2991 */
/* MISSING_LINE_2992 */
/* MISSING_LINE_2993 */
/* MISSING_LINE_2994 */
/* MISSING_LINE_2995 */
/* MISSING_LINE_2996 */
/* MISSING_LINE_2997 */
/* MISSING_LINE_2998 */
/* MISSING_LINE_2999 */
/* MISSING_LINE_3000 */
/* MISSING_LINE_3001 */
/* MISSING_LINE_3002 */
/* MISSING_LINE_3003 */
/* MISSING_LINE_3004 */
/* MISSING_LINE_3005 */
/* MISSING_LINE_3006 */
/* MISSING_LINE_3007 */
/* MISSING_LINE_3008 */
/* MISSING_LINE_3009 */
/* MISSING_LINE_3010 */
/* MISSING_LINE_3011 */
/* MISSING_LINE_3012 */
/* MISSING_LINE_3013 */
/* MISSING_LINE_3014 */
/* MISSING_LINE_3015 */
/* MISSING_LINE_3016 */
/* MISSING_LINE_3017 */
/* MISSING_LINE_3018 */
/* MISSING_LINE_3019 */
/* MISSING_LINE_3020 */
/* MISSING_LINE_3021 */
/* MISSING_LINE_3022 */
/* MISSING_LINE_3023 */
/* MISSING_LINE_3024 */
/* MISSING_LINE_3025 */
/* MISSING_LINE_3026 */
/* MISSING_LINE_3027 */
/* MISSING_LINE_3028 */
/* MISSING_LINE_3029 */
/* MISSING_LINE_3030 */
/* MISSING_LINE_3031 */
/* MISSING_LINE_3032 */
/* MISSING_LINE_3033 */
/* MISSING_LINE_3034 */
/* MISSING_LINE_3035 */
/* MISSING_LINE_3036 */
/* MISSING_LINE_3037 */
/* MISSING_LINE_3038 */
/* MISSING_LINE_3039 */
/* MISSING_LINE_3040 */
/* MISSING_LINE_3041 */
/* MISSING_LINE_3042 */
/* MISSING_LINE_3043 */
/* MISSING_LINE_3044 */
/* MISSING_LINE_3045 */
/* MISSING_LINE_3046 */
/* MISSING_LINE_3047 */
/* MISSING_LINE_3048 */
/* MISSING_LINE_3049 */
/* MISSING_LINE_3050 */
/* MISSING_LINE_3051 */
/* MISSING_LINE_3052 */
/* MISSING_LINE_3053 */
/* MISSING_LINE_3054 */
/* MISSING_LINE_3055 */
/* MISSING_LINE_3056 */
/* MISSING_LINE_3057 */
/* MISSING_LINE_3058 */
/* MISSING_LINE_3059 */
/* MISSING_LINE_3060 */
/* MISSING_LINE_3061 */
/* MISSING_LINE_3062 */
/* MISSING_LINE_3063 */
/* MISSING_LINE_3064 */
/* MISSING_LINE_3065 */
/* MISSING_LINE_3066 */
/* MISSING_LINE_3067 */
/* MISSING_LINE_3068 */
/* MISSING_LINE_3069 */
/* MISSING_LINE_3070 */
/* MISSING_LINE_3071 */
/* MISSING_LINE_3072 */
/* MISSING_LINE_3073 */
/* MISSING_LINE_3074 */
/* MISSING_LINE_3075 */
/* MISSING_LINE_3076 */
/* MISSING_LINE_3077 */
/* MISSING_LINE_3078 */
/* MISSING_LINE_3079 */
/* MISSING_LINE_3080 */
/* MISSING_LINE_3081 */
/* MISSING_LINE_3082 */
/* MISSING_LINE_3083 */
/* MISSING_LINE_3084 */
/* MISSING_LINE_3085 */
/* MISSING_LINE_3086 */
/* MISSING_LINE_3087 */
/* MISSING_LINE_3088 */
/* MISSING_LINE_3089 */
/* MISSING_LINE_3090 */
/* MISSING_LINE_3091 */
/* MISSING_LINE_3092 */
/* MISSING_LINE_3093 */
/* MISSING_LINE_3094 */
/* MISSING_LINE_3095 */
/* MISSING_LINE_3096 */
/* MISSING_LINE_3097 */
/* MISSING_LINE_3098 */
/* MISSING_LINE_3099 */
/* MISSING_LINE_3100 */
/* MISSING_LINE_3101 */
/* MISSING_LINE_3102 */
/* MISSING_LINE_3103 */
/* MISSING_LINE_3104 */
/* MISSING_LINE_3105 */
/* MISSING_LINE_3106 */
/* MISSING_LINE_3107 */
/* MISSING_LINE_3108 */
/* MISSING_LINE_3109 */
/* MISSING_LINE_3110 */
/* MISSING_LINE_3111 */
/* MISSING_LINE_3112 */
/* MISSING_LINE_3113 */
/* MISSING_LINE_3114 */
/* MISSING_LINE_3115 */
/* MISSING_LINE_3116 */
/* MISSING_LINE_3117 */
/* MISSING_LINE_3118 */
/* MISSING_LINE_3119 */
/* MISSING_LINE_3120 */
/* MISSING_LINE_3121 */
/* MISSING_LINE_3122 */
/* MISSING_LINE_3123 */
/* MISSING_LINE_3124 */
/* MISSING_LINE_3125 */
/* MISSING_LINE_3126 */
/* MISSING_LINE_3127 */
/* MISSING_LINE_3128 */
/* MISSING_LINE_3129 */
/* MISSING_LINE_3130 */
/* MISSING_LINE_3131 */
/* MISSING_LINE_3132 */
/* MISSING_LINE_3133 */
/* MISSING_LINE_3134 */
/* MISSING_LINE_3135 */
/* MISSING_LINE_3136 */
/* MISSING_LINE_3137 */
/* MISSING_LINE_3138 */
/* MISSING_LINE_3139 */
/* MISSING_LINE_3140 */
/* MISSING_LINE_3141 */
/* MISSING_LINE_3142 */
/* MISSING_LINE_3143 */
/* MISSING_LINE_3144 */
/* MISSING_LINE_3145 */
/* MISSING_LINE_3146 */
/* MISSING_LINE_3147 */
/* MISSING_LINE_3148 */
/* MISSING_LINE_3149 */
/* MISSING_LINE_3150 */
/* MISSING_LINE_3151 */
/* MISSING_LINE_3152 */
/* MISSING_LINE_3153 */
/* MISSING_LINE_3154 */
/* MISSING_LINE_3155 */
/* MISSING_LINE_3156 */
/* MISSING_LINE_3157 */
/* MISSING_LINE_3158 */
/* MISSING_LINE_3159 */
/* MISSING_LINE_3160 */
/* MISSING_LINE_3161 */
/* MISSING_LINE_3162 */
/* MISSING_LINE_3163 */
/* MISSING_LINE_3164 */
/* MISSING_LINE_3165 */
/* MISSING_LINE_3166 */
/* MISSING_LINE_3167 */
/* MISSING_LINE_3168 */
/* MISSING_LINE_3169 */
/* MISSING_LINE_3170 */
/* MISSING_LINE_3171 */
/* MISSING_LINE_3172 */
/* MISSING_LINE_3173 */
/* MISSING_LINE_3174 */
/* MISSING_LINE_3175 */
/* MISSING_LINE_3176 */
/* MISSING_LINE_3177 */
/* MISSING_LINE_3178 */
/* MISSING_LINE_3179 */
/* MISSING_LINE_3180 */
/* MISSING_LINE_3181 */
/* MISSING_LINE_3182 */
/* MISSING_LINE_3183 */
/* MISSING_LINE_3184 */
/* MISSING_LINE_3185 */
/* MISSING_LINE_3186 */
/* MISSING_LINE_3187 */
/* MISSING_LINE_3188 */
/* MISSING_LINE_3189 */
/* MISSING_LINE_3190 */
/* MISSING_LINE_3191 */
/* MISSING_LINE_3192 */
/* MISSING_LINE_3193 */
/* MISSING_LINE_3194 */
/* MISSING_LINE_3195 */
/* MISSING_LINE_3196 */
/* MISSING_LINE_3197 */
/* MISSING_LINE_3198 */
/* MISSING_LINE_3199 */
/* MISSING_LINE_3200 */
/* MISSING_LINE_3201 */
/* MISSING_LINE_3202 */
/* MISSING_LINE_3203 */
/* MISSING_LINE_3204 */
/* MISSING_LINE_3205 */
/* MISSING_LINE_3206 */
/* MISSING_LINE_3207 */
/* MISSING_LINE_3208 */
/* MISSING_LINE_3209 */
/* MISSING_LINE_3210 */
/* MISSING_LINE_3211 */
/* MISSING_LINE_3212 */
/* MISSING_LINE_3213 */
/* MISSING_LINE_3214 */
/* MISSING_LINE_3215 */
/* MISSING_LINE_3216 */
/* MISSING_LINE_3217 */
/* MISSING_LINE_3218 */
/* MISSING_LINE_3219 */
/* MISSING_LINE_3220 */
/* MISSING_LINE_3221 */
/* MISSING_LINE_3222 */
/* MISSING_LINE_3223 */
/* MISSING_LINE_3224 */
/* MISSING_LINE_3225 */
/* MISSING_LINE_3226 */
/* MISSING_LINE_3227 */
/* MISSING_LINE_3228 */
/* MISSING_LINE_3229 */
/* MISSING_LINE_3230 */
/* MISSING_LINE_3231 */
/* MISSING_LINE_3232 */
/* MISSING_LINE_3233 */
/* MISSING_LINE_3234 */
/* MISSING_LINE_3235 */
/* MISSING_LINE_3236 */
/* MISSING_LINE_3237 */
/* MISSING_LINE_3238 */
/* MISSING_LINE_3239 */
/* MISSING_LINE_3240 */
/* MISSING_LINE_3241 */
/* MISSING_LINE_3242 */
/* MISSING_LINE_3243 */
/* MISSING_LINE_3244 */
/* MISSING_LINE_3245 */
/* MISSING_LINE_3246 */
/* MISSING_LINE_3247 */
/* MISSING_LINE_3248 */
/* MISSING_LINE_3249 */
      formData.append('action', 'orders');
      formData.append('orders', apiIds);

      const res = await fetch('https://smm.baostar.net/api/v2', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data && typeof data === 'object' && !data.error) {
        for (const order of chunk) {
          const apiData = data[order.apiOrderId as string];
          if (apiData) {
            let newStatus = order.status;
            const smmStatus = String(apiData.status || '').toLowerCase();
            if (smmStatus === 'completed') newStatus = 'completed';
            else if (smmStatus === 'canceled' || smmStatus === 'cancelled') newStatus = 'cancelled';
            else if (smmStatus === 'partial') newStatus = 'completed';
            else if (smmStatus === 'processing' || smmStatus === 'in progress') newStatus = 'running';

            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: newStatus,
                startCount: parseInt(apiData.start_count) || 0,
                remains: parseInt(apiData.remains) || 0
              }
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error syncing SMM orders:', err);
  }
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
    }
  } catch (err) {
    console.error('Error syncing SMM orders:', err);
  }
}

// Cháº¡y Ä‘á»“ng bá»™ má»—i 5 phÃºt
setInterval(syncSMMOrders, 5 * 60 * 1000);
setTimeout(syncSMMOrders, 5000); // Cháº¡y 1 láº§n sau 5s khá»Ÿi Ä‘á»™ng


// --- AGENCY DISCOUNT API ---

app.get('/api/admin/agency-discounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const discounts = await prisma.agencyDiscount.findMany();
    const enrichedDiscounts = await Promise.all(discounts.map(async (d) => {
      let itemName = d.itemId;
      if (d.itemId !== 'ALL') {
        try {
/* MISSING_LINE_3361 */
/* MISSING_LINE_3362 */
/* MISSING_LINE_3363 */
/* MISSING_LINE_3364 */
/* MISSING_LINE_3365 */
/* MISSING_LINE_3366 */
/* MISSING_LINE_3367 */
/* MISSING_LINE_3368 */
/* MISSING_LINE_3369 */
/* MISSING_LINE_3370 */
/* MISSING_LINE_3371 */
/* MISSING_LINE_3372 */
/* MISSING_LINE_3373 */
/* MISSING_LINE_3374 */
/* MISSING_LINE_3375 */
/* MISSING_LINE_3376 */
/* MISSING_LINE_3377 */
/* MISSING_LINE_3378 */
/* MISSING_LINE_3379 */
/* MISSING_LINE_3380 */
/* MISSING_LINE_3381 */
/* MISSING_LINE_3382 */
/* MISSING_LINE_3383 */
/* MISSING_LINE_3384 */
/* MISSING_LINE_3385 */
/* MISSING_LINE_3386 */
/* MISSING_LINE_3387 */
/* MISSING_LINE_3388 */
/* MISSING_LINE_3389 */
/* MISSING_LINE_3390 */
/* MISSING_LINE_3391 */
/* MISSING_LINE_3392 */
/* MISSING_LINE_3393 */
/* MISSING_LINE_3394 */
/* MISSING_LINE_3395 */
/* MISSING_LINE_3396 */
/* MISSING_LINE_3397 */
/* MISSING_LINE_3398 */
/* MISSING_LINE_3399 */
/* MISSING_LINE_3400 */
/* MISSING_LINE_3401 */
/* MISSING_LINE_3402 */
/* MISSING_LINE_3403 */
/* MISSING_LINE_3404 */
/* MISSING_LINE_3405 */
/* MISSING_LINE_3406 */
/* MISSING_LINE_3407 */
/* MISSING_LINE_3408 */
/* MISSING_LINE_3409 */
/* MISSING_LINE_3410 */
/* MISSING_LINE_3411 */
/* MISSING_LINE_3412 */
/* MISSING_LINE_3413 */
/* MISSING_LINE_3414 */
/* MISSING_LINE_3415 */
/* MISSING_LINE_3416 */
/* MISSING_LINE_3417 */
/* MISSING_LINE_3418 */
/* MISSING_LINE_3419 */
/* MISSING_LINE_3420 */
/* MISSING_LINE_3421 */
/* MISSING_LINE_3422 */
/* MISSING_LINE_3423 */
/* MISSING_LINE_3424 */
/* MISSING_LINE_3425 */
/* MISSING_LINE_3426 */
/* MISSING_LINE_3427 */
/* MISSING_LINE_3428 */
/* MISSING_LINE_3429 */
/* MISSING_LINE_3430 */
/* MISSING_LINE_3431 */
/* MISSING_LINE_3432 */
/* MISSING_LINE_3433 */
/* MISSING_LINE_3434 */
/* MISSING_LINE_3435 */
/* MISSING_LINE_3436 */
/* MISSING_LINE_3437 */
/* MISSING_LINE_3438 */
/* MISSING_LINE_3439 */
/* MISSING_LINE_3440 */
/* MISSING_LINE_3441 */
/* MISSING_LINE_3442 */
/* MISSING_LINE_3443 */
/* MISSING_LINE_3444 */
/* MISSING_LINE_3445 */
/* MISSING_LINE_3446 */
/* MISSING_LINE_3447 */
/* MISSING_LINE_3448 */
/* MISSING_LINE_3449 */
/* MISSING_LINE_3450 */
/* MISSING_LINE_3451 */
/* MISSING_LINE_3452 */
/* MISSING_LINE_3453 */
/* MISSING_LINE_3454 */
/* MISSING_LINE_3455 */
/* MISSING_LINE_3456 */
/* MISSING_LINE_3457 */
/* MISSING_LINE_3458 */
/* MISSING_LINE_3459 */
/* MISSING_LINE_3460 */
/* MISSING_LINE_3461 */
/* MISSING_LINE_3462 */
/* MISSING_LINE_3463 */
/* MISSING_LINE_3464 */
/* MISSING_LINE_3465 */
/* MISSING_LINE_3466 */
/* MISSING_LINE_3467 */
/* MISSING_LINE_3468 */
/* MISSING_LINE_3469 */
/* MISSING_LINE_3470 */
/* MISSING_LINE_3471 */
/* MISSING_LINE_3472 */
/* MISSING_LINE_3473 */
/* MISSING_LINE_3474 */
/* MISSING_LINE_3475 */
/* MISSING_LINE_3476 */
/* MISSING_LINE_3477 */
/* MISSING_LINE_3478 */
/* MISSING_LINE_3479 */
/* MISSING_LINE_3480 */
/* MISSING_LINE_3481 */
/* MISSING_LINE_3482 */
/* MISSING_LINE_3483 */
/* MISSING_LINE_3484 */
/* MISSING_LINE_3485 */
/* MISSING_LINE_3486 */
/* MISSING_LINE_3487 */
/* MISSING_LINE_3488 */
/* MISSING_LINE_3489 */
/* MISSING_LINE_3490 */
/* MISSING_LINE_3491 */
/* MISSING_LINE_3492 */
/* MISSING_LINE_3493 */
/* MISSING_LINE_3494 */
/* MISSING_LINE_3495 */
/* MISSING_LINE_3496 */
/* MISSING_LINE_3497 */
/* MISSING_LINE_3498 */
/* MISSING_LINE_3499 */
/* MISSING_LINE_3500 */
/* MISSING_LINE_3501 */
/* MISSING_LINE_3502 */
/* MISSING_LINE_3503 */
/* MISSING_LINE_3504 */
/* MISSING_LINE_3505 */
/* MISSING_LINE_3506 */
/* MISSING_LINE_3507 */
/* MISSING_LINE_3508 */
/* MISSING_LINE_3509 */
/* MISSING_LINE_3510 */
/* MISSING_LINE_3511 */
/* MISSING_LINE_3512 */
/* MISSING_LINE_3513 */
/* MISSING_LINE_3514 */
/* MISSING_LINE_3515 */
/* MISSING_LINE_3516 */
/* MISSING_LINE_3517 */
/* MISSING_LINE_3518 */
/* MISSING_LINE_3519 */
/* MISSING_LINE_3520 */
/* MISSING_LINE_3521 */
/* MISSING_LINE_3522 */
/* MISSING_LINE_3523 */
/* MISSING_LINE_3524 */
/* MISSING_LINE_3525 */
/* MISSING_LINE_3526 */
/* MISSING_LINE_3527 */
/* MISSING_LINE_3528 */
/* MISSING_LINE_3529 */
/* MISSING_LINE_3530 */
/* MISSING_LINE_3531 */
/* MISSING_LINE_3532 */
/* MISSING_LINE_3533 */
/* MISSING_LINE_3534 */
/* MISSING_LINE_3535 */
/* MISSING_LINE_3536 */
/* MISSING_LINE_3537 */
/* MISSING_LINE_3538 */
/* MISSING_LINE_3539 */
/* MISSING_LINE_3540 */
/* MISSING_LINE_3541 */
/* MISSING_LINE_3542 */
/* MISSING_LINE_3543 */
/* MISSING_LINE_3544 */
/* MISSING_LINE_3545 */
/* MISSING_LINE_3546 */
/* MISSING_LINE_3547 */
/* MISSING_LINE_3548 */
/* MISSING_LINE_3549 */
/* MISSING_LINE_3550 */
/* MISSING_LINE_3551 */
/* MISSING_LINE_3552 */
/* MISSING_LINE_3553 */
/* MISSING_LINE_3554 */
/* MISSING_LINE_3555 */
/* MISSING_LINE_3556 */
/* MISSING_LINE_3557 */
/* MISSING_LINE_3558 */
/* MISSING_LINE_3559 */
/* MISSING_LINE_3560 */
/* MISSING_LINE_3561 */
/* MISSING_LINE_3562 */
/* MISSING_LINE_3563 */
/* MISSING_LINE_3564 */
/* MISSING_LINE_3565 */
/* MISSING_LINE_3566 */
/* MISSING_LINE_3567 */
/* MISSING_LINE_3568 */
/* MISSING_LINE_3569 */
/* MISSING_LINE_3570 */
/* MISSING_LINE_3571 */
/* MISSING_LINE_3572 */
/* MISSING_LINE_3573 */
/* MISSING_LINE_3574 */
/* MISSING_LINE_3575 */
/* MISSING_LINE_3576 */
/* MISSING_LINE_3577 */
/* MISSING_LINE_3578 */
/* MISSING_LINE_3579 */
/* MISSING_LINE_3580 */
/* MISSING_LINE_3581 */
/* MISSING_LINE_3582 */
/* MISSING_LINE_3583 */
/* MISSING_LINE_3584 */
/* MISSING_LINE_3585 */
/* MISSING_LINE_3586 */
/* MISSING_LINE_3587 */
/* MISSING_LINE_3588 */
/* MISSING_LINE_3589 */
/* MISSING_LINE_3590 */
/* MISSING_LINE_3591 */
/* MISSING_LINE_3592 */
/* MISSING_LINE_3593 */
/* MISSING_LINE_3594 */
/* MISSING_LINE_3595 */
/* MISSING_LINE_3596 */
/* MISSING_LINE_3597 */
/* MISSING_LINE_3598 */
/* MISSING_LINE_3599 */
/* MISSING_LINE_3600 */
/* MISSING_LINE_3601 */
/* MISSING_LINE_3602 */
/* MISSING_LINE_3603 */
/* MISSING_LINE_3604 */
/* MISSING_LINE_3605 */
/* MISSING_LINE_3606 */
/* MISSING_LINE_3607 */
/* MISSING_LINE_3608 */
/* MISSING_LINE_3609 */
/* MISSING_LINE_3610 */
/* MISSING_LINE_3611 */
/* MISSING_LINE_3612 */
/* MISSING_LINE_3613 */
/* MISSING_LINE_3614 */
/* MISSING_LINE_3615 */
/* MISSING_LINE_3616 */
/* MISSING_LINE_3617 */
/* MISSING_LINE_3618 */
/* MISSING_LINE_3619 */
/* MISSING_LINE_3620 */
/* MISSING_LINE_3621 */
/* MISSING_LINE_3622 */
/* MISSING_LINE_3623 */
/* MISSING_LINE_3624 */
/* MISSING_LINE_3625 */
/* MISSING_LINE_3626 */
/* MISSING_LINE_3627 */
/* MISSING_LINE_3628 */
/* MISSING_LINE_3629 */
/* MISSING_LINE_3630 */
/* MISSING_LINE_3631 */
/* MISSING_LINE_3632 */
/* MISSING_LINE_3633 */
/* MISSING_LINE_3634 */
/* MISSING_LINE_3635 */
/* MISSING_LINE_3636 */
/* MISSING_LINE_3637 */
/* MISSING_LINE_3638 */
/* MISSING_LINE_3639 */
/* MISSING_LINE_3640 */
/* MISSING_LINE_3641 */
/* MISSING_LINE_3642 */
/* MISSING_LINE_3643 */
/* MISSING_LINE_3644 */
/* MISSING_LINE_3645 */
/* MISSING_LINE_3646 */
/* MISSING_LINE_3647 */
/* MISSING_LINE_3648 */
/* MISSING_LINE_3649 */
/* MISSING_LINE_3650 */
/* MISSING_LINE_3651 */
/* MISSING_LINE_3652 */
/* MISSING_LINE_3653 */
/* MISSING_LINE_3654 */
/* MISSING_LINE_3655 */
/* MISSING_LINE_3656 */

    if (user.agencyLevel >= invite.level) return res.status(400).json({ error: 'Báº¡n Ä‘Ã£ Ä‘áº¡t cáº¥p Ä‘á»™ nÃ y hoáº·c cao hÆ¡n' });

    if (invite.usageLeft > 0) {
      await prisma.agencyInviteLink.update({ where: { id: invite.id }, data: { usageLeft: invite.usageLeft - 1 } });
    }

    await prisma.user.update({ where: { id: user.id }, data: { agencyLevel: invite.level } });
    res.json({ success: true, level: invite.level });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
app.post('/api/user/upgrade-agency', authenticateToken, async (req, res) => {
  try {
    const { targetLevel } = req.body;
    const user = await prisma.user.findUnique({ where: { id: res.locals.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    if (user.agencyLevel >= targetLevel) {
      return res.status(400).json({ error: 'Báº¡n Ä‘Ã£ Ä‘áº¡t cáº¥p Ä‘á»™ nÃ y hoáº·c cao hÆ¡n!' });
    }

    const config = await prisma.agencyUpgradeConfig.findUnique({ where: { level: targetLevel } });
    if (!config) return res.status(400).json({ error: 'Cáº¥p Ä‘á»™ khÃ´ng tá»“n táº¡i' });

    if (user.balance < config.price) {
      return res.status(400).json({ error: 'Sá»‘ dÆ° khÃ´ng Ä‘á»§ Ä‘á»ƒ nÃ¢ng cáº¥p' });
    }

    // Deduct balance and upgrade
    await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { decrement: config.price },
        agencyLevel: targetLevel
      }
    });

/* MISSING_LINE_3696 */
/* MISSING_LINE_3697 */
/* MISSING_LINE_3698 */
/* MISSING_LINE_3699 */
/* MISSING_LINE_3700 */
/* MISSING_LINE_3701 */
/* MISSING_LINE_3702 */
/* MISSING_LINE_3703 */
/* MISSING_LINE_3704 */
/* MISSING_LINE_3705 */
/* MISSING_LINE_3706 */
/* MISSING_LINE_3707 */
/* MISSING_LINE_3708 */
/* MISSING_LINE_3709 */
/* MISSING_LINE_3710 */
/* MISSING_LINE_3711 */
/* MISSING_LINE_3712 */
/* MISSING_LINE_3713 */
/* MISSING_LINE_3714 */
/* MISSING_LINE_3715 */
/* MISSING_LINE_3716 */
/* MISSING_LINE_3717 */
/* MISSING_LINE_3718 */
/* MISSING_LINE_3719 */
/* MISSING_LINE_3720 */
/* MISSING_LINE_3721 */
