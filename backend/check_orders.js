const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.order.findMany().then(console.log).finally(() => prisma.$disconnect());
