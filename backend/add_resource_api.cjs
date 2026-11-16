const fs = require('fs');

let content = fs.readFileSync('src/server.ts', 'utf8');

const newApis = `
// --- RESOURCES API (ADMIN) ---
app.get('/api/admin/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải danh sách tài nguyên' });
  }
});

app.post('/api/admin/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, type, thumbnail, stockData, status } = req.body;
    const resource = await prisma.resource.create({
      data: { name, description, price: Number(price), type, thumbnail, stockData, status }
    });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo tài nguyên' });
  }
});

app.put('/api/admin/resources/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, type, thumbnail, stockData, status } = req.body;
    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: { name, description, price: Number(price), type, thumbnail, stockData, status }
    });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật tài nguyên' });
  }
});

app.delete('/api/admin/resources/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.resource.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa tài nguyên' });
  }
});

// --- RESOURCES API (CLIENT) ---
app.get('/api/resources', async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' }
    });
    const safeResources = resources.map(r => {
      const { stockData, ...rest } = r;
      let stockCount = 0;
      if (r.type === 'ACCOUNT' && r.stockData) {
        stockCount = r.stockData.split('\\n').filter(l => l.trim().length > 0).length;
      }
      return { ...rest, stockCount };
    });
    res.json(safeResources);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải tài nguyên' });
  }
});

app.get('/api/resources/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.resourceOrder.findMany({
      where: { userId: res.locals.userId },
      include: { resource: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải lịch sử mua' });
  }
});

app.post('/api/resources/:id/buy', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity = 1 } = req.body;
    const userId = res.locals.userId;

    if (quantity < 1) return res.status(400).json({ error: 'Số lượng không hợp lệ' });

    await prisma.$transaction(async (tx) => {
      const resource = await tx.resource.findUnique({ where: { id } });
      if (!resource || resource.status !== 'active') throw new Error('Tài nguyên không tồn tại hoặc đã ngừng bán');

      let deliveredData = '';
      let remainingStock = resource.stockData;

      if (resource.type === 'ACCOUNT') {
        const lines = resource.stockData.split('\\n').filter(l => l.trim().length > 0);
        if (lines.length < quantity) throw new Error(\`Kho chỉ còn \${lines.length} sản phẩm\`);

        const takenLines = lines.slice(0, quantity);
        deliveredData = takenLines.join('\\n');
        remainingStock = lines.slice(quantity).join('\\n');
      } else {
        deliveredData = resource.stockData;
      }

      const totalAmount = resource.price * quantity;

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user.balance < totalAmount) throw new Error('Số dư không đủ');

      await tx.user.update({
        where: { id: userId },
        data: { balance: user.balance - totalAmount }
      });

      await tx.resource.update({
        where: { id },
        data: {
          stockData: remainingStock,
          soldCount: resource.soldCount + quantity
        }
      });

      const orderId = '#RES-' + Math.floor(100000 + Math.random() * 900000).toString();
      await tx.resourceOrder.create({
        data: {
          id: orderId,
          userId,
          resourceId: id,
          quantity,
          totalAmount,
          deliveredData
        }
      });

      const trxId = '#TRX-' + Math.floor(100000 + Math.random() * 900000).toString();
      await tx.transaction.create({
        data: {
          id: trxId,
          userId,
          type: 'TRỪ TIỀN',
          amount: \`-\${totalAmount.toLocaleString('vi-VN')} ₫\`,
          balance: \`\${(user.balance - totalAmount).toLocaleString('vi-VN')} ₫\`,
          desc: \`Mua \${quantity} \${resource.name}\`,
          typeClass: 'bg-red-500/20 text-red-400'
        }
      });
    });

    res.json({ success: true, message: 'Mua tài nguyên thành công' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Lỗi xử lý mua hàng' });
  }
});

app.listen(PORT, () => {
`;

content = content.replace('app.listen(PORT, () => {', newApis);
fs.writeFileSync('src/server.ts', content, 'utf8');
console.log('Backend APIs appended!');
