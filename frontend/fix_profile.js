const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'profile', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The replacements will convert the hardcoded white theme to use our Tailwind theme variables.
const replacements = [
  { search: /bg-white/g, replace: 'glass-panel' },
  { search: /border-gray-100/g, replace: 'border-outline-variant/30' },
  { search: /border-gray-200/g, replace: 'border-outline-variant/50' },
  { search: /text-gray-800/g, replace: 'text-on-surface' },
  { search: /text-gray-700/g, replace: 'text-on-surface/90' },
  { search: /text-gray-600/g, replace: 'text-on-surface-variant' },
  { search: /text-gray-500/g, replace: 'text-on-surface-variant/70' },
  { search: /bg-gray-50\/50/g, replace: 'bg-surface-variant/30' },
  { search: /bg-gray-50/g, replace: 'bg-surface-variant/20' },
  { search: /bg-\[\#e9ecef\]/g, replace: 'bg-surface-variant/50' },
  { search: /border-\[\#5552d9\]/g, replace: 'border-primary' },
  { search: /text-\[\#5552d9\]/g, replace: 'text-primary' },
  { search: /bg-\[\#5552d9\]/g, replace: 'btn-primary' },
  { search: /hover:bg-\[\#4643c7\]/g, replace: '' }, // let btn-primary handle hover
  { search: /focus:border-\[\#5552d9\]/g, replace: 'focus:border-primary' },
  { search: /shadow-\[0_2px_10px_rgba\(0,0,0,0\.05\)\]/g, replace: 'shadow-lg shadow-black/5' },
  { search: /bg-red-50/g, replace: 'bg-error/10' },
  { search: /text-red-500/g, replace: 'text-error' },
  { search: /border-red-100/g, replace: 'border-error/30' },
];

replacements.forEach(r => {
  content = content.replace(r.search, r.replace);
});

// A few specific fixes for the glass-panel that replaces bg-white on inputs
// Inputs should use input-glass instead of glass-panel
content = content.replace(/className="(w-full flex-1 )?glass-panel border/g, 'className="$1input-glass border');
content = content.replace(/className="w-full glass-panel border/g, 'className="w-full input-glass border');
content = content.replace(/className="flex-1 glass-panel border/g, 'className="flex-1 input-glass border');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed profile/page.tsx');
