const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
  host: '103.195.238.62',
  username: 'root',
  password: 'Giangdz2004@'
}).then(async () => {
  const res = await ssh.execCommand(`
cat << 'EOF' > test_buy.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  console.log('Admin:', admin.name, 'Balance:', admin.balance, 'Role:', admin.role);
  
  const resource = await prisma.resource.findFirst({ where: { type: 'ACCOUNT' } });
  const variant = await prisma.resourceVariant.findFirst({ where: { resourceId: resource.id } });
  
  console.log('Resource:', resource.name, 'Variant:', variant.name, 'Price:', variant.price);
  
  const reqBody = {
    quantity: 1,
    variantId: variant.id,
    discount: 0
  };
  
  // Try to replicate the actual logic exactly
  let actualPrice = variant.price * reqBody.quantity;
  let maxPercent = -1;
  if (admin.role === 'ADMIN') {
    maxPercent = 100;
  }
  if (maxPercent > 0) {
    actualPrice = Math.max(0, actualPrice * (1 - maxPercent / 100));
  }
  actualPrice = Math.max(0, actualPrice - (reqBody.discount || 0));
  
  console.log('Actual Price:', actualPrice);
  console.log('admin.balance < actualPrice:', admin.balance < actualPrice);
  if (admin.balance < actualPrice) {
    console.log('ERROR: Số dư không đủ');
  } else {
    console.log('SUCCESS');
  }
}
test().finally(() => prisma.$disconnect());
EOF
node test_buy.cjs
`);
  console.log(res.stdout);
  console.error(res.stderr);
  ssh.dispose();
});
