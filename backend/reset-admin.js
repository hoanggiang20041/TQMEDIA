const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { agencyLevel: 0 }
  });
  console.log('Done reset admin agency level');
}

main();
