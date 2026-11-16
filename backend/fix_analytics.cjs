const fs = require('fs');
let content = fs.readFileSync('d:/TQMEDIA/backend/src/server.ts', 'utf8');

// Undo the damage in dashboard-stats
const badCode = `    const allOrders = await (prisma as any).order.findMany({ where: { status: 'completed' }, select: { totalNum: true } });
    const allEnrollments = await (prisma as any).enrollment.findMany({ include: { course: { select: { salePrice: true } } } });
    const allResourceOrders = await (prisma as any).resourceOrder.findMany({ select: { totalAmount: true } });
    
    const totalIncome = allOrders.reduce((s: number, o: any) => s + (o.totalNum || 0), 0) +
                        allEnrollments.reduce((s: number, e: any) => s + (e.course?.salePrice || 0), 0) +
                        allResourceOrders.reduce((s: number, r: any) => s + (r.totalAmount || 0), 0);

    const totalProfit = totalIncome * 0.9; // Assume 10% cost for example

    res.json({
      totalUsers,
      totalBalances,
      totalOrders,
      totalIncome,
      totalProfit,
      todayIncome,
      totalDeposited`;

const goodCode = `    res.json({
      totalUsers,
      totalBalances: totalBalance,
      totalOrders,
      todayIncome,
      totalDeposited`;

// I will manually fix the dashboard-stats by regex replacing the whole block
content = content.replace(/const allOrders = await \(prisma as any\)\.order\.findMany.*?totalDeposited/s, goodCode);

// Now fix the analytics payload
const analyticsPayloadOriginal = `        totalIncome,
        totalUsers: currentUsers,
        totalBalance,
        totalOrders`;

const analyticsPayloadNew = `        totalIncome,
        totalProfit,
        totalUsers: currentUsers,
        totalBalance,
        totalOrders`;

// Replace specifically inside the res.json({ success: true, stats: { ... } }) of analytics
content = content.replace(
  /stats: \{\n\s*totalDeposited,\n\s*totalIncome,\n\s*totalUsers: currentUsers,\n\s*totalBalance,\n\s*totalOrders\n\s*\}/,
  `stats: {
        totalDeposited,
        totalIncome,
        totalProfit,
        totalUsers: currentUsers,
        totalBalance,
        totalOrders
      }`
);

fs.writeFileSync('d:/TQMEDIA/backend/src/server.ts', content, 'utf8');
console.log('Fixed!');
