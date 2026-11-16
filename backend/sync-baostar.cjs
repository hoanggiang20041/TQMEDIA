const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');

const API_URL = 'https://smm.baostar.net/api/v2';
const API_KEY = 'EAAABtpqnnsSwncubx7h0os2aga2socyat7i5oaSKittzi4t9gZJ2hIWA';

async function importServers() {
  try {
    console.log('Fetching services from Baostar API...');
    const data = await new Promise((resolve, reject) => {
      https.get(`${API_URL}?key=${API_KEY}&action=services`, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(rawData));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (e) => reject(e));
    });

    if (!Array.isArray(data)) {
      console.error('Expected array, got:', data);
      return;
    }

    console.log(`Fetched ${data.length} services.`);
    
    // Xóa hết server cũ (nếu có)
    await prisma.serverService.deleteMany();
    console.log('Cleared old servers.');

    let successCount = 0;
    
    for (const item of data) {
      const rate = parseFloat(item.rate) || 0;
      
      // Rate is in USD per 1000 items. Conversion rate is 27,000 VND / 1 USD.
      // So real price per 1 item in VND: (rate / 1000) * 27000
      let realPrice = (rate / 1000) * 27000;
      realPrice = Math.round(realPrice); // Round to nearest VND
      
      // Lấy nền tảng.
      let platform = 'facebook';
      const catLower = item.category.toLowerCase();
      const nameLower = item.name.toLowerCase();
      
      // Determine platform by checking name first, then category
      if (nameLower.includes('tiktok') || catLower.includes('tiktok') || catLower.includes('tik tok')) platform = 'tiktok';
      else if (nameLower.includes('instagram') || nameLower.includes('ig ') || nameLower.includes('ig') || catLower.includes('instagram') || catLower.includes('ig')) platform = 'instagram';
      else if (nameLower.includes('youtube') || nameLower.includes('ytb') || catLower.includes('youtube') || catLower.includes('ytb')) platform = 'youtube';
      else if (nameLower.includes('shopee') || catLower.includes('shopee')) platform = 'shopee';
      else if (nameLower.includes('telegram') || nameLower.includes('tele') || catLower.includes('telegram') || catLower.includes('tele')) platform = 'telegram';
      else if (nameLower.includes('twitter') || nameLower.includes('tiwtter') || catLower.includes('twitter') || catLower.includes('x-twitter')) platform = 'x-twitter';
      else if (nameLower.includes('threads') || catLower.includes('threads')) platform = 'threads';
      else if (nameLower.includes('lazada') || catLower.includes('lazada')) platform = 'lazada';
      else if (nameLower.includes('google') || nameLower.includes('map') || catLower.includes('google')) platform = 'google';

      const normalizedCategory = item.category.replace(/\s+/g, ' ').trim();

      let status = 'hoat_dong';
      if (item.name.toLowerCase().includes('bảo trì')) status = 'bao_tri';

      await prisma.serverService.create({
        data: {
          platform: platform,
          serviceType: normalizedCategory,
          name: item.name,
          desc: item.description || '',
          price: realPrice,
          costPrice: realPrice,
          min: parseInt(item.min) || 50,
          max: parseInt(item.max) || 10000,
          status: status,
          apiServiceId: item.service.toString(),
        }
      });
      successCount++;
    }

    console.log(`Successfully imported ${successCount} servers.`);
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importServers();
