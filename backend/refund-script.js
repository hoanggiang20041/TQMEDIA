const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const order = await prisma.order.findUnique({ where: { id: '#ORD-2637' } });
  if (order && (order.status === 'cancelled' || order.status === 'Đã hủy')) {
    const user = await prisma.user.findUnique({ where: { id: order.userId } });
    if (user) {
      const newBalance = user.balance + order.totalNum;
      await prisma.user.update({ where: { id: user.id }, data: { balance: newBalance } });
      await prisma.transaction.create({
        data: {
          id: '#TRX-' + Math.floor(1000 + Math.random() * 9000),
          userId: user.id,
          type: 'HOÀN TIỀN',
          amount: '+' + new Intl.NumberFormat('vi-VN').format(order.totalNum) + ' ₫',
          balance: new Intl.NumberFormat('vi-VN').format(newBalance) + ' ₫',
          desc: 'Hoàn tiền đơn ' + order.id + ' (Lỗi API Máy chủ)',
          typeClass: 'text-green-400 bg-green-400/10 border-green-400/30'
        }
      });
      console.log('Refunded ' + order.totalNum + ' to ' + user.name);
    }
  } else {
    console.log('Order not found or not cancelled');
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
