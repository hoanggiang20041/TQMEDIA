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
    
    // Reduce container paddings
    content = content.replace(/rounded-2xl p-6/g, 'rounded-2xl p-4 md:p-6');
    content = content.replace(/rounded-xl p-4/g, 'rounded-xl p-3 md:p-4');
    
    // Reduce gap between left and right panel
    content = content.replace(/gap-6 items-start/g, 'gap-4 md:gap-6 items-start');
    content = content.replace(/flex-col gap-6/g, 'flex-col gap-4 md:gap-6');
    
    // Reduce hero section margin
    content = content.replace(/gap-4 mb-6/g, 'gap-3 md:gap-4 mb-4 md:mb-6');
    
    // Reduce input sizes
    content = content.replace(/px-4 py-3/g, 'px-3 py-2.5 md:px-4 md:py-3');
    
    // Reduce total font size
    content = content.replace(/text-2xl\">([\s\S]*?)<\/span>/g, 'text-xl md:text-2xl\">$1</span>');
    
    // Reduce submit button size
    content = content.replace(/py-3\.5([\s\S]*?)text-lg/g, 'py-2.5 md:py-3.5$1text-base md:text-lg');
    
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  } else {
    console.log('Not found ' + file);
  }
});
