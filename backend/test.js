const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.transaction.findMany({take: 10, select: { desc: true }}).then(console.log).finally(()=>prisma.$disconnect());
