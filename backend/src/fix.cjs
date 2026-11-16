const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ Nạp tiền[\s\S]*?(?=\/\/ --- ADMIN ROUTES ---)/;

const newCode = `// Nạp tiền thủ công (Đã bị vô hiệu hóa vì chuyển sang SePay Webhook)
app.post('/api/deposits', authenticateToken, async (req, res) => {
  return res.status(400).json({ error: 'Tính năng nạp tiền thủ công đã bị khóa. Vui lòng quét mã QR và chuyển khoản đúng cú pháp để hệ thống tự động cộng tiền.' })
})

// --- SEPAY WEBHOOK ---
app.post('/api/sepay/webhook', async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.includes(process.env.SEPAY_API_TOKEN || 'your_sepay_token_here')) {
      return res.status(401).json({ error: 'Unauthorized webhook' })
    }

    const {
      gateway,
      transferType,
      transferAmount,
      referenceCode,
      content
    } = req.body

    // Chỉ xử lý giao dịch nhận tiền (in)
    if (transferType !== 'in' || !transferAmount || transferAmount <= 0) {
      return res.json({ success: true, message: 'Ignored non-incoming transaction' })
    }

    const match = content.match(/NAP\\s+TQMEDIA\\s+([a-f0-9]{6})/i)
    if (!match) {
      return res.json({ success: true, message: 'No valid transfer code found' })
    }

    const transferCode = match[1].toLowerCase()
    
    // Tìm user có ID bắt đầu bằng transferCode
    const users = await prisma.user.findMany({
      where: { id: { startsWith: transferCode } }
    })

    if (users.length === 0) {
      return res.json({ success: true, message: 'User not found for code ' + transferCode })
    }

    const user = users[0]

    // Cộng tiền
    await prisma.$transaction(async (tx) => {
      const newBalance = user.balance + transferAmount
      
      const depositTxs = await tx.transaction.findMany({
        where: { userId: user.id, type: 'CỘNG TIỀN' }
      });
      let totalDeposited = depositTxs.reduce((sum, t) => {
        const numStr = t.amount.replace(/[^\\d]/g, '');
        return sum + (parseInt(numStr) || 0);
      }, 0);
      
      totalDeposited += transferAmount;

      const rankOrder = ['GUEST', 'HOC_VIEN', 'DAI_LY_4', 'DAI_LY_3', 'DAI_LY_2', 'DAI_LY_1', 'ADMIN'];
      const currentRankIndex = rankOrder.indexOf(user.role);
      
      let newRole = user.role;
      if (user.role !== 'ADMIN' && user.role !== 'HOC_VIEN') {
        if (totalDeposited >= 100000000 && currentRankIndex < rankOrder.indexOf('DAI_LY_1')) newRole = 'DAI_LY_1';
        else if (totalDeposited >= 30000000 && currentRankIndex < rankOrder.indexOf('DAI_LY_2')) newRole = 'DAI_LY_2';
        else if (totalDeposited >= 10000000 && currentRankIndex < rankOrder.indexOf('DAI_LY_3')) newRole = 'DAI_LY_3';
        else if (totalDeposited >= 2000000 && currentRankIndex < rankOrder.indexOf('DAI_LY_4')) newRole = 'DAI_LY_4';
      }

      await tx.user.update({ 
        where: { id: user.id }, 
        data: { balance: newBalance, role: newRole } 
      })

      const fmt = (val) => new Intl.NumberFormat('vi-VN').format(val)
      await tx.transaction.create({
        data: {
          id: \`#TRX-\${Math.floor(1000 + Math.random() * 9000)}\`,
          userId: user.id,
          type: 'CỘNG TIỀN',
          amount: \`+\${fmt(transferAmount)} ₫\`,
          balance: \`\${fmt(newBalance)} ₫\`,
          desc: \`Nạp tự động qua SePay (\${gateway || 'Ngân hàng'})\`,
          typeClass: 'text-green-400 bg-green-400/10 border-green-400/30'
        }
      })
    })
    
    return res.json({ success: true, message: 'Processed successfully' })
  } catch (err) {
    console.error('SePay Webhook Error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

`;

if (regex.test(code)) {
  code = code.replace(regex, newCode);
  fs.writeFileSync('server.ts', code);
  console.log('Successfully updated!');
} else {
  console.log('Regex did not match anything!');
}
