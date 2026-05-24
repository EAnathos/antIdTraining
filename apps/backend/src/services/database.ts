import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'
import sharp from 'sharp'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { invalidateTaxonCatalogCache } from '../lib/taxonCatalog.js'
import { invalidateTaxonLevelProfileCache } from '../lib/taxonLevelProfileCache.js'
import { invalidateGameEntryCache } from '../lib/gameEntryCache.js'
import { AppError } from '../lib/errors.js'
import {
  RESPONSIVE_IMAGE_WIDTHS,
  ensureUploadsDir as ensureUploadsDirOnDisk,
  getResponsiveUploadFileNames,
  listUploadFileNames,
  resolveUploadFilePath,
} from '../lib/imageFiles.js'

const referenceTypeSchema = z.enum(['WEBSITE', 'MYRMECOLOGY'])
const taxonLevelSchema = z.enum(['SUBFAMILY', 'GENUS', 'SUBGENUS', 'SPECIES_GROUP', 'SPECIES'])
const gameDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD'])

export const databaseSnapshotSchema = z.object({
  version: z.string(),
  exportedAt: z.coerce.date(),
  data: z.object({
    taxons: z.array(
      z
        .object({
          id: z.string(),
          subfamily: z.string(),
          tribe: z.string().nullable(),
          genus: z.string(),
          subgenus: z.string().nullable(),
          speciesGroup: z.string().nullable(),
          species: z.string(),
          swarmingStartMonth: z.number().int().min(1).max(12).nullable().optional().default(null),
          swarmingEndMonth: z.number().int().min(1).max(12).nullable().optional().default(null),
          distribution: z.object({
            departments: z.array(z.string()).optional(),
          }).nullable().optional(),
          createdAt: z.coerce.date(),
          updatedAt: z.coerce.date(),
        })
        .superRefine((taxon, context) => {
          const startMonth = taxon.swarmingStartMonth ?? null
          const endMonth = taxon.swarmingEndMonth ?? null

          if (startMonth !== null && endMonth !== null && startMonth > endMonth) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['swarmingEndMonth'],
              message: 'La fin de période doit être postérieure au début de période.',
            })
          }
        }),
    ),
    taxonLevelProfiles: z.array(
      z.object({
        id: z.string(),
        level: taxonLevelSchema,
        value: z.string(),
        genusValue: z.string().nullable().optional().default(null),
        description: z.string().nullable(),
        sizeWorker: z.string().nullable().optional(),
        sizeQueen: z.string().nullable().optional(),
        sizeMale: z.string().nullable().optional(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
      }),
    ),
    taxonLevelCriteria: z.array(
      z.object({
        id: z.string(),
        profileId: z.string(),
        label: z.string(),
        position: z.number().int(),
        createdAt: z.coerce.date(),
      }),
    ),
    references: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        authors: z.array(z.string()).optional().default([]),
        description: z.string().nullable(),
        type: referenceTypeSchema,
        url: z.string().nullable(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
      }),
    ),
    referenceTaxons: z
      .array(
        z.object({
          referenceId: z.string(),
          taxonId: z.string(),
        }),
      )
      .optional()
      .default([]),
    observationEntries: z.array(
      z.object({
        id: z.string(),
        taxonId: z.string().nullable(),
        taxonLevel: taxonLevelSchema,
        taxonValue: z.string(),
        subfamily: z.string(),
        genus: z.string().nullable(),
        subgenus: z.string().nullable().optional().default(null),
        species: z.string().nullable(),
        speciesGroup: z.string().nullable().optional().default(null),
        size: z.string().nullable().optional(),
        caste: z.enum(['WORKER', 'QUEEN', 'MALE']),
        department: z.string(),
        observedAt: z.coerce.date(),
        biotope: z.string(),
        photoCredit: z.string(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
      }),
    ),
    users: z.array(
      z.object({
        id: z.string(),
        username: z.string(),
        passwordHash: z.string(),
        role: z.string(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
      }),
    ),
    adminHistoryEvents: z.array(
      z.object({
        id: z.string(),
        createdAt: z.coerce.date(),
        action: z.string(),
        detail: z.string(),
        tone: z.string(),
        actorUserId: z.string().nullable(),
        actorUsername: z.string().nullable(),
        entityType: z.string().nullable(),
        entityId: z.string().nullable(),
      }),
    ),
    suggestions: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string().nullable(),
        message: z.string(),
        status: z.string(),
        createdAt: z.coerce.date(),
        processedAt: z.coerce.date().nullable().optional(),
      }),
    ),
    entryImages: z.array(
      z.object({
        id: z.string(),
        entryId: z.string(),
        imageUrl: z.string(),
        position: z.number().int().nullable().optional(),
        createdAt: z.coerce.date(),
      }),
    ),
    gameSessions: z.array(
      z.object({
        id: z.string(),
        level: gameDifficultySchema,
        entryId: z.string().nullable(),
        userId: z.string().nullable().optional(),
        finalCorrect: z.boolean().nullable(),
        validatedAt: z.coerce.date().nullable(),
        createdAt: z.coerce.date(),
      }),
    ),
  }),
})

