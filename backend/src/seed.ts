import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// The old mock data
const currentUser = {
  id: 'u1',
  name: 'Giang DZ',
  balance: 5000000,
  role: 'ADMIN'
}

const mockOrders: any[] = [
  { id: '#ORD-8829', date: '22/05/2026 14:30', platform: 'tiktok', service: 'TikTok View - Server 1', target: 'https://tiktok.com/@user/video/123...', status: 'processing', total: '150.000 Ä‘' },
  { id: '#ORD-8828', date: '22/05/2026 10:15', platform: 'facebook', service: 'Facebook Like Post', target: 'https://facebook.com/post/1234567...', status: 'completed', total: '45.000 Ä‘' },
]

for (let i = 1; i <= 45; i++) {
  const platforms = ['tiktok', 'facebook', 'instagram', 'youtube', 'google']
  const statuses = ['processing', 'completed', 'cancelled']
  const p = platforms[i % platforms.length]
  mockOrders.push({
    id: `#ORD-${8800 - i}`,
    date: `20/05/2026 10:${i < 10 ? '0'+i : i}`,
    platform: p,
    service: `${p.toUpperCase()} Service Demo ${i}`,
    target: `https://${p}.com/target/${i}`,
    status: statuses[i % 3],
    total: `${(i * 15000).toLocaleString('vi-VN')} Ä‘`
  })
}

const mockTransactions = [
  { id: '#TRX-1029', type: 'Cá»˜NG TIá»€N', amount: '+5.000.000 â‚«', balance: '5.000.000 â‚«', desc: 'Náº¡p tiá»n qua Chuyá»ƒn khoáº£n ngÃ¢n hÃ ng (MB Bank)', time: '09:15 24/05/2026', typeClass: 'text-green-400 bg-green-400/10 border-green-400/30' },
]

