import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  const adminIds = admins.map(a => a.id);
  const orders = await prisma.order.findMany({ 
    where: { userId: { in: adminIds } }, 
    select: { id: true, totalNum: true, profit: true, createdAt: true } 
  });
  console.log('Admin orders on VPS:', orders);
}

main().catch(console.error).finally(() => prisma.$disconnect());
