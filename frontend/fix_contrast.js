const fs = require('fs');
let c = fs.readFileSync('D:/TQMEDIA/frontend/src/app/dashboard/page.tsx', 'utf8');

c = c.replace('<h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">', '<h1 className="text-xl md:text-2xl font-bold text-on-surface tracking-tight">');
c = c.replace('<h3 className="text-white font-bold text-sm md:text-lg flex flex-wrap items-center gap-2 md:hidden">', '<h3 className="text-on-surface font-bold text-sm md:text-lg flex flex-wrap items-center gap-2 md:hidden">');
c = c.replace('<h3 className="hidden md:flex text-white font-bold text-lg items-center gap-2 mb-3">', '<h3 className="hidden md:flex text-on-surface font-bold text-lg items-center gap-2 mb-3">');
c = c.replace('<p className="text-2xl md:text-[28px] font-bold text-white tracking-tight break-words">{card.value}</p>', '<p className="text-2xl md:text-[28px] font-bold text-on-surface tracking-tight break-words">{card.value}</p>');
c = c.replace('<h2 className="text-lg font-semibold text-white tracking-tight">', '<h2 className="text-lg font-semibold text-on-surface tracking-tight">');
c = c.replace('<h2 className="text-lg font-semibold text-white tracking-tight mb-5">', '<h2 className="text-lg font-semibold text-on-surface tracking-tight mb-5">');

c = c.replace('className="py-4 pl-2 pr-4 text-white text-sm font-medium max-w-[250px] truncate"', 'className="py-4 pl-2 pr-4 text-on-surface text-sm font-medium max-w-[250px] truncate"');
c = c.replace('className="py-4 pr-4 text-white text-sm font-medium"', 'className="py-4 pr-4 text-on-surface text-sm font-medium"');
c = c.replace('<p className="text-white font-medium text-sm">Tang Tuong Tác TikTok</p>', '<p className="text-on-surface font-medium text-sm">Tang Tuong Tác TikTok</p>');
c = c.replace('<p className="text-white font-medium text-sm">Buff Like & Follow Facebook</p>', '<p className="text-on-surface font-medium text-sm">Buff Like & Follow Facebook</p>');
c = c.replace('<p className="text-white font-medium text-sm">Qu?ng cáo Google Ads</p>', '<p className="text-on-surface font-medium text-sm">Qu?ng cáo Google Ads</p>');

fs.writeFileSync('D:/TQMEDIA/frontend/src/app/dashboard/page.tsx', c);
console.log('Fixed contrast on dashboard page');