const servicesData = {
  facebook: {
    like: [
      { id: 'fb_l1', name: 'Server 1 - Like Viá»‡t Nam (Báº£o hÃ nh 1 thÃ¡ng)', price: 15, desc: 'Tá»‘c Ä‘á»™ 1k - 5k / ngÃ y. Like ngÆ°á»i tháº­t 100% khÃ´ng tá»¥t.', min: 100, max: 10000, hot: false },
      { id: 'fb_l2', name: 'Server 2 - Like Ngoáº¡i (GiÃ¡ ráº»)', price: 8, desc: 'Tá»‘c Ä‘á»™ cá»±c nhanh 10k/ngÃ y, cÃ³ thá»ƒ tá»¥t nháº¹.', min: 100, max: 50000, hot: false },
      { id: 'fb_l3', name: 'Server 3 - Like clone Viá»‡t', price: 12, desc: 'LÃªn ngay sau 5p. Like áº£o.', min: 50, max: 5000, hot: true }
    ],
    follow: [
      { id: 'fb_f1', name: 'Server 1 - Follow Viá»‡t Tháº­t', price: 45, desc: 'Báº£o hÃ nh 30 ngÃ y.', min: 100, max: 5000, hot: true }
    ],
    comment: [
      { id: 'fb_c1', name: 'Server 1 - Comment Ná»™i Dung Tá»± Chá»n', price: 150, desc: 'Nick Viá»‡t tháº­t, cÃ³ avatar.', min: 10, max: 1000, hot: false }
    ],
    live: [
      { id: 'fb_live1', name: 'Server 1 - Máº¯t Live Viá»‡t', price: 5, desc: 'Máº¯t á»•n Ä‘á»‹nh, lÃªn ngay sau 5p.', min: 50, max: 10000, hot: true }
    ],
    group: [
      { id: 'fb_g1', name: 'Server 1 - ThÃ nh ViÃªn Group', price: 20, desc: 'Nick áº£o cÃ³ avatar, khÃ´ng tá»¥t.', min: 100, max: 50000, hot: false }
    ],
    like_post: [
      { id: 'fb_lp1', name: 'Server 1 - Like BÃ i Viáº¿t Nhanh', price: 10, desc: 'Like bÃ i cÃ¡ nhÃ¢n / fanpage tá»‘c Ä‘á»™ cao.', min: 50, max: 20000, hot: true }
    ],
    share: [], view: []
  },
  tiktok: {
    like: [
      { id: 'tt_l1', name: 'Server 1 - Like TikTok Viá»‡t', price: 20, desc: 'Tá»‘c Ä‘á»™ nhanh, khÃ´ng tá»¥t.', min: 100, max: 20000, hot: true }
    ],
    follow: [
      { id: 'tt_f1', name: 'Server 1 - Follow TikTok Viá»‡t', price: 60, desc: 'Báº£o hÃ nh 30 ngÃ y.', min: 100, max: 5000, hot: true }
    ],
    view: [
      { id: 'tt_v1', name: 'Server 1 - View TikTok Nhanh', price: 2, desc: 'LÃªn ngay láº­p tá»©c. Tá»‘i Ä‘a 1M view.', min: 1000, max: 1000000, hot: false }
    ],
    comment: [
      { id: 'tt_c1', name: 'Server 1 - Comment TikTok Tá»± Chá»n', price: 200, desc: 'BÃ¬nh luáº­n theo ná»™i dung tÃ¹y chá»‰nh.', min: 10, max: 500, hot: true }
    ],
    share: [], reup: [], remove_strike: []
  },
  instagram: {
    like: [
      { id: 'ig_l1', name: 'Server 1 - Like IG ToÃ n Cáº§u', price: 15, desc: 'Tá»‘c Ä‘á»™ 5k/ngÃ y.', min: 100, max: 10000, hot: false }
    ],
    follow: [
      { id: 'ig_f1', name: 'Server 1 - Follow IG NÆ°á»›c NgoÃ i', price: 30, desc: 'GiÃ¡ ráº», khÃ´ng báº£o hÃ nh.', min: 100, max: 20000, hot: true }
    ],
    view: [], comment: []
  },
  youtube: {
    view: [
      { id: 'yt_v1', name: 'Server 1 - View Youtube Nhanh', price: 35, desc: 'Nguá»“n view tháº­t, tá»· lá»‡ giá»¯ chÃ¢n cao.', min: 1000, max: 100000, hot: true }
    ],
    like: [
      { id: 'yt_l1', name: 'Server 1 - Like Youtube', price: 40, desc: 'Báº£o hÃ nh 30 ngÃ y.', min: 100, max: 5000, hot: false }
    ],
    sub: [
      { id: 'yt_s1', name: 'Server 1 - Sub Youtube Äá» Xuáº¥t', price: 250, desc: 'Sub tháº­t khÃ´ng tá»¥t, lÃªn tá»« tá»«.', min: 100, max: 2000, hot: true }
    ],
    comment: [], hour: []
  },
  google: {
    review: [
      { id: 'gg_r1', name: 'Server 1 - ÄÃ¡nh giÃ¡ Maps 5 Sao (Local Guide)', price: 3000, desc: 'TÃ i khoáº£n Local Guide VN, Ä‘Ã¡nh giÃ¡ sÃ¢u.', min: 5, max: 100, hot: true }
    ],
    seo: [
      { id: 'gg_s1', name: 'Server 1 - Traffic User Thá»±c (Click Google)', price: 1500, desc: 'TÄƒng thá»© háº¡ng tá»« khÃ³a. View tháº­t 100%.', min: 100, max: 5000, hot: true }
    ]
  }
}

async function main() {
  console.log('Seeding database...')

  // Clear existing
  await prisma.transaction.deleteMany()
  await prisma.order.deleteMany()
  await prisma.user.deleteMany()
  await prisma.serverService.deleteMany()

  // 1. Seed User
  const user = await prisma.user.create({
    data: {
      id: currentUser.id,
      name: currentUser.name,
      balance: currentUser.balance,
      role: currentUser.role
    }
  })

  // 2. Seed Services
  for (const [platform, services] of Object.entries(servicesData)) {
    for (const [serviceType, servers] of Object.entries(services)) {
      for (const srv of servers as any[]) {
        await prisma.serverService.create({
          data: {
            id: srv.id,
            platform,
            serviceType,
            name: srv.name,
            price: srv.price,
            costPrice: srv.costPrice || 0,
            min: srv.min,
            max: srv.max,
            desc: srv.desc || '',
            hot: srv.hot || false,
            status: 'hoat_dong'
          }
        })
      }
    }
  }

  // 3. Seed Orders
  for (const o of mockOrders) {
    let totalNum = 0
    if (o.total) {
      totalNum = parseFloat(o.total.replace(/[^0-9,-]+/g,"")) || 0
    }
    await prisma.order.create({
      data: {
        id: o.id,
        userId: user.id,
        platform: o.platform,
        service: o.service,
        target: o.target,
        status: o.status,
        total: o.total,
        totalNum: totalNum,
      }
    })
  }

  // 4. Seed Transactions
  for (const t of mockTransactions) {
    await prisma.transaction.create({
      data: {
        id: t.id,
        userId: user.id,
        type: t.type,
        amount: t.amount,
        balance: t.balance,
        desc: t.desc,
        typeClass: t.typeClass
      }
    })
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
