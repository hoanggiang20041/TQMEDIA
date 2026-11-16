const fs = require('fs');
const paths = ['facebook', 'tiktok', 'instagram', 'youtube', 'google'].map(p => `src/app/dashboard/${p}/page.tsx`);

paths.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');

  // Fix garbled text
  content = content.replace(/M gi\?m gi \(N\?u c\)/g, 'Mã giảm giá (Nếu có)');
  content = content.replace(/Nh\?p m gi\?m gi\.\.\./g, 'Nhập mã giảm giá...');
  content = content.replace(/p d\?ng/g, 'Áp dụng');
  content = content.replace(/ p d\?ng m/g, 'Đã áp dụng mã');
  content = content.replace(/Gi\?m/g, 'Giảm');
  content = content.replace(/\}d<\/p>/g, '}đ</p>');

  // Wrap Voucher input with orderMode === 'single'
  content = content.replace(/\{\/\* Voucher Input \*\/\}/g, "{orderMode === 'single' && (\n              <>\n              {/* Voucher Input */}");
  content = content.replace(/\{appliedVoucher && <p className="text-green-400 text-xs font-medium">Đã áp dụng mã \{appliedVoucher\.code\}: Giảm \{fmt\(appliedVoucher\.discountAmount\)\}đ<\/p>\}\n              <\/div>/g, '{appliedVoucher && <p className="text-green-400 text-xs font-medium">Đã áp dụng mã {appliedVoucher.code}: Giảm {fmt(appliedVoucher.discountAmount)}đ</p>}\n              </div>\n              </>\n              )}');

  // Fix total calculation view
  content = content.replace(/<span className="text-cyan-400 font-bold text-2xl">\{fmt\(total\)\}đ<\/span>/g, '<span className="text-cyan-400 font-bold text-2xl">{fmt(appliedVoucher ? total - appliedVoucher.discountAmount : total)}đ</span>');

  fs.writeFileSync(p, content, 'utf8');
});

console.log('Fixed pages successfully.');
