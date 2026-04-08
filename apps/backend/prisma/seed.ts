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
  const email = process.env.ADMIN_EMAIL ?? (isProduction ? undefined : 'admin@antid.local')
  const password = process.env.ADMIN_PASSWORD ?? (isProduction ? undefined : 'admin123')

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD sont requis pour le seed en production')
  }

  const hash = await bcrypt.hash(password, 10)

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash, role: UserRole.ADMIN },
    create: { email, passwordHash: hash, role: UserRole.ADMIN },
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
