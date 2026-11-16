const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function test() {
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'tqmedia_secret_key', { expiresIn: '1d' });
  const res = await fetch('http://localhost:3001/api/admin/resource-orders', { headers: { Authorization: 'Bearer ' + token } });
  console.log(res.status);
  const data = await res.text();
  console.log(data);
}

test().catch(console.error).finally(()=>prisma.$disconnect());
