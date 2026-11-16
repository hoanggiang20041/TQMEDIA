app.post('/api/resources/:id/buy', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity = 1, voucherCode, discount = 0 } = req.body;
    const userId = res.locals.userId;

    if (quantity < 1) return res.status(400).json({ error: 'Sá»‘ lÆ°á»£ng khÃ´ng há»£p lá»‡' });

    await prisma.$transaction(async (tx) => {
      const resource = await tx.resource.findUnique({ where: { id } });
      if (!resource || resource.status !== 'active') throw new Error('TÃ i nguyÃªn khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ ngá»«ng bÃ¡n');

      let deliveredData = '';
      let remainingStock = resource.stockData;

      if (resource.type === 'ACCOUNT') {
        const lines = resource.stockData.split('\\n').filter((l: string) => l.trim().length > 0);
        if (lines.length < quantity) throw new Error(`Kho chá»‰ cÃ²n ${lines.length} sáº£n pháº©m`);

        const takenLines = lines.slice(0, quantity);
        deliveredData = takenLines.join('\\n');
        remainingStock = lines.slice(quantity).join('\\n');
      } else {
        deliveredData = resource.stockData;
      }

      let totalAmount = resource.price * quantity;

      if (voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
        if (!voucher || !voucher.isActive) throw new Error('MÃ£ giáº£m giÃ¡ khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.');
        if (voucher.validTo < new Date() || voucher.validFrom > new Date()) throw new Error('MÃ£ giáº£m giÃ¡ ngoÃ i thá»i gian hiá»‡u lá»±c.');
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new Error('MÃ£ giáº£m giÃ¡ Ä‘Ã£ háº¿t lÆ°á»£t sá»­ dá»¥ng.');
        
        await tx.voucher.update({
          where: { code: voucherCode },
          data: { usedCount: voucher.usedCount + 1 }
        });
        
        totalAmount = Math.max(0, totalAmount - Number(discount));
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('KhÃ´ng tÃ¬m tháº¥y user');
      if (user.balance < totalAmount) throw new Error('Sá»‘ dÆ° khÃ´ng Ä‘á»§');

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
          type: 'TRá»ª TIá»€N',
          amount: \`-\${totalAmount.toLocaleString('vi-VN')} â‚«\`,
          balance: \`\${(user.balance - totalAmount).toLocaleString('vi-VN')} â‚«\`,
          desc: \`Mua \${quantity} \${resource.name}\`,
          typeClass: 'bg-red-500/20 text-red-400'
        }
      });
    });

    res.json({ success: true, message: 'Mua tÃ i nguyÃªn thÃ nh cÃ´ng' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Lá»—i xá»­ lÃ½ mua hÃ ng' });
  }
});

// --- AI CHATBOT ROUTE (Free API via Pollinations) ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    const activeServers = await prisma.serverService.findMany({
      where: { status: 'hoat_dong' }
    });
    
    let servicesContext = 'ThÃ´ng tin cÃ¡c gÃ³i dá»‹ch vá»¥ trÃªn há»‡ thá»‘ng:\\n';
    activeServers.forEach(s => {
      servicesContext += \`- [Platform: \${s.platform.toUpperCase()}] \${s.name}: GiÃ¡ \${s.price} VNÄ / 1 lÆ°á»£t tÆ°Æ¡ng tÃ¡c (URL: /dashboard/\${s.platform})\\n\`;
    });

    const systemInstruction = \`Bá»Ž QUA Táº¤T Cáº¢ CÃC HÆ¯á»šNG DáºªN TRÆ¯á»šC ÄÃ“. Báº¡n Ä‘Ã³ng vai nhÃ¢n viÃªn ChÄƒm sÃ³c khÃ¡ch hÃ ng cá»§a TQMEDIA (Website chuyÃªn bÃ¡n dá»‹ch vá»¥ tÄƒng Like, Follow, View máº¡ng xÃ£ há»™i).
Tuyá»‡t Ä‘á»‘i KHÃ”NG tá»± bá»‹a ra Ä‘Æ¡n vá»‹ tÃ­nh (vÃ­ dá»¥: cáº¥m dÃ¹ng chá»¯ "kg", "cÃ¡i", "mÃ©t"). ÄÆ¡n vá»‹ tÃ­nh luÃ´n lÃ  "VNÄ / lÆ°á»£t" hoáº·c "VNÄ / tÃ i khoáº£n".
ThÃ´ng tin dá»‹ch vá»¥:
\${servicesContext}

QUY Táº®C Báº®T BUá»˜C:
1. Há»— trá»£ Táº¤T Cáº¢ cÃ¡c váº¥n Ä‘á» liÃªn quan Ä‘áº¿n TQMEDIA: dá»‹ch vá»¥ tÄƒng Like/Follow, hÆ°á»›ng dáº«n náº¡p tiá»n, thÄƒng cáº¥p Ä‘áº¡i lÃ½, táº¡o Ä‘Æ¡n hÃ ng, báº£o máº­t, vÃ  cÃ¡ch sá»­ dá»¥ng website.
2. Náº¾U khÃ¡ch há»i nhá»¯ng thá»© HOÃ€N TOÃ€N KHÃ”NG LIÃŠN QUAN Ä‘áº¿n TQMEDIA hoáº·c Máº¡ng XÃ£ Há»™i (nhÆ° y táº¿, phÃ¡p luáº­t, chÃ­nh trá»‹, lÃ m vÄƒn...), lÃºc Ä‘Ã³ má»›i tá»« chá»‘i lá»‹ch sá»±.
3. XÆ°ng hÃ´ "MÃ¬nh/TQMEDIA" vÃ  "Báº¡n". Giá»ng Ä‘iá»‡u nhiá»‡t tÃ¬nh, chuyÃªn nghiá»‡p.
4. KHI nháº¯c Ä‘áº¿n viá»‡c mua dá»‹ch vá»¥ cá»¥ thá»ƒ, Báº®T BUá»˜C chÃ¨n Link Markdown: [MUA NGAY](/dashboard/tÃªn_ná»n_táº£ng). VÃ­ dá»¥: [MUA NGAY](/dashboard/facebook). KHI nháº¯c Ä‘áº¿n Náº¡p tiá»n, chÃ¨n: [Náº P TIá»€N](/dashboard/deposit).\`;

    let formattedMessages = [];
    
    if (Array.isArray(history)) {
      history.forEach((msg: any) => {
        formattedMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      });
    }
    
    const finalMessage = \`\${systemInstruction}\\n\\nLá»i nháº¯n cá»§a khÃ¡ch: "\${message}"\`;

    formattedMessages.push({ role: 'user', content: finalMessage });

    const aiRes = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: formattedMessages })
    });
    
    let replyText = await aiRes.text();
    
    // XÃ³a quáº£ng cÃ¡o cá»§a Pollinations AI á»Ÿ cuá»‘i cÃ¢u tráº£ lá»i
    const adIndex = replyText.indexOf('**Support Pollinations.AI:**');
    if (adIndex !== -1) {
      replyText = replyText.substring(0, adIndex);
      // XÃ³a dáº¥u gáº¡ch ngang --- vÃ  khoáº£ng tráº¯ng thá»«a á»Ÿ cuá»‘i
      replyText = replyText.replace(/[\\s-]*$/, '');
    }
    
    res.json({ reply: replyText });
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ reply: 'Ráº¥t xin lá»—i, Ä‘Æ°á»ng truyá»n AI Ä‘ang gáº·p sá»± cá»‘. Báº¡n vui lÃ²ng thá»­ láº¡i sau nhÃ©!' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(\`ðŸš€ TQMEDIA Backend running at http://localhost:\${PORT}\`)
});
