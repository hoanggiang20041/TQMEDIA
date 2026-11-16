import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const depositTxs = await prisma.transaction.findMany({
    where: { 
      type: 'CỘNG TIỀN',
      desc: { startsWith: 'Nạp' }
    },
    select: { amount: true, desc: true, createdAt: true, userId: true }
  });
  const totalDeposited = depositTxs.reduce((sum, t) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);
  console.log('--- DB RESULTS ---');
  console.log('Total Deposited:', totalDeposited);
  console.log(JSON.stringify(depositTxs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
