const fs = require('fs');

let content = fs.readFileSync('src/server.ts', 'utf8');

// Replace POST /api/admin/resources
content = content.replace(
  /const { name, description, price, type, thumbnail, stockData, status } = req\.body;\s*const resource = await prisma\.resource\.create\({[\s\S]*?}\);/m,
  \`const { name, category, description, price, type, thumbnail, stockData, status } = req.body;
    const resource = await prisma.resource.create({
      data: { name, category: category || 'Khác', description, price: Number(price), type, thumbnail, stockData, status }
    });\`
);

// Replace PUT /api/admin/resources/:id
content = content.replace(
  /const { name, description, price, type, thumbnail, stockData, status } = req\.body;\s*const resource = await prisma\.resource\.update\({[\s\S]*?}\);/gm,
  \`const { name, category, description, price, type, thumbnail, stockData, status } = req.body;
    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: { name, category: category || 'Khác', description, price: Number(price), type, thumbnail, stockData, status }
    });\`
);

fs.writeFileSync('src/server.ts', content, 'utf8');
console.log('Backend API updated for category!');
