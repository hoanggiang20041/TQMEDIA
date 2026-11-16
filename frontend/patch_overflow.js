const fs = require('fs');
const files = [
  'd:/TQMEDIA/frontend/src/app/dashboard/facebook/page.tsx',
  'd:/TQMEDIA/frontend/src/app/dashboard/tiktok/page.tsx',
  'd:/TQMEDIA/frontend/src/app/dashboard/instagram/page.tsx',
  'd:/TQMEDIA/frontend/src/app/dashboard/youtube/page.tsx',
  'd:/TQMEDIA/frontend/src/app/dashboard/google/page.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // 1. Fix the header "Khởi tạo chiến dịch" and the orderMode toggle buttons overflowing
    content = content.replace(
      /className="flex justify-between items-center mb-5"/g,
      'className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 mb-5"'
    );
    
    // 2. Make the toggle buttons grid on mobile to take full width evenly
    content = content.replace(
      /className="flex bg-surface-variant\/50 rounded-lg p-1 border border-outline-variant\/20"/g,
      'className="grid grid-cols-2 md:flex bg-surface-variant/50 rounded-lg p-1 border border-outline-variant/20 w-full md:w-auto"'
    );
    
    // 3. Prevent description from overflowing due to long text without spaces
    content = content.replace(
      /whitespace-pre-wrap"/g,
      'whitespace-pre-wrap break-words"'
    );
    
    // 4. Ensure the Apply voucher button doesn't squish
    content = content.replace(
      /className="bg-cyan-500\/10 hover:bg-cyan-500\/20 text-cyan-400 border border-cyan-500\/30 font-medium px-4 py-2 rounded-lg transition-all"/g,
      'className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium px-4 py-2 rounded-lg transition-all whitespace-nowrap shrink-0"'
    );
    
    // 5. Ensure the server name doesn't force wrap awkwardly
    content = content.replace(
      /className="text-on-surface font-medium text-sm flex items-center gap-2"/g,
      'className="text-on-surface font-medium text-sm flex flex-wrap items-center gap-2 break-words"'
    );

    fs.writeFileSync(file, content);
    console.log('Fixed overflow in ' + file);
  }
});
