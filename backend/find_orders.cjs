const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, balance: true, role: true }});
  console.log('Users:', users);
  
  const orders = await prisma.order.findMany({ orderBy: { totalNum: 'desc' }, take: 5, select: { id: true, totalNum: true, userId: true, createdAt: true } });
  console.log('Top orders:', orders);
  
  const enrollments = await prisma.enrollment.findMany({ orderBy: { totalAmount: 'desc' }, take: 5, select: { id: true, totalAmount: true, userId: true, courseId: true, createdAt: true } });
  console.log('Top enrollments:', enrollments);
  
  const resourceOrders = await prisma.resourceOrder.findMany({ orderBy: { totalAmount: 'desc' }, take: 5, select: { id: true, totalAmount: true, userId: true, createdAt: true } });
  console.log('Top resource orders:', resourceOrders);
}

run().finally(() => prisma.$disconnect());
