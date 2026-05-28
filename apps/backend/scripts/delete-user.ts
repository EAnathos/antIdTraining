import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL manquant')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
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

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
