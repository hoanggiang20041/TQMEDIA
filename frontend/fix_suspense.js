const fs = require('fs');
const files = [
  "d:/TQMEDIA/frontend/src/app/dashboard/facebook/page.tsx",
  "d:/TQMEDIA/frontend/src/app/dashboard/google/page.tsx",
  "d:/TQMEDIA/frontend/src/app/dashboard/instagram/page.tsx",
  "d:/TQMEDIA/frontend/src/app/dashboard/tiktok/page.tsx",
  "d:/TQMEDIA/frontend/src/app/dashboard/youtube/page.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('Suspense fallback')) continue; // already modified
  
  content = content.replace("import { useState", "import { useState, Suspense");
  
  const match = content.match(/export default function (\w+)\(\) \{/);
  if (match) {
    const compName = match[1];
    content = content.replace(/export default function \w+\(\) \{/, `function ${compName}Content() {`);
    content += `\n\nexport default function ${compName}() {\n  return (\n    <Suspense fallback={<div className="p-8 text-center text-white">Đang tải...</div>}>\n      <${compName}Content />\n    </Suspense>\n  )\n}\n`;
    fs.writeFileSync(file, content, 'utf8');
    console.log("Updated " + file);
  }
}
