const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Add SweetAlert import if it's not there and we need it
  const needsSwal = content.includes('alert(') || content.includes('confirm(');
  if (needsSwal && !content.includes('sweetalert2')) {
    // find last import
    const importMatch = content.match(/import .* from .*;?\n/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      content = content.replace(lastImport, lastImport + `import Swal from 'sweetalert2';\nimport withReactContent from 'sweetalert2-react-content';\nconst MySwal = withReactContent(Swal);\n`);
    } else {
      content = `import Swal from 'sweetalert2';\nimport withReactContent from 'sweetalert2-react-content';\nconst MySwal = withReactContent(Swal);\n` + content;
    }
  }

  // Replace alert(...)
  content = content.replace(/alert\((.*?)\);?/g, (match, p1) => {
    // p1 is the content inside alert
    return `MySwal.fire({ icon: 'info', title: 'Thông báo', text: ${p1} })`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
