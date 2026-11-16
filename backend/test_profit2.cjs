const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - 30);
  
  const sum = await prisma.order.aggregate({
    _sum: { profit: true },
    where: { createdAt: { gte: dateLimit }, status: { not: 'cancelled' } }
  });
  console.log('Order Profit (last 30 days):', sum);

  const resSum = await prisma.resourceOrder.aggregate({
    _sum: { totalAmount: true, totalImportAmount: true },
    where: { createdAt: { gte: dateLimit } }
  });
  console.log('Resource Profit (last 30 days):', resSum._sum.totalAmount - (resSum._sum.totalImportAmount || 0));

  // Also calculate ALL time profit
  const sumAll = await prisma.order.aggregate({
    _sum: { profit: true },
    where: { status: { not: 'cancelled' } }
  });
  console.log('Order Profit (ALL TIME):', sumAll);
}

main().catch(console.error).finally(() => prisma.$disconnect());