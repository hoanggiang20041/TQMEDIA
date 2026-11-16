const fs = require('fs');
const paths = ['facebook', 'tiktok', 'instagram', 'youtube', 'google'].map(p => `src/app/dashboard/${p}/page.tsx`);

paths.forEach(p => {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');

    const oldStr = "body: JSON.stringify({ code: voucherCode, orderTotal: total, applicableType: 'ALL' })";
    const newStr = "body: JSON.stringify({ code: voucherCode, orderTotal: total, applicableType: 'SERVICES', itemId: currentServer?.id })";

    content = content.replace(oldStr, newStr);
    fs.writeFileSync(p, content, 'utf8');
  }
});

console.log('Fixed applicableType and itemId in voucher apply.');
