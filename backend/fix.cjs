const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.setting.upsert({
    where: { key: 'deposit_bonus_percent' },
    update: { value: '0' },
    create: { key: 'deposit_bonus_percent', value: '0' }
  });
  console.log('Updated deposit bonus to 0');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
