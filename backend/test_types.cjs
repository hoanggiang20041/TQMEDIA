const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.serverService.findMany({ select: { serviceType: true, platform: true, name: true } }).then(s => {
  const types = [...new Set(s.map(x => x.platform + ' : ' + x.serviceType))];
  console.log(types.join('\n'));
  p.$disconnect();
});
