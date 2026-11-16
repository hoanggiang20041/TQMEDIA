const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./dev.vps.db"
    }
  }
});

async function main() {
  const users = await prisma.user.findMany({
    where: { email: 'giang10012004@gmail.com' }
  });
  console.log("Users in VPS DB:");
  console.dir(users, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
