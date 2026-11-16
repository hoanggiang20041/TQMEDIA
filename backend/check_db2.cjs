const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({ include: { user: true } });
  let sum = 0;
  orders.forEach(o => {
    if(o.user?.role !== 'ADMIN') {
      console.log('Non-admin Order:', o.totalNum, o.user?.email);
      sum += o.totalNum;
    }
  });

  const enrollments = await prisma.enrollment.findMany({ include: { course: true, user: true } });
  enrollments.forEach(e => {
    if(e.user?.role !== 'ADMIN') {
      console.log('Non-admin Course:', e.totalAmount, e.user?.email);
      sum += e.totalAmount;
    }
  });

  const resourceOrders = await prisma.resourceOrder.findMany({ include: { user: true } });
  resourceOrders.forEach(o => {
    if(o.user?.role !== 'ADMIN') {
      console.log('Non-admin Resource:', o.totalAmount, o.user?.email);
      sum += o.totalAmount;
    }
  });

  console.log('Total non-admin Income:', sum);
}
main().finally(() => prisma.$disconnect());
