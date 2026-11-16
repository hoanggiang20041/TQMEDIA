const fs = require('fs');
const paths = ['facebook', 'tiktok', 'instagram', 'youtube', 'google'].map(p => `src/app/dashboard/${p}/page.tsx`);

paths.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');

  // Remove the opening
  content = content.replace(/\{orderMode === 'single' && \(\s*<>\s*\{\/\* Voucher Input \*\/\}/g, '{/* Voucher Input */}');

  // Remove the closing
  content = content.replace(/<\/div>\s*<\/>\s*\)\}\s*\{\/\* Total Calculation \*\/\}/g, '</div>\n  \n              {/* Total Calculation */}');

  fs.writeFileSync(p, content, 'utf8');
});

console.log('Removed orderMode restriction for Voucher');
