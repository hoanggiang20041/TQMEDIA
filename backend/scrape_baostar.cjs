const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrape() {
    console.log('Khởi động Puppeteer...');
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    // Đăng nhập
    console.log('Điều hướng tới trang đăng nhập...');
    await page.goto('https://smm.baostar.net/dang-nhap', { waitUntil: 'networkidle2' });
    
    console.log('Điền thông tin đăng nhập...');
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    await page.type('input[name="username"]', 'quanlam315');
    await page.type('input[name="password"]', '123456789z');
    
    console.log('Click submit...');
    await page.click('button[type="submit"]');
    
    console.log('Chờ đăng nhập 5 giây...');
    await delay(5000);
    
    console.log('Chuyển tới trang chủ để lấy danh sách dịch vụ...');
    await page.goto('https://smm.baostar.net/', { waitUntil: 'networkidle2' });
    await delay(3000);
    
    // Lấy danh sách link dịch vụ
    const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href^="/dich-vu/"]'));
        const uniqueLinks = [...new Set(anchors.map(a => a.getAttribute('href')))];
        return uniqueLinks;
    });
    
    console.log(`Tìm thấy ${links.length} trang dịch vụ.`);
    
    let allServices = [];
    
    // Quét từng link
    for (let link of links) {
        console.log(`Đang quét: ${link}`);
        await page.goto(`https://smm.baostar.net${link}`, { waitUntil: 'networkidle2' });
        await delay(1500); // Đợi load select box
        
        // Trích xuất options
        const servicesOnPage = await page.evaluate((urlPath) => {
            let svcs = [];
            const select = document.querySelector('select[name="service"]');
            if (select) {
                const options = Array.from(select.querySelectorAll('option'));
                options.forEach(opt => {
                    if (opt.value && opt.value !== '0') {
                        // Tính toán platform và serviceType từ urlPath
                        // VD: /dich-vu/facebook-like
                        let parts = urlPath.replace('/dich-vu/', '').split('-');
                        let platform = parts[0];
                        // Map platform
                        const platformMap = {
                            'facebook': 'facebook',
                            'tiktok': 'tiktok',
                            'instagram': 'instagram',
                            'youtube': 'youtube',
                            'shopee': 'shopee',
                            'lazada': 'lazada',
                            'telegram': 'telegram',
                            'x': 'x-twitter',
                            'threads': 'threads'
                        };
                        let mappedPlatform = platformMap[platform] || 'khác';
                        let typeRaw = parts.slice(1).join(' ') || 'dịch vụ';
                        
                        let serviceType = typeRaw.replace('binh luan', 'bình luận')
                                                 .replace('cam xuc', 'cảm xúc')
                                                 .replace('danh gia', 'đánh giá');
                                                 
                        svcs.push({
                            id: opt.value,
                            name: opt.textContent.trim(),
                            price: parseFloat(opt.getAttribute('data-rate') || 0),
                            min: parseInt(opt.getAttribute('data-min') || 0),
                            max: parseInt(opt.getAttribute('data-max') || 0),
                            platform: mappedPlatform,
                            serviceType: serviceType
                        });
                    }
                });
            }
            return svcs;
        }, link);
        
        console.log(` -> Tìm thấy ${servicesOnPage.length} máy chủ.`);
        allServices = allServices.concat(servicesOnPage);
    }
    
    console.log(`Tổng cộng thu thập được: ${allServices.length} máy chủ.`);
    
    if (allServices.length > 0) {
        console.log('Xoá dữ liệu cũ và lưu vào DB...');
        await prisma.serverService.deleteMany();
        
        const dbData = allServices.map(s => {
            // Giá bán = Giá gốc + 20% (Ví dụ)
            const costPrice = s.price;
            const sellPrice = Math.ceil(costPrice * 1.2);
            
            return {
                platform: s.platform,
                serviceType: s.serviceType,
                name: `MC ${s.id} - ${s.name.replace(/^Máy chủ \d+\s*[-:]?\s*/i, '').substring(0, 80)}`,
                price: sellPrice,
                costPrice: costPrice,
                min: s.min > 0 ? s.min : 100,
                max: s.max > 0 ? s.max : 10000,
                desc: 'Nguồn: Baostar.net',
                status: 'hoat_dong',
                hot: false,
                apiServiceId: s.id
            }
        });
        
        await prisma.serverService.createMany({ data: dbData });
        console.log('Đã nạp vào Database thành công!');
    }
    
    await browser.close();
}

scrape().catch(console.error).finally(() => prisma.$disconnect());
