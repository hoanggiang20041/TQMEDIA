const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
  host: '103.195.238.62',
  username: 'root',
  password: 'Giangdz2004@'
}).then(async () => {
  const res = await ssh.execCommand(`
cat << 'EOF' > /var/www/tqmedia/backend/test_buy_http.cjs
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function test() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
  
  const resource = await prisma.resource.findFirst({ where: { type: 'ACCOUNT' } });
  const variant = await prisma.resourceVariant.findFirst({ where: { resourceId: resource.id } });
  
  console.log('Testing buy for Admin:', admin.name, 'Balance:', admin.balance);
  console.log('Resource:', resource.name, 'Variant:', variant.name);
  
  const res = await fetch('http://localhost:4000/api/resources/' + resource.id + '/buy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      quantity: 1,
      variantId: variant.id,
      discount: 0
    })
  });
  
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', data);
}
test().finally(() => prisma.$disconnect());
EOF
cd /var/www/tqmedia/backend && node test_buy_http.cjs
`);
  console.log(res.stdout);
  console.error(res.stderr);
  ssh.dispose();
});
