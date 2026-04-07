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
  const email = process.env.ADMIN_EMAIL ?? 'admin@antid.local'
  const password = process.env.ADMIN_PASSWORD ?? 'admin123'
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
