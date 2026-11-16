const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    await prisma.serverService.deleteMany();
    console.log('Deleted all servers');
}
main().finally(()=>process.exit(0));
