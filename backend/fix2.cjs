const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

// Inject Secret Key
if(!code.includes('TURNSTILE_SECRET_KEY')) {
  code = code.replace(
    /const SEPAY_API_TOKEN = process.env.SEPAY_API_TOKEN \|\| 'your_sepay_token_here'/,
    `const SEPAY_API_TOKEN = process.env.SEPAY_API_TOKEN || 'your_sepay_token_here'
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'`
  );
}

// Inject Middleware
if(!code.includes('verifyTurnstile')) {
  const mwCode = `
const verifyTurnstile = async (req, res, next) => {
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
`
  code = code.replace('// --- AUTH ROUTES ---', mwCode + '\n// --- AUTH ROUTES ---');
}

// Attach to /api/auth/login
code = code.replace(/app.post\('\/api\/auth\/login', async \(req, res\) => \{/, "app.post('/api/auth/login', verifyTurnstile, async (req, res) => {");

// Attach to /api/auth/send-otp
code = code.replace(/app.post\('\/api\/auth\/send-otp', async \(req, res\) => \{/, "app.post('/api/auth/send-otp', verifyTurnstile, async (req, res) => {");

fs.writeFileSync('src/server.ts', code);
console.log('Backend Updated');