export type DatabaseSnapshot = z.infer<typeof databaseSnapshotSchema>

function getUploadsDirPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(currentDir, '../../uploads')
}

async function generateMissingResponsiveVariantsFromBaseFile(baseFileName: string) {
  const basePath = resolveUploadFilePath(baseFileName)
  if (!fs.existsSync(basePath)) {
    return 0
  }

  const extension = path.extname(baseFileName) || '.webp'
  const stem = baseFileName.slice(0, -extension.length)
  const image = sharp(fs.readFileSync(basePath), { animated: false }).rotate()
  let generated = 0

  for (const width of RESPONSIVE_IMAGE_WIDTHS) {
    const variantFileName = `${stem}-${width}${extension}`
    const variantPath = resolveUploadFilePath(variantFileName)
    if (fs.existsSync(variantPath)) {
      continue
    }

    await image
      .clone()
      .resize({
        width,
        height: width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 78, effort: 6 })
      .toFile(variantPath)

    generated += 1
  }

  return generated
}

export async function cleanupUploadFiles() {
  const uploadsDirectory = ensureUploadsDirOnDisk()
  const referencedImages = await prisma.entryImage.findMany({ select: { imageUrl: true } })

  const allowedFiles = new Set<string>()
  for (const { imageUrl } of referencedImages) {
    const { baseFileName, variantFileNames } = getResponsiveUploadFileNames(imageUrl)
    allowedFiles.add(baseFileName)
    for (const variantFileName of variantFileNames) {
      allowedFiles.add(variantFileName)
    }
  }

  const existingFiles = listUploadFileNames()
  let deletedFiles = 0

  for (const fileName of existingFiles) {
    if (allowedFiles.has(fileName)) {
      continue
    }

    fs.rmSync(path.join(uploadsDirectory, fileName), { force: true })
    deletedFiles += 1
  }

  let generatedVariants = 0
  for (const { imageUrl } of referencedImages) {
    const { baseFileName } = getResponsiveUploadFileNames(imageUrl)
    generatedVariants += await generateMissingResponsiveVariantsFromBaseFile(baseFileName)
  }

  return {
    deletedFiles,
    generatedVariants,
    referencedImages: referencedImages.length,
  }
}

