const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  const totalBalance = users.reduce((sum, u) => sum + u.balance, 0);

  const txs = await prisma.transaction.findMany();
  let totalDeposited = 0;
  let adminDeducted = 0;
  let totalSpent = 0;
  let totalRefunded = 0;

  for (const t of txs) {
    if (t.type === 'CỘNG TIỀN') totalDeposited += Number(t.amount.replace(/[^\d-]/g, ''));
    if (t.type === 'TRỪ TIỀN' && t.desc.includes('Admin trừ')) adminDeducted += Math.abs(Number(t.amount.replace(/[^\d-]/g, '')));
    if (t.type === 'TRỪ TIỀN' && !t.desc.includes('Admin trừ')) totalSpent += Math.abs(Number(t.amount.replace(/[^\d-]/g, '')));
    if (t.type === 'HOÀN TIỀN') totalRefunded += Number(t.amount.replace(/[^\d-]/g, ''));
  }

  const orders = await prisma.order.findMany();
  const orderSpent = orders.reduce((sum, o) => sum + o.totalNum, 0);

  const enrolls = await prisma.enrollment.findMany({ include: { course: true }});
  const enrollSpent = enrolls.reduce((sum, e) => sum + e.course.salePrice, 0);

  const resourceOrders = await prisma.resourceOrder.findMany();
  const resSpent = resourceOrders.reduce((sum, r) => sum + r.totalAmount, 0);

  console.log({
    calculatedTotalBalance: totalDeposited - totalSpent - adminDeducted + totalRefunded,
    actualTotalBalance: totalBalance,
    txTotalDeposited: totalDeposited,
    txTotalSpent: totalSpent,
    txAdminDeducted: adminDeducted,
    txTotalRefunded: totalRefunded,
    orderSpent,
    enrollSpent,
    resSpent,
    sumOfSpentRecords: orderSpent + enrollSpent + resSpent
  });
}
check();
