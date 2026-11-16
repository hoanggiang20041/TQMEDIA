const fs = require('fs');

const files = [
  'src/app/dashboard/admin/resources/page.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/\\`/g, '`');
  content = content.replace(/\\\${/g, '${');
  content = content.replace(/\\\\n/g, '\\n');
  fs.writeFileSync(f, content, 'utf8');
});

console.log('Fixed escaping in admin page.');
