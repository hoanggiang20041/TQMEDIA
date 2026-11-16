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
  if (content.includes("if (currentServer?.status === 'bao_tri') return MySwal.fire")) continue; // already modified
  
  content = content.replace(
    "if (!currentServer) return MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Vui lòng chọn máy chủ!' })",
    "if (!currentServer) return MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Vui lòng chọn máy chủ!' })\n    if (currentServer?.status === 'bao_tri') return MySwal.fire({ icon: 'error', title: 'Bảo trì', text: 'Máy chủ này đang được bảo trì, vui lòng chọn máy chủ khác!' })"
  );
  
  fs.writeFileSync(file, content, 'utf8');
  console.log("Updated " + file);
}
