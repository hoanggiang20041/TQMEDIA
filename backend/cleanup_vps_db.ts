import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find all fake/test deposit transactions
  const mockTxs = await prisma.transaction.findMany({
    where: {
      type: 'CỘNG TIỀN',
      OR: [
        { desc: { contains: 'MockBank' } },
        { desc: { contains: '(Thưởng' } }
      ]
    }
  });

  console.log(`Found ${mockTxs.length} mock/bonus transactions to delete.`);

  for (const tx of mockTxs) {
    const numStr = tx.amount.replace(/[^\d]/g, '');
    const amountVal = parseInt(numStr) || 0;

    // Deduct from user balance
    if (amountVal > 0 && tx.userId) {
      await prisma.user.update({
        where: { id: tx.userId },
        data: { balance: { decrement: amountVal } }
      });
      console.log(`Deducted ${amountVal} from User ${tx.userId}`);
    }

    // Delete transaction
    await prisma.transaction.delete({
      where: { id: tx.id }
    });
    console.log(`Deleted transaction: ${tx.desc} (${tx.amount})`);
  }

  console.log('Cleanup complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
