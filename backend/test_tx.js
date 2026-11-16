const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const txs = await prisma.transaction.findMany({
    where: { status: 'COMPLETED', amount: { gt: 0 } },
    select: { amount: true, desc: true, createdAt: true, status: true }
  });
  console.log(JSON.stringify(txs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
