const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function fix() {
  const txs = await prisma.transaction.findMany();
  let count = 0;
  for (const t of txs) {
    if (t.amount.includes('++') || t.amount.includes('₫₫') || t.amount.includes('₫ ₫') || t.amount.includes('₫ ₫')) {
      let newAmount = t.amount.replace(/\+\+/g, '+').replace(/₫\s*₫/g, '₫').replace(/₫₫/g, '₫').replace(/₫ ₫/g, '₫');
      // Ensure there's exactly one space before ₫
      newAmount = newAmount.replace(/\s*₫/g, ' ₫');
      await prisma.transaction.update({
        where: { id: t.id },
        data: { amount: newAmount }
      });
      count++;
    }
  }
  console.log('Fixed ' + count + ' transactions amounts');
  
  count = 0;
  for (const t of txs) {
    if (t.balance.includes('₫₫') || t.balance.includes('₫ ₫') || t.balance.includes('₫ ₫')) {
      let newBalance = t.balance.replace(/₫\s*₫/g, '₫').replace(/₫₫/g, '₫').replace(/₫ ₫/g, '₫');
      newBalance = newBalance.replace(/\s*₫/g, ' ₫');
      await prisma.transaction.update({
        where: { id: t.id },
        data: { balance: newBalance }
      });
      count++;
    }
  }
  console.log('Fixed ' + count + ' transactions balances');
}
fix().finally(() => prisma.$disconnect());
