import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.transaction.findMany({where: { type: 'CỘNG TIỀN' }, take: 10, select: { desc: true }}).then(console.log).finally(()=>prisma.$disconnect());
