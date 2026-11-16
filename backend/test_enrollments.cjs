const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const c = await prisma.enrollment.count();
    console.log('Enrollment count:', c);
  } finally {
    await prisma.$disconnect();
  }
}
run();
