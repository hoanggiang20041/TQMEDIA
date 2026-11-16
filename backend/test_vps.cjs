const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const enrollments = await prisma.enrollment.findMany({
    where: { createdAt: { gte: today }, user: { role: { not: 'ADMIN' } } },
    include: { user: true, course: true }
  });
  console.log('Today enrollments:', enrollments.map(e => ({ id: e.id, totalAmount: e.totalAmount, user: e.user?.email })));

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: today }, user: { role: { not: 'ADMIN' } } },
    include: { user: true }
  });
  console.log('Today orders:', orders.map(o => ({ id: o.id, totalNum: o.totalNum, user: o.user?.email })));

  const resourceOrders = await prisma.resourceOrder.findMany({
    where: { createdAt: { gte: today }, user: { role: { not: 'ADMIN' } } },
    include: { user: true }
  });
  console.log('Today resource orders:', resourceOrders.map(o => ({ id: o.id, totalAmount: o.totalAmount, user: o.user?.email })));

  // test 30 days
  const dateUpperLimit = new Date();
  const dateLimit = new Date(dateUpperLimit);
  dateLimit.setDate(dateLimit.getDate() - 30);
  
  const enrollments30 = await prisma.enrollment.findMany({
    where: { createdAt: { gte: dateLimit, lt: dateUpperLimit }, user: { role: { not: 'ADMIN' } } }
  });
  console.log('30 days enrollments count:', enrollments30.length);
}
main();
