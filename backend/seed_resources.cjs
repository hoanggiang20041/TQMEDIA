const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedResources() {
  try {
    console.log('Seeding Resources with multiple SKUs (Variations)...');

    // Mảng dữ liệu test
    const resourcesData = [
      {
        name: 'Tài khoản Facebook (Via, Clone)',
        category: 'Tài khoản MXH',
        iconPlatform: 'Facebook',
        type: 'ACCOUNT',
        thumbnail: 'https://img.icons8.com/fluency/200/facebook-new.png',
        description: 'Kho tài khoản Facebook đa quốc gia, ngâm lâu, trust cao.',
        variants: [
          { name: 'Clone VN (New)', importPrice: 500, price: 1000, stockLines: 50 },
          { name: 'Clone US (Ngâm 1 tháng)', importPrice: 2000, price: 3500, stockLines: 30 },
          { name: 'Via VN (Cổ 2010)', importPrice: 25000, price: 35000, stockLines: 15 },
          { name: 'Via US (XMDT)', importPrice: 40000, price: 65000, stockLines: 10 },
          { name: 'BM5', importPrice: 150000, price: 200000, stockLines: 5 }
        ]
      },
      {
        name: 'Tài khoản TikTok (Beta, Ngâm)',
        category: 'Tài khoản MXH',
        iconPlatform: 'TikTok',
        type: 'ACCOUNT',
        thumbnail: 'https://img.icons8.com/fluency/200/tiktok.png',
        description: 'Tài khoản TikTok các thị trường bật kiếm tiền, follower cao.',
        variants: [
          { name: 'Acc US (0 Follwer)', importPrice: 3000, price: 5000, stockLines: 40 },
          { name: 'Acc UK (Bật Beta)', importPrice: 50000, price: 80000, stockLines: 12 },
          { name: 'Acc VN (>1k Follower, Mở Live)', importPrice: 80000, price: 120000, stockLines: 8 }
        ]
      },
      {
        name: 'Tài khoản Gmail Ngoại',
        category: 'Email',
        iconPlatform: 'Gmail',
        type: 'ACCOUNT',
        thumbnail: 'https://img.icons8.com/fluency/200/gmail-new.png',
        description: 'Gmail trắng IP ngoại phục vụ reg acc.',
        variants: [
          { name: 'Gmail US (Random)', importPrice: 1000, price: 2000, stockLines: 100 },
          { name: 'Gmail UK (Random)', importPrice: 1200, price: 2200, stockLines: 100 },
          { name: 'Gmail Ngâm (>6 tháng)', importPrice: 5000, price: 8000, stockLines: 20 }
        ]
      },
      {
        name: 'Gói Cài Đặt Tools Digital Marketing',
        category: 'Phần mềm / Tools',
        iconPlatform: 'Khác',
        type: 'LINK',
        thumbnail: 'https://st.quantrimang.com/photos/image/2024/02/01/su-dung-bcc-trong-outlook.jpg',
        description: 'Link tải full tool Auto FB, TikTok, IG cracked kèm hướng dẫn.',
        variants: [
          { name: 'Gói Basic (Auto Like, Cmt)', importPrice: 0, price: 50000, stockLines: 1 },
          { name: 'Gói Pro (Quản lý hàng ngàn profile)', importPrice: 0, price: 150000, stockLines: 1 },
          { name: 'VIP Lifetime', importPrice: 0, price: 500000, stockLines: 1 }
        ]
      }
    ];

    for (const resData of resourcesData) {
      // Generate unique stock data helper
      const generateStock = (count, prefix) => {
        let lines = [];
        for (let i = 0; i < count; i++) {
          lines.push(`${prefix}_${Math.random().toString(36).substring(7)}|pwd_${Math.random().toString(36).substring(5)}|2FA_${Math.random().toString(36).substring(4).toUpperCase()}`);
        }
        return lines.join('\\n');
      };

      // Create resource
      const newRes = await prisma.resource.create({
        data: {
          name: resData.name,
          category: resData.category,
          iconPlatform: resData.iconPlatform,
          description: resData.description,
          thumbnail: resData.thumbnail,
          type: resData.type,
          status: 'active'
        }
      });

      // Create variants
      for (const variantData of resData.variants) {
        await prisma.resourceVariant.create({
          data: {
            resourceId: newRes.id,
            name: variantData.name,
            importPrice: variantData.importPrice,
            price: variantData.price,
            stockData: resData.type === 'LINK' ? 'https://google.com/drive/xyz123' : generateStock(variantData.stockLines, variantData.name.substring(0, 3).toUpperCase())
          }
        });
      }
      console.log(`Created Resource: ${resData.name} with ${resData.variants.length} SKUs`);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding resources:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedResources();
