import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create or update the default settings
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      creditLimit: 65000,
      user1Name: 'Você',
      user2Name: 'Namorada',
    },
  })

  console.log('Seed completed: Default settings created.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
