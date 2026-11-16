const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const order = await prisma.order.findUnique({ where: { id: '#ORD-2637' } });
  if (order) {
    console.log('Order apiResponse:', order.apiResponse);
  } else {
    console.log('Order not found');
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
