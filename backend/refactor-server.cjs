const fs = require('fs');

const path = 'd:/TQMEDIA/backend/src/server.ts';
let code = fs.readFileSync(path, 'utf8');

// Find start and end indices of the resource section
const startIdx = code.indexOf('// --- RESOURCES API (ADMIN) ---');

// Find the start of the next section, which might be `// Admin Notifications API`
const endIdx = code.indexOf('// Admin Notifications API', startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.log("Could not find the bounds");
  process.exit(1);
}

const newApiCode = `// --- RESOURCES API (ADMIN) ---
app.get('/api/admin/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({ 
      include: { variants: true },
      orderBy: { createdAt: 'desc' } 
    });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải danh sách tài nguyên' });
  }
});

app.post('/api/admin/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, iconPlatform, description, thumbnail, type, status, variants } = req.body;
    
    // variants should be an array of { name, importPrice, price, stockData }
    const resource = await prisma.resource.create({
      data: { 
        name, category: category || 'Khác', iconPlatform, description, type, thumbnail, status,
        variants: {
          create: variants || []
        }
      },
      include: { variants: true }
    });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo tài nguyên' });
  }
});

app.put('/api/admin/resources/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, iconPlatform, description, type, thumbnail, status, variants } = req.body;
    const resourceId = req.params.id;

    const resource = await prisma.resource.update({
      where: { id: resourceId },
      data: { name, category: category || 'Khác', iconPlatform, description, type, thumbnail, status },
      include: { variants: true }
    });

    // Handle variants manually to support create, update, delete
    if (variants && Array.isArray(variants)) {
      const incomingIds = variants.map(v => v.id).filter(id => id);
      // Delete missing variants
      await prisma.resourceVariant.deleteMany({
        where: { resourceId, id: { notIn: incomingIds } }
      });
      // Upsert given variants
      for (const v of variants) {
        if (v.id) {
          await prisma.resourceVariant.update({
            where: { id: v.id },
            data: { name: v.name, importPrice: Number(v.importPrice), price: Number(v.price), stockData: v.stockData }
          });
        } else {
          await prisma.resourceVariant.create({
            data: { resourceId, name: v.name, importPrice: Number(v.importPrice), price: Number(v.price), stockData: v.stockData }
          });
        }
      }
    }

    const updatedResource = await prisma.resource.findUnique({ where: { id: resourceId }, include: { variants: true } });
    res.json(updatedResource);
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

// --- RESOURCES API (USER) ---
app.get('/api/resources', async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { status: 'active' },
      include: { variants: true },
      orderBy: { createdAt: 'desc' }
    });
    const safeResources = resources.map(r => {
      const safeVariants = r.variants.map(v => {
        let stockCount = 0;
        if (r.type === 'ACCOUNT' && v.stockData) {
          stockCount = v.stockData.split(/\\n|\\r?\\n/).filter(l => l.trim().length > 0).length;
        }
        const { stockData, ...restV } = v;
        return { ...restV, stockCount };
      });
      const { stockData, price, ...restR } = r; // Strip legacy fields
      return { ...restR, variants: safeVariants };
    });
    res.json(safeResources);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải danh sách tài nguyên' });
  }
});

app.get('/api/resources/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.resourceOrder.findMany({
      where: { userId: res.locals.userId },
      include: { 
        resource: { select: { name: true, type: true, iconPlatform: true } },
        variant: { select: { name: true } }
      },
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
    const { quantity = 1, voucherCode, discount = 0, variantId } = req.body;
    const userId = res.locals.userId;

    if (quantity < 1) return res.status(400).json({ error: 'Số lượng không hợp lệ' });
    if (!variantId) return res.status(400).json({ error: 'Vui lòng chọn loại tài nguyên' });

    await prisma.$transaction(async (tx) => {
      const resource = await tx.resource.findUnique({ where: { id } });
      if (!resource || resource.status !== 'active') throw new Error('Tài nguyên không tồn tại hoặc đã ngừng bán');

      const variant = await tx.resourceVariant.findUnique({ where: { id: variantId } });
      if (!variant || variant.resourceId !== id) throw new Error('Phân loại không hợp lệ');

      let deliveredData = '';
      let remainingStock = variant.stockData;

      if (resource.type === 'ACCOUNT') {
        const lines = variant.stockData.split(/\\n|\\r?\\n/).filter((l: string) => l.trim().length > 0);
        if (lines.length < quantity) throw new Error(\`Kho chỉ còn \${lines.length} sản phẩm\`);

        const takenLines = lines.slice(0, quantity);
        deliveredData = takenLines.join('\\n');
        remainingStock = lines.slice(quantity).join('\\n');
      } else {
        deliveredData = variant.stockData;
      }

      let totalAmount = variant.price * quantity;
      let totalImportAmount = variant.importPrice * quantity;

      if (voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
        if (!voucher || !voucher.isActive) throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
        if (voucher.validTo < new Date() || voucher.validFrom > new Date()) throw new Error('Mã giảm giá ngoài thời gian hiệu lực.');
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new Error('Mã giảm giá đã hết lượt sử dụng.');
        
        await tx.voucher.update({
          where: { code: voucherCode },
          data: { usedCount: voucher.usedCount + 1 }
        });
        
        totalAmount = Math.max(0, totalAmount - Number(discount));
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Không tìm thấy user');
      if (user.balance < totalAmount) throw new Error('Số dư không đủ');

      await tx.user.update({
        where: { id: userId },
        data: { balance: user.balance - totalAmount }
      });

      await tx.transaction.create({
        data: {
          id: '#TRX-' + Math.floor(Math.random() * 1000000),
          userId,
          type: 'TRỪ TIỀN',
          amount: \`-\${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}\`,
          balance: \`\${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(user.balance - totalAmount)}\`,
          desc: \`Mua \${quantity} \${resource.name} (\${variant.name})\`,
          typeClass: 'bg-red-500/20 text-red-400'
        }
      });

      if (resource.type === 'ACCOUNT') {
        await tx.resourceVariant.update({
          where: { id: variantId },
          data: {
            stockData: remainingStock,
            soldCount: variant.soldCount + quantity
          }
        });
      }

      await tx.resourceOrder.create({
        data: {
          id: '#RORD-' + Math.floor(Math.random() * 1000000),
          userId,
          resourceId: id,
          variantId: variant.id,
          quantity,
          totalAmount,
          totalImportAmount,
          deliveredData
        }
      });
    });

    res.json({ success: true, message: 'Mua tài nguyên thành công' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Lỗi xử lý thanh toán' });
  }
});

`;

const newCode = code.substring(0, startIdx) + newApiCode + code.substring(endIdx);
fs.writeFileSync(path, newCode, 'utf8');
console.log("Successfully replaced the resource API section.");
