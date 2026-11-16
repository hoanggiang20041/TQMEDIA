const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/dashboard/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // We want to replace headers: { 'Content-Type': 'application/json' }
  // with headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
  // Only inside fetch calls to API.

  content = content.replace(/headers:\s*{\s*'Content-Type':\s*'application\/json'\s*}/g, 
    "headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
