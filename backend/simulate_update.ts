import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany();
  if (courses.length === 0) return;
  const course = courses[0];

  try {
    await prisma.schedule.deleteMany({ where: { courseId: course.id } });
    
    const updated = await prisma.course.update({
      where: { id: course.id },
      data: {
        schedules: {
          create: [
            {
              name: 'Ca Tối 2-4-6',
              time: '19:30 - 21:00',
              meetLink: 'https://meet.google.com/abc-xyz'
            }
          ]
        }
      },
      include: { schedules: true }
    });
    console.log("Success:", JSON.stringify(updated, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
