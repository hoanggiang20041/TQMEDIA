const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
  const users = await prisma.user.findMany();
  let updatedCount = 0;
  
  for (const user of users) {
    if (user.role.startsWith('DAI_LY_')) {
      const level = parseInt(user.role.replace('DAI_LY_', ''), 10);
      if (!isNaN(level)) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            role: 'USER', // Reset role to USER
            agencyLevel: Math.max(user.agencyLevel, level) // Set agencyLevel to the max of current or old
          }
        });
        updatedCount++;
        console.log(`Migrated user ${user.email}: role ${user.role} -> USER, agencyLevel -> ${level}`);
      }
    }
  }
  
  console.log(`Migration complete. Updated ${updatedCount} users.`);
}

migrateData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
