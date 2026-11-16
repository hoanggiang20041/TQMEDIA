const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const c = await prisma.serverService.count();
    console.log('Servers on VPS: ' + c);
}
main().finally(() => process.exit(0));
