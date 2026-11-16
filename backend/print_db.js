const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const txs = await prisma.transaction.findMany({ take: 10, orderBy: { createdAt: 'desc' } });
  console.log(JSON.stringify(txs, null, 2));
}
run().finally(() => prisma.$disconnect());
