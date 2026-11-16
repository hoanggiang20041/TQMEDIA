import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // XÃ³a toÃ n bá»™ Lá»‹ch sá»­ ÄÆ¡n hÃ ng
  await prisma.order.deleteMany()
  
  // XÃ³a toÃ n bá»™ Lá»‹ch sá»­ Giao dá»‹ch
  await prisma.transaction.deleteMany()
  
  // Reset sá»‘ dÆ° ngÆ°á»i dÃ¹ng vá» 5.000.000 Ä‘ Ä‘á»ƒ test
  await prisma.user.updateMany({
    data: { balance: 5000000 }
  })
  
  console.log('ÄÃ£ dá»n dáº¹p toÃ n bá»™ dá»¯ liá»‡u rÃ¡c (Mock)!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
