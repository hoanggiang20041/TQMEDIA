const fs = require('fs'); 

// 1. Footer.tsx
let footer = fs.readFileSync('src/components/layout/Footer.tsx', 'utf8');
footer = footer.replace(/src=\"\/logo\.png\"/g, 'src={settings?.ui_logo || "/logo.png"}');
fs.writeFileSync('src/components/layout/Footer.tsx', footer);

// 2. Sidebar.tsx
let sidebar = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(/src=\"\/logo\.png\"/g, 'src={settings?.ui_logo || "/logo.png"}');
sidebar = sidebar.replace(/const { role, logout } = useRole\(\)/, 'const { role, logout, settings } = useRole()');
fs.writeFileSync('src/components/layout/Sidebar.tsx', sidebar);

// 3. TopNavbar.tsx
let topnav = fs.readFileSync('src/components/layout/TopNavbar.tsx', 'utf8');
topnav = topnav.replace(/src=\"\/logo\.png\"/g, 'src={settings?.ui_logo || "/logo.png"}');
topnav = topnav.replace(/const { user } = useRole\(\)/, 'const { user, settings } = useRole()');
fs.writeFileSync('src/components/layout/TopNavbar.tsx', topnav);

console.log('Fixed TopNavbar, Sidebar, Footer');
