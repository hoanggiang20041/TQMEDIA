const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const vars = await prisma.resourceVariant.findMany({ select: { name: true, importPrice: true, price: true } });
  console.log(JSON.stringify(vars, null, 2));
}
main().catch(console.error).finally(()=>prisma.$disconnect());
