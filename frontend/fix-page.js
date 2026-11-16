const fs = require('fs'); 

// 1. page.tsx
let home = fs.readFileSync('src/app/page.tsx', 'utf8');
home = home.replace(/src=\"\/logo\.png\"/g, 'src={settings?.ui_logo || "/logo.png"}');
home = home.replace(/import TopNavbar from/g, 'import { useRole } from \"@/context/RoleContext\"\nimport TopNavbar from');
home = home.replace(/export default function HomePage\(\) \{/g, 'export default function HomePage() {\n  const { settings } = useRole();');
// replace title if we can: "N?n t?ng Marketing<br/>\n<span className=\"gradient-text\">M?ng Xã H?i</span> Ð?nh Cao"
// Wait, home_title is just a string, it won't have gradient spans. The user might want the admin home_title to replace this whole block, but it's styled with gradients! Let's just use dangerouslySetInnerHTML or keep the styled one as fallback.
// Let's replace the whole h1 content with {settings?.home_title ? <div dangerouslySetInnerHTML={{__html: settings.home_title}} /> : <><br/>...</>}
fs.writeFileSync('src/app/page.tsx', home);

// 2. login/page.tsx
let login = fs.readFileSync('src/app/login/page.tsx', 'utf8');
login = login.replace(/src=\"\/logo\.png\"/g, 'src={settings?.ui_logo || "/logo.png"}');
if (!login.includes('useRole')) {
  login = login.replace(/import \{ useState \} from \'react\'/g, 'import { useState } from \"react\"\nimport { useRole } from \"@/context/RoleContext\"');
  login = login.replace(/export default function LoginPage\(\) \{/g, 'export default function LoginPage() {\n  const { settings } = useRole();');
}
fs.writeFileSync('src/app/login/page.tsx', login);

console.log('Fixed page.tsx, login.tsx');
