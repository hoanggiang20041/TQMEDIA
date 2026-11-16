const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const orders = await prisma.order.findMany();
  let count = 0;
  for (const o of orders) {
    if (o.profit === 0 || o.profit === null) {
      // costPrice is typically stored, but wait, the old schema had costPrice default 0.
      // If it's 0, profit is just totalNum.
      const profit = (o.totalNum || 0) - ((o.costPrice || 0) * (o.quantity || 1));
      await prisma.order.update({
        where: { id: o.id },
        data: { profit }
      });
      count++;
    }
  }
  console.log('Updated', count, 'orders.');
}
run().catch(console.error).finally(() => prisma.disconnect());