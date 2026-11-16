import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const txs = await prisma.transaction.findMany();
  const tx1328 = txs.filter(t => t.amount.includes('1328') || t.amount.includes('1.328') || t.amount.includes('1,328'));
  console.log('Txs containing 1328:', JSON.stringify(tx1328, null, 2));
  
  const tx1574 = txs.filter(t => t.amount.includes('1574') || t.amount.includes('1.574') || t.amount.includes('1,574'));
  console.log('Txs containing 1574:', JSON.stringify(tx1574, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
