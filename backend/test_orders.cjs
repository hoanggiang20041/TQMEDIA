const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.resourceOrder.count();
  console.log('Count:', count);
  const orders = await prisma.resourceOrder.findMany({ take: 5 });
  console.log(orders);
}

main().catch(console.error).finally(() => prisma.$disconnect());
