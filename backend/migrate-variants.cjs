const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const resources = await prisma.resource.findMany({
    include: { variants: true }
  });

  for (const resource of resources) {
    if (resource.variants.length === 0) {
      // Create a default variant for existing resource
      await prisma.resourceVariant.create({
        data: {
          resourceId: resource.id,
          name: 'Mặc định',
          importPrice: 0,
          price: resource.price || 0,
          stockData: resource.stockData || '',
          soldCount: resource.soldCount
        }
      });
      console.log(`Created default variant for resource: ${resource.name}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
