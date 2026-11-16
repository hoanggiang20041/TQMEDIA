const fs = require('fs');

let content = fs.readFileSync('d:/TQMEDIA/backend/src/server.ts', 'utf8');

// 1. Remove the old `if (inviteCode)` block from `/api/auth/reset-password`
const oldInviteBlock = `    let agencyLevel = 0;
    if (inviteCode) {
      const invite = await prisma.agencyInviteLink.findUnique({ where: { code: inviteCode } });
      if (invite && invite.usageLeft !== 0) {
        agencyLevel = invite.level;
        if (invite.usageLeft > 0) {
          await prisma.agencyInviteLink.update({
            where: { id: invite.id },
            data: { usageLeft: invite.usageLeft - 1 }
          });
        }
      }
    }`;

content = content.replace(oldInviteBlock, '');

// 2. Add inviteCode handling to `/api/auth/register`
const oldRegister = `    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email đã được sử dụng' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'GUEST', isEmailVerified: false, agencyLevel: 0 }
    })`;

const newRegister = `    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email đã được sử dụng' })

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
    })`;

content = content.replace(oldRegister, newRegister);

// 3. Add inviteCode handling to `/api/auth/login`
const oldLoginBody = `    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin' })

    const user = await prisma.user.findUnique({ where: { email } })`;

const newLoginBody = `    const { email, password, inviteCode } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin' })

    let user = await prisma.user.findUnique({ where: { email } })`;
    
content = content.replace(oldLoginBody, newLoginBody);

const oldLoginSuccess = `    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, agencyLevel: user.agencyLevel, balance: user.balance } })`;

const newLoginSuccess = `    let upgradedLevel = null;
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
    res.json({ success: true, token, upgradedLevel, user: { id: user.id, name: user.name, email: user.email, role: user.role, agencyLevel: user.agencyLevel, balance: user.balance } })`;

content = content.replace(oldLoginSuccess, newLoginSuccess);

fs.writeFileSync('d:/TQMEDIA/backend/src/server.ts', content, 'utf8');
console.log('Done modifying server.ts');
