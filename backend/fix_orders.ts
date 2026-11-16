import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const buggedOrders = await prisma.order.findMany({
    where: { totalNum: 0 }
  });

  console.log(`Found ${buggedOrders.length} bugged orders with 0 VND.`);

  let totalRecoveredProfit = 0;

  for (const o of buggedOrders) {
    if (o.costPrice && o.quantity) {
      // Assuming costPrice in DB is already server.costPrice * quantity
      const unitCost = o.costPrice / o.quantity; 
      
      // We need to guess the sale price. Assuming sale price is 3x cost price based on previous data
      // For S1 Like: costPrice 1000 -> unit cost 20 -> price 60 -> total 3000
      // For S2 Like: costPrice 500 -> unit cost 10 -> price 30 -> total 1500
      let correctTotal = 0;
      if (unitCost === 20) correctTotal = 60 * o.quantity;
      if (unitCost === 10) correctTotal = 30 * o.quantity;

      if (correctTotal > 0) {
        const correctProfit = correctTotal - o.costPrice;
        
        await prisma.order.update({
          where: { id: o.id },
          data: { totalNum: correctTotal, profit: correctProfit }
        });

        // Deduct from user
        await prisma.user.update({
          where: { id: o.userId },
          data: { balance: { decrement: correctTotal } }
        });

        console.log(`Fixed order ${o.id}: new total ${correctTotal}, new profit ${correctProfit}`);
        totalRecoveredProfit += (correctProfit - o.profit); // Difference added to total profit
      }
    }
  }

  console.log(`Cleanup complete. Recovered Profit: +${totalRecoveredProfit} VND`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
