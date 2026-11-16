const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const resources = await prisma.resource.findMany({
    include: { variants: true }
  });

  let migratedCount = 0;

  for (const r of resources) {
    if (r.variants.length === 0) {
      console.log(`Migrating resource: ${r.name} (ID: ${r.id})`);
      
      await prisma.resourceVariant.create({
        data: {
          resourceId: r.id,
          name: 'Mặc định',
          price: r.price || 0,
          stockData: r.stockData || '',
          soldCount: r.soldCount || 0
        }
      });
      migratedCount++;
      console.log(` -> Created default variant with stockData length: ${r.stockData ? r.stockData.split(/\n|\r?\n/).length : 0}`);
    }
  }

  console.log(`\nMigration complete. Migrated ${migratedCount} resources.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
