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

interface ExportData {
  exportedAt: string
  version: string
  users: Array<{
    username: string
    passwordHash: string
    role: string
    createdAt: string
    updatedAt: string
    gameSessions: Array<{
      level: string
      entryId: string | null
      finalCorrect: boolean | null
      validatedAt: string | null
      createdAt: string
      entry: any | null
    }>
  }>
}

async function main() {
  const filename = process.argv[2]

  if (!filename) {
    console.error('Usage: npx ts-node scripts/import-data.ts <filename>')
    console.error('Exemple: npx ts-node scripts/import-data.ts export-2026-05-04.json')
    process.exit(1)
  }

  const filepath = path.resolve(filename)

  if (!fs.existsSync(filepath)) {
    console.error(`Fichier non trouvé: ${filepath}`)
    process.exit(1)
  }

  console.log(`Importation depuis: ${filepath}`)

  const fileContent = fs.readFileSync(filepath, 'utf-8')
  const exportData: ExportData = JSON.parse(fileContent)

  console.log(`Exportation du: ${exportData.exportedAt}`)
  console.log(`Version: ${exportData.version}`)

  let usersImported = 0
  let sessionsImported = 0
  let errors = 0

  for (const userData of exportData.users) {
    try {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { username: userData.username },
      })

      let user
      if (existingUser) {
        console.log(`  - ${userData.username}: utilisateur existant, sessions importées uniquement`)
        user = existingUser
      } else {
        user = await prisma.user.create({
          data: {
            username: userData.username,
            passwordHash: userData.passwordHash,
            role: userData.role as any,
            createdAt: new Date(userData.createdAt),
            updatedAt: new Date(userData.updatedAt),
          },
        })
        console.log(`  ✓ ${userData.username}: créé`)
        usersImported++
      }

      // Importer les sessions de jeu
      for (const session of userData.gameSessions) {
        try {
          await prisma.gameSession.create({
            data: {
              level: session.level as any,
              entryId: session.entryId ?? undefined,
              userId: user.id,
              finalCorrect: session.finalCorrect,
              validatedAt: session.validatedAt ? new Date(session.validatedAt) : null,
              createdAt: new Date(session.createdAt),
            },
          })
          sessionsImported++
        } catch (sessionError) {
          console.warn(
            `    ⚠ Session échouée pour ${userData.username}:`,
            (sessionError as Error).message,
          )
          errors++
        }
      }
    } catch (userError) {
      console.error(`  ✗ Erreur pour ${userData.username}:`, (userError as Error).message)
      errors++
    }
  }

  console.log(`\nImportation terminée:`)
  console.log(`  - ${usersImported} utilisateur(s) créé(s)`)
  console.log(`  - ${sessionsImported} session(s) de jeu importée(s)`)
  if (errors > 0) {
    console.log(`  - ${errors} erreur(s)`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error('Erreur lors de l\'importation :', error)
    await prisma.$disconnect()
    process.exit(1)
  })
