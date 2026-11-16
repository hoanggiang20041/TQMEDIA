const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const courses = await prisma.course.findMany({ select: { id: true, title: true, salePrice: true } });
  console.log('Courses:', courses);
  
  const enrollments = await prisma.enrollment.findMany({ include: { course: true, user: true } });
  for (const e of enrollments) {
    if (e.course?.salePrice >= 7000000) {
      console.log(`Deleting enrollment ${e.id} for user ${e.user?.email} (${e.course.title})`);
      await prisma.enrollment.delete({ where: { id: e.id } });
    }
  }
}

run().finally(() => prisma.$disconnect());
