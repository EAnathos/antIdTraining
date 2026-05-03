import bcrypt from 'bcryptjs'
import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL manquant pour le seed')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const isProduction = process.env.NODE_ENV === 'production'
  const username = process.env.ADMIN_USERNAME ?? (isProduction ? undefined : 'admin')
  const password = process.env.ADMIN_PASSWORD ?? (isProduction ? undefined : 'admin123')

  if (!username || !password) {
    throw new Error('ADMIN_USERNAME et ADMIN_PASSWORD sont requis pour le seed en production')
  }

  const hash = await bcrypt.hash(password, 10)

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash: hash, role: UserRole.ADMIN },
    create: { username, passwordHash: hash, role: UserRole.ADMIN },
  })
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
