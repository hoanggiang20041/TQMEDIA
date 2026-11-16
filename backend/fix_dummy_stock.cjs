const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDummyStock() {
  const variants = await prisma.resourceVariant.findMany();
  for (const v of variants) {
    if (v.stockData && v.stockData.includes('\\n')) {
      const fixedData = v.stockData.replace(/\\n/g, '\n');
      await prisma.resourceVariant.update({
        where: { id: v.id },
        data: { stockData: fixedData }
      });
      console.log(`Fixed stockData for variant: ${v.name}`);
    }
  }
  console.log('Done fixing dummy stock data.');
}

fixDummyStock().catch(console.error).finally(() => prisma.$disconnect());
