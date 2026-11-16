const fs = require('fs'); 
const glob = require('glob'); 
glob.sync('src/app/dashboard/**/*.tsx').concat(glob.sync('src/components/**/*.tsx')).forEach(file => { 
  let content = fs.readFileSync(file, 'utf8'); 
  if(content.includes('https://zalo.me/0123456789')) { 
    content = content.replace(/\"https:\/\/zalo\.me\/0123456789\"/g, '{settings?.contact_zalo || "#"}'); 
    content = content.replace(/'https:\/\/zalo\.me\/0123456789'/g, 'settings?.contact_zalo || "#"');
    if (!content.includes('settings } = useRole')) { 
      content = content.replace(/} = useRole\(\)/g, ', settings } = useRole()'); 
    } 
    fs.writeFileSync(file, content); 
    console.log('Updated', file); 
  } 
});
