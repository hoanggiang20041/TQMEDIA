const fs = require('fs');

async function fix() {
  const bePath = 'src/server.ts';
  let beContent = fs.readFileSync(bePath, 'utf8');

  // 1. Fix `/api/enrollments/progress`
  const progressApiRegex = /app\.put\('\/api\/enrollments\/progress', authenticateToken, async \(req, res\) => \{[\s\S]*?res\.status\(400\)\.json\(\{ success: false, error: err\.message \}\);\s*\}\s*\}\);/;
  const progressApiMatch = beContent.match(progressApiRegex);
  if (progressApiMatch) {
    const newProgressApi = `app.put('/api/enrollments/progress', authenticateToken, async (req: Request, res: Response) => {
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
});`;
    beContent = beContent.replace(progressApiRegex, newProgressApi);
  }

  // Helper function to insert before `app.listen`
  function addApi(apiCode) {
    if (!beContent.includes(apiCode.split('\\n')[0])) {
      const listenIndex = beContent.lastIndexOf('app.listen(');
      beContent = beContent.slice(0, listenIndex) + apiCode + '\\n\\n' + beContent.slice(listenIndex);
    }
  }

  // 2. Add Missing `POST /api/courses/:id/enroll`
  const courseEnrollApi = `
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
      
      // 1. Apply Voucher (already validated and passed as discount amount from frontend, or we validate here)
      // Since frontend sends discount amount, we subtract it:
      actualPrice = Math.max(0, actualPrice - (discount || 0));

      // 2. Apply Agency Discount
      if (user.agencyLevel > 0) {
        const agencyDiscount = await tx.agencyDiscount.findFirst({
          where: { agencyLevel: user.agencyLevel, itemType: 'COURSE', itemId: { in: [course.id, '*'] } },
          orderBy: { discountPercent: 'desc' }
        });
        if (agencyDiscount) {
          actualPrice = Math.max(0, actualPrice * (1 - agencyDiscount.discountPercent / 100));
        }
      }

      if (user.balance < actualPrice) {
        throw new Error('Số dư không đủ. Vui lòng nạp thêm tiền.');
      }

      // Deduct balance
      await tx.user.update({
        where: { id: userId },
        data: { balance: user.balance - actualPrice }
      });

      const orderId = \`#CRS-\${Math.floor(1000 + Math.random() * 9000)}\`;
      const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

      await tx.transaction.create({
        data: {
          id: orderId,
          userId,
          type: 'TRỪ TIỀN',
          amount: \`-\${fmt(actualPrice)} đ\`,
          balance: \`\${fmt(user.balance - actualPrice)} đ\`,
          desc: \`Mua khóa học: \${course.title}\`,
          typeClass: 'text-red-400 bg-red-400/10 border-red-400/30'
        }
      });

      await tx.enrollment.create({
        data: {
          courseId: id,
          userId,
          completedCurriculumIndexes: '[]',
          totalAmount: actualPrice,
          totalImportAmount: 0 // Optional: if courses have import cost
        }
      });
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
`;
  if (!beContent.includes("app.post('/api/courses/:id/enroll'")) {
    addApi(courseEnrollApi);
  }

  // 3. Fix POST /api/orders (Services)
  const ordersApiStartStr = "app.post('/api/orders', authenticateToken, async (req, res) => {";
  const ordersApiEndStr = "res.json({ success: true, orderId })\\n    } catch (err: any) {\\n      res.status(400).json({ error: err.message })\\n    }\\n  })";
  const ordersApiStartIndex = beContent.indexOf(ordersApiStartStr);
  const ordersApiEndIndex = beContent.indexOf(ordersApiEndStr, ordersApiStartIndex);

  if (ordersApiStartIndex !== -1 && ordersApiEndIndex !== -1) {
    const originalOrdersApi = beContent.substring(ordersApiStartIndex, ordersApiEndIndex + ordersApiEndStr.length);
    
    let newOrdersApi = originalOrdersApi.replace(
      "const { platform, serviceType, serverId, serverName, target, quantity, total, note, voucherCode, discount = 0 } = req.body",
      "const { platform, serviceType, serverId, serverName, target, quantity, total: frontendTotal, note, voucherCode, discount = 0 } = req.body"
    );

    newOrdersApi = newOrdersApi.replace(
      "if (user.balance < total) {",
      `let total = server.price * quantity;
        
        if (voucherCode) {
          const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
          if (voucher && voucher.isActive && voucher.validTo >= new Date() && voucher.validFrom <= new Date() && (!voucher.usageLimit || voucher.usedCount < voucher.usageLimit)) {
             if (voucher.discountType === 'PERCENTAGE') {
                 total = Math.max(0, total * (1 - voucher.discountValue / 100));
             } else {
                 total = Math.max(0, total - voucher.discountValue);
             }
          }
        }
        
        if (user.agencyLevel > 0) {
          const agencyDiscount = await tx.agencyDiscount.findFirst({
            where: { agencyLevel: user.agencyLevel, itemType: 'SERVICE', itemId: { in: [server.id, '*'] } },
            orderBy: { discountPercent: 'desc' }
          });
          if (agencyDiscount) {
            total = Math.max(0, total * (1 - agencyDiscount.discountPercent / 100));
          }
        }
        
        if (user.balance < total) {`
    );

    beContent = beContent.replace(originalOrdersApi, newOrdersApi);
  }

  // 4. Fix POST /api/resources/:id/buy
  const resourcesApiStartStr = "app.post('/api/resources/:id/buy', authenticateToken, async (req, res) => {";
  const resourcesApiEndStr = "res.json({ success: true, orderId: resourceOrder.id });\\n    } catch (err: any) {\\n      res.status(400).json({ error: err.message });\\n    }\\n  });";
  const resourcesApiStartIndex = beContent.indexOf(resourcesApiStartStr);
  const resourcesApiEndIndex = beContent.indexOf(resourcesApiEndStr, resourcesApiStartIndex);

  if (resourcesApiStartIndex !== -1 && resourcesApiEndIndex !== -1) {
    const originalResourcesApi = beContent.substring(resourcesApiStartIndex, resourcesApiEndIndex + resourcesApiEndStr.length);
    
    let newResourcesApi = originalResourcesApi.replace(
      "if (user.balance < totalAmount) {",
      `let calculatedTotal = variant.price * quantity;
      
      if (user.agencyLevel > 0) {
        const agencyDiscount = await tx.agencyDiscount.findFirst({
          where: { agencyLevel: user.agencyLevel, itemType: 'RESOURCE', itemId: { in: [resource.id, '*'] } },
          orderBy: { discountPercent: 'desc' }
        });
        if (agencyDiscount) {
          calculatedTotal = Math.max(0, calculatedTotal * (1 - agencyDiscount.discountPercent / 100));
        }
      }
      
      let totalAmount = calculatedTotal; // Override the calculated total
      if (user.balance < totalAmount) {`
    );

    beContent = beContent.replace(originalResourcesApi, newResourcesApi);
  }

  // 5. Fix POST /api/auth/register for refCode and check milestone
  const registerApiStartStr = "app.post('/api/auth/register', verifyTurnstile, async (req: Request, res: Response) => {";
  const registerApiEndStr = "})\\n\\n  app.post('/api/auth/login'";
  const registerApiStartIndex = beContent.indexOf(registerApiStartStr);
  const registerApiEndIndex = beContent.indexOf(registerApiEndStr, registerApiStartIndex);

  if (registerApiStartIndex !== -1 && registerApiEndIndex !== -1) {
    const originalRegisterApi = beContent.substring(registerApiStartIndex, registerApiEndIndex + 2);
    
    let newRegisterApi = originalRegisterApi.replace(
      "const { name, email, password } = req.body",
      "const { name, email, password, ref } = req.body"
    );

    newRegisterApi = newRegisterApi.replace(
      "data: { name, email, password: hashedPassword, role: 'GUEST', isEmailVerified: false }",
      "data: { name, email, password: hashedPassword, role: 'GUEST', isEmailVerified: false, referredBy: ref ? { connect: { referralCode: ref } } : undefined }"
    );
    
    const tokenGenCode = "const tempToken = jwt.sign({ id: newUser.id, pendingEmail: true }, JWT_SECRET, { expiresIn: '15m' })";
    
    newRegisterApi = newRegisterApi.replace(
      tokenGenCode,
      `${tokenGenCode}
      
      // Process Referral Milestone Reward
      if (newUser.referredById) {
        const settings = await (prisma as any).setting.findMany({
          where: { key: { in: ['affiliate_enabled', 'affiliate_milestone_count', 'affiliate_milestone_reward'] } }
        });
        const sMap = settings.reduce((acc: any, s: any) => ({ ...acc, [s.key]: s.value }), {});
        
        if (sMap['affiliate_enabled'] !== 'false') {
          const milestoneCount = parseInt(sMap['affiliate_milestone_count'] || '3');
          const milestoneReward = parseInt(sMap['affiliate_milestone_reward'] || '50000');
          
          const totalValidReferrals = await (prisma as any).user.count({ where: { referredById: newUser.referredById } });
          
          if (totalValidReferrals > 0 && totalValidReferrals % milestoneCount === 0) {
            await (prisma as any).referralReward.create({
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
      }`
    );

    beContent = beContent.replace(originalRegisterApi, newRegisterApi);
  }

  fs.writeFileSync(bePath, beContent, 'utf8');
  console.log("Patched server.ts successfully");
}

fix();
