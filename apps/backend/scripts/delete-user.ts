import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

export function createPrisma() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL manquant')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export async function main(prisma = createPrisma()) {
  const username = process.env.USERNAME_TO_DELETE?.trim()

  if (!username) {
    throw new Error('USERNAME_TO_DELETE est requis')
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, role: true },
  })

  if (!user) {
    throw new Error(`Utilisateur introuvable: ${username}`)
  }

  await prisma.user.delete({
    where: { username },
  })

  console.log(`Utilisateur supprimé: ${user.username} (${user.role})`)
}

if (process.env.NODE_ENV !== 'test') {
  const prisma = createPrisma()
  main(prisma)
    .then(async () => {
      await prisma.$disconnect()
    })
    .catch(async (error) => {
      console.error(error instanceof Error ? error.message : String(error))
      await prisma.$disconnect()
      process.exit(1)
    })
}
