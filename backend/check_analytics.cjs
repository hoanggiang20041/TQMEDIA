const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const notAdminUserFilter = { user: { role: { not: 'ADMIN' } } };

  const recentOrders = await prisma.order.findMany({ 
    where: { status: { not: 'cancelled' }, ...notAdminUserFilter },
    select: { id: true, totalNum: true, profit: true, createdAt: true, userId: true }
  });
  const orderRevenue = recentOrders.reduce((sum, o) => sum + (o.totalNum || 0), 0);
  console.log('Order Revenue:', orderRevenue);

  const enrollments = await prisma.enrollment.findMany({
    where: { ...notAdminUserFilter },
    include: { course: { select: { salePrice: true } } }
  });
  const courseRevenue = enrollments.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  console.log('Course Revenue:', courseRevenue);

  const recentResourceOrders = await prisma.resourceOrder.findMany({
    where: { ...notAdminUserFilter },
    select: { totalAmount: true, totalImportAmount: true, createdAt: true }
  });
  const resourceRevenue = recentResourceOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  console.log('Resource Revenue:', resourceRevenue);

  console.log('Total Income:', orderRevenue + courseRevenue + resourceRevenue);
}

run().finally(() => prisma.$disconnect());
