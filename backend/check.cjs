const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const notAdminFilter = { user: { role: { not: 'ADMIN' } } };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = await prisma.order.findMany({
    where: { status: { not: 'cancelled' }, createdAt: { gte: today }, ...notAdminFilter },
    select: { totalNum: true, id: true, userId: true }
  });
  console.log('Today orders:', todayOrders);

  const todayEnrollments = await prisma.enrollment.findMany({
    where: { createdAt: { gte: today }, ...notAdminFilter },
    include: { course: { select: { salePrice: true, title: true } }, user: true }
  });
  console.log('Today enrollments:', todayEnrollments.map(e => ({ id: e.id, price: e.course?.salePrice, title: e.course?.title })));

  const todayResourceOrders = await prisma.resourceOrder.findMany({
    where: { createdAt: { gte: today }, ...notAdminFilter },
    select: { totalAmount: true, id: true }
  });
  console.log('Today resource orders:', todayResourceOrders);
}

run().finally(() => prisma.$disconnect());
