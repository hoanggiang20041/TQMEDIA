const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const orders = await prisma.order.findMany();
  for (const o of orders) {
    console.log(`Order ${o.id}: status=${o.status}, total=${o.totalNum}`);
  }
}
check();
