const puppeteer = require('puppeteer');
async function run() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('https://smm.baostar.net/dang-nhap', {waitUntil: 'networkidle2'});
    await page.type('input[name="username"]', 'quanlam315');
    await page.type('input[name="password"]', '123456789z');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));
    const html = await page.content();
    const fs = require('fs');
    fs.writeFileSync('baostar_home.html', html);
    await browser.close();
}
run();
