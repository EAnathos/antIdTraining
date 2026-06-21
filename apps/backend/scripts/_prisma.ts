import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

export function createPrisma() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL manquant')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}
