const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('[SYNC] Starting Baostar initial sync...');
    
    // Set all empty apiProvider to 'baostar'
    await prisma.serverService.updateMany({
      where: { apiProvider: '' },
      data: { apiProvider: 'baostar' }
    });
    console.log('[SYNC] Updated empty apiProviders to baostar.');

    const res = await axios.post('https://smm.baostar.net/api/v2', {
      key: 'EAAABtpqnnsSwncubx7h0os2aga2socyat7i5oaSKittzi4t/fpF1jIN/',
      action: 'services'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const services = res.data;
    if (!Array.isArray(services)) {
      console.error('[SYNC] Invalid response from Baostar API');
      return;
    }

    const dbServers = await prisma.serverService.findMany({ where: { apiProvider: 'baostar' } });
    let hoatDongCount = 0;
    let baoTriCount = 0;

    for (const s of dbServers) {
      if (!s.apiServiceId) continue;
      const apiId = String(s.apiServiceId);
      
      const providerService = services.find(x => String(x.service) === apiId);
      
      if (providerService) {
        let costPrice = s.costPrice;
        if (providerService.vnd) costPrice = parseFloat(providerService.vnd) / 1000;
        else if (providerService.rate) costPrice = (parseFloat(providerService.rate) * 25000) / 1000;
        
        await prisma.serverService.update({
          where: { id: s.id },
          data: { 
            status: 'hoat_dong',
            costPrice: costPrice > 0 ? costPrice : s.costPrice,
            // optionally update name/desc if we want to sync them
          }
        });
        hoatDongCount++;
      } else {
        await prisma.serverService.update({
          where: { id: s.id },
          data: { status: 'bao_tri' }
        });
        baoTriCount++;
      }
    }

    console.log(`[SYNC] Completed! Active: ${hoatDongCount}, Maintenance: ${baoTriCount}`);
  } catch (err) {
    console.error('[SYNC] Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
