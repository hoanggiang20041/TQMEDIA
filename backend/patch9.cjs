const fs = require('fs');

async function fix() {
  const bePath = 'src/server.ts';
  let beContent = fs.readFileSync(bePath, 'utf8');

  // 1. Add missing APIs
  const missingApis = `
app.get('/api/user/agency-upgrade-config', authenticateToken, async (req, res) => {
  try {
    const userId = res.locals.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const config = await (prisma as any).agencyUpgradeConfig.findMany({ orderBy: { level: 'asc' } });
    res.json({ success: true, config, currentLevel: user.agencyLevel || 0, balance: user.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/upgrade-agency', authenticateToken, async (req, res) => {
  try {
    const { targetLevel } = req.body;
    const userId = res.locals.userId;
    
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');
      
      if ((user.agencyLevel || 0) >= targetLevel) {
        throw new Error('Bạn đã ở cấp độ này hoặc cao hơn');
      }
      
      const config = await (tx as any).agencyUpgradeConfig.findUnique({ where: { level: targetLevel } });
      if (!config) throw new Error('Cấu hình cấp độ không tồn tại');
      
      if (user.balance < config.price) {
        throw new Error('Số dư không đủ để nâng cấp');
      }
      
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: user.balance - config.price,
          agencyLevel: targetLevel
        }
      });
      
      await (tx as any).transaction.create({
        data: {
          userId,
          amount: -config.price,
          balanceAfter: user.balance - config.price,
          type: 'TRỪ TIỀN',
          desc: \`Thanh toán nâng cấp Đại lý Cấp \${targetLevel}\`
        }
      });
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/enrollments/progress', authenticateToken, async (req, res) => {
  try {
    const { courseId, completedIndexes } = req.body;
    const userId = res.locals.userId;
    
    const updated = await (prisma as any).enrollment.update({
      where: { courseId_userId: { courseId, userId } },
      data: {
        completedCurriculumIndexes: JSON.stringify(completedIndexes)
      }
    });
    res.json({ success: true, enrollment: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
`;

  if (!beContent.includes('/api/user/agency-upgrade-config')) {
    const listenIndex = beContent.lastIndexOf('app.listen(');
    beContent = beContent.slice(0, listenIndex) + missingApis + '\n' + beContent.slice(listenIndex);
  }

  // 2. Fix Analytics date filter
  const startIndex = beContent.indexOf("app.get('/api/admin/analytics'");
  const nextApiIndex = beContent.indexOf("app.get('/api/courses'", startIndex);
  
  if (startIndex !== -1 && nextApiIndex !== -1) {
    const originalAnalyticsBlock = beContent.substring(startIndex, nextApiIndex);
    
    let newAnalyticsBlock = originalAnalyticsBlock;
    
    // Replace the date calculation logic
    const oldDateLogicRegex = /const days = parseInt\(req\.query\.days as string\) \|\| 30;[\s\S]*?(?=\/\/ Filter condition for NOT ADMIN)/;
    const newDateLogic = `
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

      const dateFilter = { gte: dateLimit };
      if (dateUpperLimit) dateFilter.lt = dateUpperLimit;
      
      const prevDateFilter = { gte: prevDateLimit, lt: dateLimit };

      `;
    newAnalyticsBlock = newAnalyticsBlock.replace(oldDateLogicRegex, newDateLogic);

    // Replace all instances of `createdAt: { gte: dateLimit }` with `createdAt: dateFilter`
    newAnalyticsBlock = newAnalyticsBlock.replace(/createdAt:\s*\{\s*gte:\s*dateLimit\s*\}/g, 'createdAt: dateFilter');
    // Replace all instances of `createdAt: { gte: prevDateLimit, lt: dateLimit }` with `createdAt: prevDateFilter`
    newAnalyticsBlock = newAnalyticsBlock.replace(/createdAt:\s*\{\s*gte:\s*prevDateLimit,\s*lt:\s*dateLimit\s*\}/g, 'createdAt: prevDateFilter');
    
    // Oh wait, there is also: `const prevDateLimit = new Date(dateLimit); prevDateLimit.setDate(prevDateLimit.getDate() - days);`
    // I need to remove that because I already defined it in newDateLogic
    const oldPrevDateLogicRegex = /const prevDateLimit = new Date\(dateLimit\);\s*prevDateLimit\.setDate\(prevDateLimit\.getDate\(\) - days\);\s*/;
    newAnalyticsBlock = newAnalyticsBlock.replace(oldPrevDateLogicRegex, '');
    
    beContent = beContent.substring(0, startIndex) + newAnalyticsBlock + beContent.substring(nextApiIndex);
  }

  fs.writeFileSync(bePath, beContent, 'utf8');
  console.log("Patched server.ts successfully");
}

fix();
