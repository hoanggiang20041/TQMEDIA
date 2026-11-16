const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const resources = await prisma.resource.findMany({
    include: { variants: true }
  });

  const resData = resources.map(r => ({
    name: r.name,
    legacyStockDataLength: r.stockData ? r.stockData.length : 0,
    legacyLines: r.stockData ? r.stockData.split(/\n|\r?\n/).length : 0,
    variants: r.variants.map(v => ({
      name: v.name,
      stockDataLength: v.stockData ? v.stockData.length : 0,
      stockLines: v.stockData ? v.stockData.split(/\n|\r?\n/).filter(l => l.trim().length > 0).length : 0
    }))
  }));

  console.log(JSON.stringify(resData, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
