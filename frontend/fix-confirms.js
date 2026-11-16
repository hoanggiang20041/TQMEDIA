const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Case 1: if (!confirm(msg)) return;
  content = content.replace(/if\s*\(!confirm\((.*?)\)\)\s*return;/g, 
    "const __confirmResult = await MySwal.fire({ title: 'Xác nhận', text: $1, icon: 'warning', showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy' });\n    if (!__confirmResult.isConfirmed) return;");

  // Case 2: if (confirm(msg)) { ... } 
  // We can't easily regex `{ ... }` spanning multiple lines safely.
  // Instead of full block, replace `if (confirm(msg)) {` with:
  // const __confirmResult = await MySwal.fire({ title: 'Xác nhận', text: msg, icon: 'warning', showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy' });
  // if (__confirmResult.isConfirmed) {
  content = content.replace(/if\s*\(\s*confirm\((.*?)\)\s*\)\s*\{/g, 
    "const __confirmResult = await MySwal.fire({ title: 'Xác nhận', text: $1, icon: 'warning', showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy' });\n    if (__confirmResult.isConfirmed) {");

  // Case 3: const confirmDeposit = window.confirm(`...`);
  content = content.replace(/const (\w+) = window\.confirm\((.*?)\);/g, 
    "const __confirmObj = await MySwal.fire({ title: 'Xác nhận', text: $2, icon: 'warning', showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy' });\n      const $1 = __confirmObj.isConfirmed;");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
