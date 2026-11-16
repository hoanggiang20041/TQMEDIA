const fs = require('fs');
const paths = ['facebook', 'tiktok', 'instagram', 'youtube', 'google'].map(p => `src/app/dashboard/${p}/page.tsx`);

paths.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');

  // If already closed, don't close again
  if (!content.includes('</>\n              )}\n  \n              {/* Total Calculation */}')) {
    content = content.replace(/<\/div>\s*\{\/\* Total Calculation \*\/\}/g, '</div>\n              </>\n              )}\n  \n              {/* Total Calculation */}');
  }

  // Fix garbled text that wasn't caught
  content = content.replace(/M gi\?m gi \(N\?u c\)/g, 'Mã giảm giá (Nếu có)');
  content = content.replace(/Nh\?p m gi\?m gi\.\.\./g, 'Nhập mã giảm giá...');
  content = content.replace(/Áp dụng/g, 'Áp dụng');
  content = content.replace(/ Áp dụng m/g, 'Đã áp dụng mã');

  fs.writeFileSync(p, content, 'utf8');
});

console.log('Fixed syntax error successfully.');
