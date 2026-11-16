const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({ include: { user: true } });
  let orderRevenue = 0;
  orders.forEach(o => { if(o.user?.role !== 'ADMIN') orderRevenue += o.totalNum; });

  const enrollments = await prisma.enrollment.findMany({ include: { course: true, user: true } });
  let courseRevenue = 0;
  enrollments.forEach(e => { if(e.user?.role !== 'ADMIN') courseRevenue += e.totalAmount; });

  const resourceOrders = await prisma.resourceOrder.findMany({ include: { user: true } });
  let resourceRevenue = 0;
  resourceOrders.forEach(o => { if(o.user?.role !== 'ADMIN') resourceRevenue += o.totalAmount; });

  console.log('Total non-admin order revenue:', orderRevenue);
  console.log('Total non-admin course revenue:', courseRevenue);
  console.log('Total non-admin resource revenue:', resourceRevenue);
  console.log('Total Income:', orderRevenue + courseRevenue + resourceRevenue);
}
main();
