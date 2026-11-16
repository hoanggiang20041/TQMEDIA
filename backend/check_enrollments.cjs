const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const enrollments = await prisma.enrollment.findMany({ include: { course: true } });
  
  const courseCounts = {};
  for (const e of enrollments) {
    if (!courseCounts[e.course.title]) courseCounts[e.course.title] = 0;
    courseCounts[e.course.title]++;
  }
  console.log('Real Enrollments from DB:', courseCounts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
