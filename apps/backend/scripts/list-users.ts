import dotenv from 'dotenv'
import { createPrisma } from './_prisma.js'

dotenv.config()

export async function main(prisma = createPrisma()) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      username: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (users.length === 0) {
    console.log('Aucun utilisateur trouvé.')
    return
  }

  for (const user of users) {
    console.log(
      `${user.username}\t${user.email ?? '—'}\t${user.role}\tcréé: ${user.createdAt.toISOString()}\tmaj: ${user.updatedAt.toISOString()}`,
    )
  }
}

if (process.env.NODE_ENV !== 'test') {
  const prisma = createPrisma()
  main(prisma)
    .then(async () => {
      await prisma.$disconnect()
    })
    .catch(async (error) => {
      console.error(error)
      await prisma.$disconnect()
      process.exit(1)
    })
}
