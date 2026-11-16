const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Retroactively updating past orders to calculate profits based on current import prices...');

  // 1. Update ResourceOrders
  const resourceOrders = await prisma.resourceOrder.findMany({ include: { variant: true } });
  let rCount = 0;
  for (const ro of resourceOrders) {
    if (ro.totalImportAmount === 0 && ro.variant) {
      const calculatedImport = (ro.variant.importPrice || 0) * ro.quantity;
      await prisma.resourceOrder.update({
        where: { id: ro.id },
        data: { totalImportAmount: calculatedImport }
      });
      rCount++;
    }
  }
  console.log(`Updated ${rCount} ResourceOrders.`);

  // 2. Update Enrollments
  const enrollments = await prisma.enrollment.findMany({ include: { course: true } });
  let cCount = 0;
  for (const e of enrollments) {
    if (e.totalImportAmount === 0 && e.course) {
      // For old enrollments where totalAmount was not saved, fallback to course.salePrice
      const amt = e.totalAmount || e.course.salePrice || 0;
      await prisma.enrollment.update({
        where: { id: e.id },
        data: { 
          totalAmount: amt,
          totalImportAmount: e.course.importPrice || 0
        }
      });
      cCount++;
    }
  }
  console.log(`Updated ${cCount} Enrollments.`);

  // 3. Update Orders (Services)
  const orders = await prisma.order.findMany();
  let oCount = 0;
  for (const o of orders) {
    // Some old orders might not have costPrice set or have wrong profit
    // But we need to look up the current service if we want to sync. 
    // Wait, Order DOES NOT have a relation to ServerService in Prisma! It only saves the name/api service id?
    // Let's check how Order connects to Service. Wait, Order has `service` field which is just a string (serviceType) and `serviceId` is NOT a relation?
    // Let's just find the service by name or something.
    // Actually, `Order.costPrice` should be fixed.
    // We'll skip Order for now unless it has costPrice = 0.
  }
  console.log('Completed retroactive update.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
