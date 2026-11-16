const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  await prisma.serverService.createMany({
    data: [
      {
        platform: 'facebook',
        serviceType: 'Tăng Like',
        name: 'MC 101 - Like Bài Viết [Siêu Tốc]',
        price: 15,
        costPrice: 5,
        min: 100,
        max: 10000,
        desc: 'Tăng like bài viết siêu tốc, không tụt',
        status: 'hoat_dong'
      },
      {
        platform: 'facebook',
        serviceType: 'Tăng Like',
        name: 'MC 102 - Like Bài Viết [Người Thật]',
        price: 30,
        costPrice: 10,
        min: 50,
        max: 5000,
        desc: 'Like từ người dùng thật có avatar',
        status: 'hoat_dong'
      },
      {
        platform: 'facebook',
        serviceType: 'Cảm Xúc',
        name: 'MC 201 - Tăng Cảm Xúc Bài Viết',
        price: 25,
        costPrice: 8,
        min: 100,
        max: 10000,
        desc: 'Hỗ trợ các loại cảm xúc',
        status: 'hoat_dong'
      },
      {
        platform: 'facebook',
        serviceType: 'Bình Luận',
        name: 'MC 301 - Tăng Bình Luận Custom',
        price: 100,
        costPrice: 50,
        min: 10,
        max: 1000,
        desc: 'Mỗi dòng 1 bình luận',
        status: 'hoat_dong'
      },
      {
        platform: 'tiktok',
        serviceType: 'Tăng Follow',
        name: 'MC 501 - Follow TikTok Việt',
        price: 45,
        costPrice: 15,
        min: 100,
        max: 20000,
        desc: 'Follow người Việt chất lượng',
        status: 'hoat_dong'
      }
    ]
  });
  console.log('Seeded services successfully!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
