const fs = require('fs');

let content = fs.readFileSync('d:/TQMEDIA/backend/src/server.ts', 'utf8');

// 1. Remove the old `if (inviteCode)` block from `/api/auth/reset-password`
content = content.replace(/let agencyLevel = 0;[\s\S]*?const hashedPassword = await bcrypt\.hash\(password, 10\);/, 'const hashedPassword = await bcrypt.hash(password, 10);');

// 2. Add inviteCode handling to `/api/auth/register`
content = content.replace(
  /const existing = await prisma\.user\.findUnique\(\{ where: \{ email \} \}\)\s*if \(existing\).*?\n\n\s*const hashedPassword = await bcrypt\.hash\(password, 10\)\n\s*const newUser = await prisma\.user\.create\(\{\n\s*data: \{ name, email, password: hashedPassword, role: 'GUEST', isEmailVerified: false, agencyLevel: 0 \}\n\s*\}\)/,
  `const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email đã tồn tại' })

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

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'GUEST', isEmailVerified: false, agencyLevel: finalAgencyLevel }
    })`
);

// 3. Add inviteCode handling to `/api/auth/login`
content = content.replace(
  /const { email, password } = req\.body\n\s*if \(!email \|\| !password\) return res\.status\(400\)\.json\(\{.*?\n\n\s*const user = await prisma\.user\.findUnique\(\{ where: \{ email \} \}\)/,
  `const { email, password, inviteCode } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin' })

    let user = await prisma.user.findUnique({ where: { email } })`
);

content = content.replace(
  /const token = jwt\.sign\(\{ id: user\.id, role: user\.role \}, JWT_SECRET, \{ expiresIn: '7d' \}\)\n\s*res\.json\(\{ success: true, token, user: \{ id: user\.id, name: user\.name, email: user\.email, role: user\.role, agencyLevel: user\.agencyLevel, balance: user\.balance \} \}\)/,
  `let upgradedLevel = null;
    if (inviteCode) {
      const invite = await prisma.agencyInviteLink.findUnique({ where: { code: inviteCode } });
      if (invite && invite.usageLeft !== 0 && user.agencyLevel < invite.level) {
        upgradedLevel = invite.level;
        if (invite.usageLeft > 0) {
          await prisma.agencyInviteLink.update({
            where: { id: invite.id },
            data: { usageLeft: invite.usageLeft - 1 }
          });
        }
        await prisma.user.update({
          where: { id: user.id },
          data: { agencyLevel: invite.level }
        });
        user.agencyLevel = invite.level;
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, token, upgradedLevel, user: { id: user.id, name: user.name, email: user.email, role: user.role, agencyLevel: user.agencyLevel, balance: user.balance } })`
);

// 4. Also handle inviteCode during verify-login-email just in case we need to show popup (already done in frontend based on user.agencyLevel)

fs.writeFileSync('d:/TQMEDIA/backend/src/server.ts', content, 'utf8');
console.log('Done modifying server.ts with Regex!');
