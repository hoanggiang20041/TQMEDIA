const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: u.id },
      include: { course: true }
    });
    const cInc = enrollments.reduce((sum, e) => sum + (e.course?.salePrice || 0), 0);
    
    const orders = await prisma.order.findMany({
      where: { userId: u.id, status: { not: 'cancelled' } }
    });
    const oInc = orders.reduce((sum, o) => sum + (o.totalCharge || 0), 0);
    
    const rOrders = await prisma.resourceOrder.findMany({
      where: { userId: u.id }
    });
    const rInc = rOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const total = cInc + oInc + rInc;
    if (total > 0) {
      console.log(`User ${u.email} (${u.role}) spent: ${total}`);
    }
  }
}

run().finally(() => prisma.$disconnect());
