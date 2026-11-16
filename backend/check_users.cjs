const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    console.log('Users on VPS:', await prisma.user.count());
}
main().finally(() => process.exit(0));