export async function getDatabaseSnapshot() {
  const [
    taxons,
    taxonLevelProfiles,
    taxonLevelCriteria,
    references,
    observationEntries,
    entryImages,
    gameSessions,
    users,
    adminHistoryEvents,
    suggestions,
  ] = await Promise.all([
    prisma.taxon.findMany({ orderBy: [{ subfamily: 'asc' }, { genus: 'asc' }, { species: 'asc' }] }),
    prisma.taxonLevelProfile.findMany({ orderBy: [{ level: 'asc' }, { value: 'asc' }] }),
    prisma.taxonLevelCriterion.findMany({ orderBy: [{ profileId: 'asc' }, { position: 'asc' }] }),
    prisma.reference.findMany({
      include: { taxons: { select: { id: true } } },
      orderBy: [{ type: 'asc' }, { title: 'asc' }],
    }),
    prisma.observationEntry.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.entryImage.findMany({ orderBy: [{ position: 'asc' } as any, { createdAt: 'asc' }] }),
    prisma.gameSession.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.adminHistoryEvent.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.suggestion.findMany({ orderBy: { createdAt: 'asc' } }),
  ])

  const flattenedReferenceTaxons = references.flatMap((reference) =>
    reference.taxons.map((taxon) => ({
      referenceId: reference.id,
      taxonId: taxon.id,
    })),
  )

  return {
    version: '1',
    exportedAt: new Date().toISOString(),
    data: {
      taxons,
      taxonLevelProfiles: taxonLevelProfiles.map((profile) => ({
        id: profile.id,
        level: profile.level,
        value: profile.value,
        genusValue: profile.genusValue ?? null,
        description: profile.description,
        sizeWorker: profile.sizeWorker,
        sizeQueen: profile.sizeQueen,
        sizeMale: profile.sizeMale,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      })),
      taxonLevelCriteria,
      references: references.map((reference) => ({
        id: reference.id,
        title: reference.title,
        authors: reference.authors,
        description: reference.description,
        type: reference.type,
        url: reference.url,
        createdAt: reference.createdAt,
        updatedAt: reference.updatedAt,
      })),
      referenceTaxons: flattenedReferenceTaxons,
      observationEntries: observationEntries.map((entry) => ({
        id: entry.id,
        taxonId: entry.taxonId ?? null,
        taxonLevel: entry.taxonLevel,
        taxonValue: entry.taxonValue,
        subfamily: entry.subfamily,
        genus: entry.genus ?? null,
        subgenus: entry.subgenus ?? null,
        species: entry.species ?? null,
        speciesGroup: entry.speciesGroup ?? null,
        caste: entry.caste,
        department: entry.department,
        observedAt: entry.observedAt,
        biotope: entry.biotope,
        photoCredit: entry.photoCredit,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
      entryImages,
      gameSessions,
      users,
      adminHistoryEvents,
      suggestions,
    },
  }
}

export async function importDatabaseSnapshot(snapshot: DatabaseSnapshot) {
  await prisma.$transaction(async (tx) => {
    // Delete in order of foreign key dependencies
    await tx.adminHistoryEvent.deleteMany()
    await tx.gameSession.deleteMany()
    await tx.user.deleteMany()
    await tx.suggestion.deleteMany()
    await tx.entryImage.deleteMany()
    await tx.observationEntry.deleteMany()
    await tx.taxonLevelCriterion.deleteMany()
    await tx.taxonLevelProfile.deleteMany()
    await tx.reference.deleteMany()
    await tx.taxon.deleteMany()

    if (snapshot.data.taxons.length > 0) {
      await tx.taxon.createMany({
        data: snapshot.data.taxons.map((taxon) => ({
          ...taxon,
          distribution: taxon.distribution ?? Prisma.DbNull,
        })),
      })
    }

    if (snapshot.data.taxonLevelProfiles.length > 0) {
      await tx.taxonLevelProfile.createMany({ data: snapshot.data.taxonLevelProfiles })
    }

    if (snapshot.data.taxonLevelCriteria.length > 0) {
      await tx.taxonLevelCriterion.createMany({ data: snapshot.data.taxonLevelCriteria })
    }

    if (snapshot.data.references.length > 0) {
      await tx.reference.createMany({ data: snapshot.data.references })
    }

    if (snapshot.data.referenceTaxons.length > 0) {
      const taxonIds = new Set(snapshot.data.taxons.map((taxon) => taxon.id))
      const referenceIds = new Set(snapshot.data.references.map((reference) => reference.id))

      const referenceTaxonMap = new Map<string, string[]>()
      snapshot.data.referenceTaxons.forEach(({ referenceId, taxonId }) => {
        if (!referenceIds.has(referenceId) || !taxonIds.has(taxonId)) {
          return
        }

        const current = referenceTaxonMap.get(referenceId) ?? []
        current.push(taxonId)
        referenceTaxonMap.set(referenceId, current)
      })

      for (const [referenceId, linkedTaxonIds] of referenceTaxonMap.entries()) {
        await tx.reference.update({
          where: { id: referenceId },
          data: {
            taxons: {
              connect: linkedTaxonIds.map((taxonId) => ({ id: taxonId })),
            },
          },
        })
      }
    }

    if (snapshot.data.observationEntries.length > 0) {
      // Ensure legacy snapshots without `caste` field get a default value
      const entriesToCreate = snapshot.data.observationEntries.map((e: any) => ({
        ...e,
        caste: (e as any).caste ?? 'WORKER',
      }))

      await tx.observationEntry.createMany({ data: entriesToCreate })
    }

    if (snapshot.data.entryImages.length > 0) {
      await tx.entryImage.createMany({ data: snapshot.data.entryImages })
    }

    if (snapshot.data.users.length > 0) {
      await tx.user.createMany({
        data: snapshot.data.users.map((user) => ({
          ...user,
          role: user.role as any,
        })),
      })
    }

    if (snapshot.data.gameSessions.length > 0) {
      await tx.gameSession.createMany({ data: snapshot.data.gameSessions })
    }

    if (snapshot.data.adminHistoryEvents.length > 0) {
      await tx.adminHistoryEvent.createMany({
        data: snapshot.data.adminHistoryEvents.map((event) => ({
          ...event,
          tone: event.tone as any,
        })),
      })
    }

    if (snapshot.data.suggestions.length > 0) {
      await tx.suggestion.createMany({
        data: snapshot.data.suggestions.map((suggestion) => ({
          ...suggestion,
          status: suggestion.status as any,
        })),
      })
    }
  })

  invalidateTaxonCatalogCache()
  invalidateTaxonLevelProfileCache()
  invalidateGameEntryCache()

  return {
    message: 'Base importée avec succès.',
    imported: {
      taxons: snapshot.data.taxons.length,
      taxonLevelProfiles: snapshot.data.taxonLevelProfiles.length,
      taxonLevelCriteria: snapshot.data.taxonLevelCriteria.length,
      references: snapshot.data.references.length,
      referenceTaxons: snapshot.data.referenceTaxons.length,
      observationEntries: snapshot.data.observationEntries.length,
      entryImages: snapshot.data.entryImages.length,
      users: snapshot.data.users.length,
      gameSessions: snapshot.data.gameSessions.length,
      adminHistoryEvents: snapshot.data.adminHistoryEvents.length,
      suggestions: snapshot.data.suggestions.length,
    },
  }
}

export async function createDatabaseBundleArchive() {
  const snapshot = await getDatabaseSnapshot()
  const zip = new AdmZip()

  zip.addFile('snapshot.json', Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8'))

  const uploadsDir = ensureUploadsDirOnDisk()
  if (fs.existsSync(uploadsDir)) {
    const entries = fs.readdirSync(uploadsDir)
    if (entries.length > 0) {
      zip.addLocalFolder(uploadsDir, 'uploads')
    }
  }

  return zip.toBuffer()
}

function restoreUploadsFromArchive(zip: AdmZip) {
  const uploadEntries = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory && entry.entryName.startsWith('uploads/'))

  if (uploadEntries.length === 0) {
    return 0
  }

  const uploadsDir = getUploadsDirPath()
  fs.mkdirSync(uploadsDir, { recursive: true })

  const existingFiles = fs.readdirSync(uploadsDir)
  for (const fileName of existingFiles) {
    fs.rmSync(path.join(uploadsDir, fileName), { recursive: true, force: true })
  }

  for (const entry of uploadEntries) {
    const fileName = path.basename(entry.entryName)
    if (!fileName) {
      continue
    }

    fs.writeFileSync(path.join(uploadsDir, fileName), entry.getData())
  }

  return uploadEntries.length
}

export async function importDatabaseBundleArchive(bundleBuffer: Buffer) {
  let zip: AdmZip
  try {
    zip = new AdmZip(bundleBuffer)
  } catch {
    throw new AppError(400, 'Archive ZIP invalide.')
  }

  const entries = zip.getEntries().filter((entry) => !entry.isDirectory)
  const snapshotEntry =
    entries.find((entry) => path.basename(entry.entryName).toLowerCase() === 'snapshot.json') ??
    entries.find((entry) => entry.entryName.toLowerCase().endsWith('.json'))

  if (!snapshotEntry) {
    throw new AppError(400, 'Archive invalide : fichier JSON introuvable.')
  }

  let rawSnapshot: unknown
  try {
    rawSnapshot = JSON.parse(snapshotEntry.getData().toString('utf8')) as unknown
  } catch {
    throw new AppError(400, 'Archive invalide : snapshot.json illisible.')
  }

  const parsedSnapshot = databaseSnapshotSchema.safeParse(rawSnapshot)
  if (!parsedSnapshot.success) {
    throw new AppError(400, 'Archive invalide : snapshot JSON non conforme.')
  }

  const imported = await importDatabaseSnapshot(parsedSnapshot.data)

  let imagesRestored = 0
  try {
    imagesRestored = restoreUploadsFromArchive(zip)
  } catch {
    throw new AppError(500, 'Base importée, mais restauration des images impossible.')
  }

  return {
    ...imported,
    imagesRestored,
  }
}
