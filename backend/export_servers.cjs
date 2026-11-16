const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
    const servers = await prisma.serverService.findMany();
    fs.writeFileSync('servers.json', JSON.stringify(servers));
    console.log('Exported ' + servers.length + ' servers');
}

main().finally(() => prisma.$disconnect());
