const fs = require('fs');

async function fix() {
  const bePath = 'src/server.ts';
  let beContent = fs.readFileSync(bePath, 'utf8');

  // 1. Fix POST /api/orders
  const ordersTarget = `      if (user.balance < total) {
        throw new Error('Số dư không đủ. Vui lòng nạp thêm tiền.')
      }

      // Check voucher if present
      if (voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
        if (!voucher || !voucher.isActive) throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
        if (voucher.validTo < new Date() || voucher.validFrom > new Date()) throw new Error('Mã giảm giá ngoài thời gian hiệu lực.');
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new Error('Mã giảm giá đã hết lượt sử dụng.');
        
        await tx.voucher.update({
          where: { code: voucherCode },
          data: { usedCount: voucher.usedCount + 1 }
        });
      }`;
      
  const ordersReplacement = `      let calculatedTotal = server.price * quantity;

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

      if (user.agencyLevel > 0) {
        const agencyDiscount = await tx.agencyDiscount.findFirst({
          where: { agencyLevel: user.agencyLevel, itemType: 'SERVICE', itemId: { in: [server.id, '*'] } },
          orderBy: { discountPercent: 'desc' }
        });
        if (agencyDiscount) {
          calculatedTotal = Math.max(0, calculatedTotal * (1 - agencyDiscount.discountPercent / 100));
        }
      }

      total = calculatedTotal;

      if (user.balance < total) {
        throw new Error('Số dư không đủ. Vui lòng nạp thêm tiền.')
      }`;
  beContent = beContent.replace(ordersTarget, ordersReplacement);


  // 2. Fix POST /api/resources/:id/buy
  const resourcesTarget = `      let totalAmount = resource.price * quantity;

      if (voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
        if (!voucher || !voucher.isActive) throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
        if (voucher.validTo < new Date() || voucher.validFrom > new Date()) throw new Error('Mã giảm giá ngoài thời gian hiệu lực.');
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new Error('Mã giảm giá đã hết lượt sử dụng.');
        
        await tx.voucher.update({
          where: { code: voucherCode },
          data: { usedCount: voucher.usedCount + 1 }
        });
        
        totalAmount = Math.max(0, totalAmount - Number(discount));
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Không tìm thấy user');
      if (user.balance < totalAmount) throw new Error('Số dư không đủ');`;
      
  const resourcesReplacement = `      let totalAmount = resource.price * quantity;

      if (voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
        if (!voucher || !voucher.isActive) throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
        if (voucher.validTo < new Date() || voucher.validFrom > new Date()) throw new Error('Mã giảm giá ngoài thời gian hiệu lực.');
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new Error('Mã giảm giá đã hết lượt sử dụng.');
        
        await tx.voucher.update({
          where: { code: voucherCode },
          data: { usedCount: voucher.usedCount + 1 }
        });
        
        if (voucher.discountType === 'PERCENTAGE') {
          totalAmount = Math.max(0, totalAmount * (1 - voucher.discountValue / 100));
        } else {
          totalAmount = Math.max(0, totalAmount - voucher.discountValue);
        }
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Không tìm thấy user');

      if (user.agencyLevel > 0) {
        const agencyDiscount = await tx.agencyDiscount.findFirst({
          where: { agencyLevel: user.agencyLevel, itemType: 'RESOURCE', itemId: { in: [resource.id, '*'] } },
          orderBy: { discountPercent: 'desc' }
        });
        if (agencyDiscount) {
          totalAmount = Math.max(0, totalAmount * (1 - agencyDiscount.discountPercent / 100));
        }
      }

      if (user.balance < totalAmount) throw new Error('Số dư không đủ');`;
  beContent = beContent.replace(resourcesTarget, resourcesReplacement);

  // 3. Fix POST /api/auth/register
  const registerTarget = `app.post('/api/auth/register', verifyTurnstile, async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email đã được sử dụng' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'GUEST', isEmailVerified: false }
    })

    await sendVerificationEmail(newUser.id, newUser.email, newUser.name)

    const tempToken = jwt.sign({ id: newUser.id, pendingEmail: true }, JWT_SECRET, { expiresIn: '15m' })
    res.json({ success: true, requireEmailVerification: true, tempToken })
  } catch (err) {
    console.error('Register Error:', err)
    res.status(500).json({ error: 'Lỗi server' })
  }
})`;
  
  const registerReplacement = `app.post('/api/auth/register', verifyTurnstile, async (req: Request, res: Response) => {
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
          await prisma.referralReward.create({
            data: {
              referrerId: newUser.referredById,
              referredUserId: newUser.id,
              amount: milestoneReward,
              type: 'MILESTONE',
              description: \`Thưởng mốc \${totalValidReferrals} lượt giới thiệu thành công\`,
              status: 'PENDING'
            }
          });
        }
      }
    }

    await sendVerificationEmail(newUser.id, newUser.email, newUser.name)

    const tempToken = jwt.sign({ id: newUser.id, pendingEmail: true }, JWT_SECRET, { expiresIn: '15m' })
    res.json({ success: true, requireEmailVerification: true, tempToken })
  } catch (err) {
    console.error('Register Error:', err)
    res.status(500).json({ error: 'Lỗi server' })
  }
})`;
  beContent = beContent.replace(registerTarget, registerReplacement);

  fs.writeFileSync(bePath, beContent, 'utf8');
  console.log("Patched server.ts successfully");
}

fix();
