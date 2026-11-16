const fs = require('fs');
const paths = ['facebook', 'tiktok', 'instagram', 'youtube', 'google', '../courses'].map(p => `src/app/dashboard/${p}/page.tsx`);

paths.forEach(p => {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');

    // Replace the class string
    const oldClass = 'className="flex-1 bg-surface-variant/30 border border-outline-variant/30 text-on-surface rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500/50 uppercase placeholder:text-on-surface-variant/50 placeholder:normal-case"';
    const newClass = 'className="flex-1 bg-white/5 border border-outline-variant/30 text-cyan-400 font-bold tracking-widest rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 uppercase placeholder:text-on-surface-variant/50 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"';

    content = content.replace(oldClass, newClass);

    fs.writeFileSync(p, content, 'utf8');
  }
});

console.log('Fixed voucher input text color.');
