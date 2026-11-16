const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  await prisma.serverService.deleteMany();

  const services = [
    // FACEBOOK
    { platform: 'facebook', serviceType: 'Tăng Like', name: 'MC 101 - Like Bài Viết Siêu Tốc', price: 15, costPrice: 5, min: 100, max: 10000, desc: 'Tăng like bài viết siêu tốc, không tụt', status: 'hoat_dong', hot: true },
    { platform: 'facebook', serviceType: 'Tăng Like', name: 'MC 102 - Like Bài Viết [Người Thật]', price: 30, costPrice: 10, min: 50, max: 5000, desc: 'Like từ người dùng thật có avatar', status: 'hoat_dong' },
    { platform: 'facebook', serviceType: 'Cảm Xúc', name: 'MC 201 - Tăng Cảm Xúc Bài Viết', price: 25, costPrice: 8, min: 100, max: 10000, desc: 'Hỗ trợ các loại cảm xúc', status: 'hoat_dong', hot: true },
    { platform: 'facebook', serviceType: 'Cảm Xúc', name: 'MC 202 - Cảm Xúc Group', price: 40, costPrice: 15, min: 50, max: 5000, desc: 'Tăng cảm xúc trong nhóm kín', status: 'hoat_dong' },
    { platform: 'facebook', serviceType: 'Bình Luận', name: 'MC 301 - Tăng Bình Luận Custom', price: 100, costPrice: 50, min: 10, max: 1000, desc: 'Mỗi dòng 1 bình luận', status: 'hoat_dong', hot: true },
    { platform: 'facebook', serviceType: 'Tăng Share', name: 'MC 401 - Share Profile', price: 80, costPrice: 30, min: 50, max: 2000, desc: 'Share bài viết lên trang cá nhân', status: 'hoat_dong' },
    { platform: 'facebook', serviceType: 'Tăng Share', name: 'MC 402 - Share Group Siêu Tốc', price: 150, costPrice: 60, min: 20, max: 1000, desc: 'Share bài viết lên nhóm tương tác cao', status: 'hoat_dong' },

    // TIKTOK
    { platform: 'tiktok', serviceType: 'Tăng Follow', name: 'MC 501 - Follow TikTok Việt', price: 45, costPrice: 15, min: 100, max: 20000, desc: 'Follow người Việt chất lượng', status: 'hoat_dong', hot: true },
    { platform: 'tiktok', serviceType: 'Tăng Follow', name: 'MC 502 - Follow Ngoại', price: 20, costPrice: 5, min: 100, max: 50000, desc: 'Follow ngoại giá rẻ', status: 'hoat_dong' },
    { platform: 'tiktok', serviceType: 'Tăng Tim', name: 'MC 511 - Tim Video TikTok', price: 20, costPrice: 8, min: 100, max: 50000, desc: 'Tim nhảy siêu tốc', status: 'hoat_dong', hot: true },
    { platform: 'tiktok', serviceType: 'Tăng View', name: 'MC 521 - View Video TikTok', price: 1, costPrice: 0.2, min: 1000, max: 1000000, desc: 'View lên nhanh sau 5p', status: 'hoat_dong' },
    { platform: 'tiktok', serviceType: 'Bình Luận', name: 'MC 531 - Bình Luận Tự Chọn', price: 80, costPrice: 30, min: 10, max: 1000, desc: 'Mỗi dòng 1 comment', status: 'hoat_dong' },

    // INSTAGRAM
    { platform: 'instagram', serviceType: 'Tăng Follow', name: 'MC 601 - Follow Instagram Việt', price: 50, costPrice: 20, min: 100, max: 10000, desc: 'Follow Việt ít tụt', status: 'hoat_dong', hot: true },
    { platform: 'instagram', serviceType: 'Tăng Like', name: 'MC 611 - Tim Ảnh / Reels', price: 25, costPrice: 10, min: 100, max: 20000, desc: 'Like Việt Nam', status: 'hoat_dong' },
    { platform: 'instagram', serviceType: 'Bình Luận', name: 'MC 621 - Comment Instagram', price: 90, costPrice: 40, min: 10, max: 500, desc: 'Mỗi dòng 1 bình luận', status: 'hoat_dong' },

    // SHOPEE
    { platform: 'shopee', serviceType: 'Tăng Follow', name: 'MC 701 - Follow Shop', price: 60, costPrice: 25, min: 100, max: 5000, desc: 'Follow Shop tăng độ uy tín', status: 'hoat_dong', hot: true },
    { platform: 'shopee', serviceType: 'Đánh Giá', name: 'MC 711 - Đánh Giá Sản Phẩm', price: 500, costPrice: 200, min: 1, max: 100, desc: 'Mỗi dòng 1 đánh giá, có chữ và ảnh', status: 'hoat_dong' },
    { platform: 'shopee', serviceType: 'Tăng Like', name: 'MC 721 - Like Sản Phẩm', price: 30, costPrice: 10, min: 50, max: 2000, desc: 'Tim sản phẩm Shopee', status: 'hoat_dong' },

    // TELEGRAM
    { platform: 'telegram', serviceType: 'Tăng Member', name: 'MC 801 - Member Group', price: 35, costPrice: 12, min: 200, max: 50000, desc: 'Thêm member vào group', status: 'hoat_dong', hot: true },
    { platform: 'telegram', serviceType: 'Tăng Member', name: 'MC 802 - Member Channel', price: 40, costPrice: 15, min: 200, max: 50000, desc: 'Tăng sub channel', status: 'hoat_dong' },
    { platform: 'telegram', serviceType: 'Tăng View', name: 'MC 811 - View Bài Viết (Mới Nhất)', price: 2, costPrice: 0.5, min: 500, max: 100000, desc: 'View tự động bài viết', status: 'hoat_dong' },
    { platform: 'telegram', serviceType: 'Cảm Xúc', name: 'MC 821 - React Bài Viết', price: 15, costPrice: 5, min: 50, max: 5000, desc: 'Reaction bài viết', status: 'hoat_dong' },

    // TWITTER (X)
    { platform: 'x-twitter', serviceType: 'Tăng Follow', name: 'MC 901 - Follow Twitter', price: 55, costPrice: 20, min: 50, max: 10000, desc: 'Follower Twitter (X) chất lượng', status: 'hoat_dong', hot: true },
    { platform: 'x-twitter', serviceType: 'Tăng Like', name: 'MC 911 - Like Tweet', price: 40, costPrice: 15, min: 50, max: 10000, desc: 'Like bài viết Twitter', status: 'hoat_dong' },
    { platform: 'x-twitter', serviceType: 'Retweet', name: 'MC 921 - Retweet', price: 60, costPrice: 25, min: 50, max: 5000, desc: 'Retweet chuẩn', status: 'hoat_dong' },

    // THREADS
    { platform: 'threads', serviceType: 'Tăng Follow', name: 'MC 1001 - Follow Threads', price: 65, costPrice: 25, min: 50, max: 10000, desc: 'Follow nền tảng Threads', status: 'hoat_dong' },
    { platform: 'threads', serviceType: 'Tăng Like', name: 'MC 1011 - Like Threads', price: 35, costPrice: 12, min: 50, max: 10000, desc: 'Like bài viết Threads', status: 'hoat_dong' },

    // LAZADA
    { platform: 'lazada', serviceType: 'Tăng Follow', name: 'MC 1101 - Follow Shop Lazada', price: 65, costPrice: 25, min: 100, max: 5000, desc: 'Follow Shop Lazada', status: 'hoat_dong' },
    { platform: 'lazada', serviceType: 'Đánh Giá', name: 'MC 1111 - Đánh Giá Lazada', price: 550, costPrice: 220, min: 1, max: 50, desc: 'Mỗi dòng 1 đánh giá', status: 'hoat_dong' },
    
    // YOUTUBE
    { platform: 'youtube', serviceType: 'Tăng Sub', name: 'MC 1201 - Sub Kênh', price: 450, costPrice: 150, min: 50, max: 2000, desc: 'Sub chất lượng cao', status: 'hoat_dong', hot: true },
    { platform: 'youtube', serviceType: 'Tăng View', name: 'MC 1211 - View Video (Giữ chân)', price: 30, costPrice: 10, min: 1000, max: 500000, desc: 'View giữ chân cao, an toàn bật kiếm tiền', status: 'hoat_dong' },
    { platform: 'youtube', serviceType: 'Tăng Like', name: 'MC 1221 - Like Video', price: 35, costPrice: 12, min: 100, max: 10000, desc: 'Like an toàn', status: 'hoat_dong' },
    { platform: 'youtube', serviceType: 'Bình Luận', name: 'MC 1231 - Comment Video', price: 150, costPrice: 60, min: 10, max: 500, desc: 'Mỗi dòng 1 comment', status: 'hoat_dong' },
  ];

  await prisma.serverService.createMany({ data: services });
  console.log('Seeded completely!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
