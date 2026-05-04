import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL manquant')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Exportation des utilisateurs et sessions de jeu...')

  const users = await prisma.user.findMany({
    include: {
      gameSessions: {
        include: {
          entry: {
            select: {
              id: true,
              taxonValue: true,
              department: true,
              observedAt: true,
              biotope: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    users: users.map((user) => ({
      username: user.username,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      gameSessions: user.gameSessions.map((session) => ({
        level: session.level,
        entryId: session.entryId,
        finalCorrect: session.finalCorrect,
        validatedAt: session.validatedAt?.toISOString() ?? null,
        createdAt: session.createdAt.toISOString(),
        entry: session.entry
          ? {
              id: session.entry.id,
              taxonValue: session.entry.taxonValue,
              department: session.entry.department,
              observedAt: session.entry.observedAt.toISOString(),
              biotope: session.entry.biotope,
            }
          : null,
      })),
    })),
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
  const filename = path.join(process.cwd(), `export-${timestamp}.json`)

  fs.writeFileSync(filename, JSON.stringify(exportData, null, 2))

  console.log(`✓ Exportation réussie : ${filename}`)
  console.log(`  - ${users.length} utilisateur(s)`)
  console.log(`  - ${users.reduce((sum, u) => sum + u.gameSessions.length, 0)} session(s) de jeu`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error('Erreur lors de l\'exportation :', error)
    await prisma.$disconnect()
    process.exit(1)
  })
