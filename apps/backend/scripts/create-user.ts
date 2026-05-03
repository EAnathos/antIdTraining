import bcrypt from 'bcryptjs'
import { PrismaClient, UserRole } from '@prisma/client'
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
  const username = process.env.USERNAME_TO_CREATE?.trim()
  const password = process.env.PASSWORD_TO_CREATE?.trim()
  const roleInput = process.env.ROLE_TO_CREATE?.trim().toUpperCase()

  if (!username || !password) {
    throw new Error('USERNAME_TO_CREATE et PASSWORD_TO_CREATE sont requis')
  }

  const role: UserRole = roleInput === 'USER' ? UserRole.USER : UserRole.ADMIN

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role,
    },
    create: {
      username,
      passwordHash,
      role,
    },
    select: {
      id: true,
      username: true,
      role: true,
    },
  })

  console.log(`Utilisateur prêt: ${user.username} (${user.role})`) 
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
