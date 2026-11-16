import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    console.log('[SYNC] Starting Baostar VPS sync...');
    
    // Save API key
    await prisma.setting.upsert({
      where: { key: 'baostar_api_key' },
      update: { value: 'EAAABtpqnnsSwncubx7h0os2aga2socyat7i5oaSKittzi4t/fpF1jIN/' },
      create: { key: 'baostar_api_key', value: 'EAAABtpqnnsSwncubx7h0os2aga2socyat7i5oaSKittzi4t/fpF1jIN/' }
    });
    await prisma.setting.upsert({
      where: { key: 'baostar_api_url' },
      update: { value: 'https://smm.baostar.net/api/v2' },
      create: { key: 'baostar_api_url', value: 'https://smm.baostar.net/api/v2' }
    });
    console.log('[SYNC] Saved Baostar API settings');

    // Update empty providers
    await prisma.serverService.updateMany({
      where: { apiProvider: '' },
      data: { apiProvider: 'baostar' }
    });
    console.log('[SYNC] Updated empty apiProviders to baostar.');

    const res = await fetch('https://smm.baostar.net/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'EAAABtpqnnsSwncubx7h0os2aga2socyat7i5oaSKittzi4t/fpF1jIN/', action: 'services' })
    });

    const services = await res.json();
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
      
      const providerService = services.find((x: any) => String(x.service) === apiId);
      
      if (providerService) {
        let costPrice = s.costPrice;
        if (providerService.vnd) costPrice = parseFloat(providerService.vnd) / 1000;
        else if (providerService.rate) costPrice = (parseFloat(providerService.rate) * 25000) / 1000;
        
        await prisma.serverService.update({
          where: { id: s.id },
          data: { 
            status: 'hoat_dong',
            costPrice: costPrice > 0 ? costPrice : s.costPrice
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
  } catch (err: any) {
    console.error('[SYNC] Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
