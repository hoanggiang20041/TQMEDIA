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
    
    // Add min-w-0 to the voucher input to allow it to shrink
    content = content.replace(
      /className="flex-1 bg-white\/5 border border-outline-variant\/30/g,
      'className="flex-1 min-w-0 w-full bg-white/5 border border-outline-variant/30'
    );
    
    // Also check if there are other flex-1 inputs (like maybe the bulk textarea? No, that's not flex row usually)
    // Make sure the flex container itself has no overflow issues, but min-w-0 on the input is the correct fix for flex items refusing to shrink.

    fs.writeFileSync(file, content);
    console.log('Fixed voucher input overflow in ' + file);
  }
});
