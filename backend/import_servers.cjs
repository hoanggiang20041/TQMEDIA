const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
    const data = JSON.parse(fs.readFileSync('servers.json', 'utf8'));
    console.log('Read ' + data.length + ' servers from json');
    
    console.log('Deleting existing servers...');
    await prisma.serverService.deleteMany();
    
    console.log('Inserting ' + data.length + ' servers...');
    // Xóa id cũ để Prisma tự generate id mới hoặc giữ nguyên cũng được.
    // Nếu giữ nguyên id cũ thì dễ trùng lặp nếu lỡ có record cũ. Tốt nhất xóa các trường ngày tháng.
    const insertData = data.map(s => {
        const { id, createdAt, updatedAt, ...rest } = s;
        return rest;
    });
    
    await prisma.serverService.createMany({ data: insertData });
    console.log('Import successful!');
}

main().finally(() => prisma.$disconnect());
