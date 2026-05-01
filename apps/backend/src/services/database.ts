import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'
import sharp from 'sharp'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { invalidateTaxonCatalogCache } from '../lib/taxonCatalog.js'
import { AppError } from '../lib/errors.js'
import {
  RESPONSIVE_IMAGE_WIDTHS,
  ensureUploadsDir as ensureUploadsDirOnDisk,
  getResponsiveUploadFileNames,
  listUploadFileNames,
  resolveUploadFilePath,
} from '../lib/imageFiles.js'

const referenceTypeSchema = z.enum(['WEBSITE', 'MYRMECOLOGY'])
const taxonLevelSchema = z.enum(['SUBFAMILY', 'GENUS', 'SPECIES'])
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
        description: z.string().nullable(),
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
        species: z.string().nullable(),
        department: z.string(),
        observedAt: z.coerce.date(),
        biotope: z.string(),
        photoCredit: z.string(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
      }),
    ),
    entryImages: z.array(
      z.object({
        id: z.string(),
        entryId: z.string(),
        imageUrl: z.string(),
        createdAt: z.coerce.date(),
      }),
    ),
    gameSessions: z.array(
      z.object({
        id: z.string(),
        level: gameDifficultySchema,
        entryId: z.string().nullable(),
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
    if (width === 1600) {
      continue
    }

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
  ] = await Promise.all([
    prisma.taxon.findMany({ orderBy: [{ subfamily: 'asc' }, { genus: 'asc' }, { species: 'asc' }] }),
    prisma.taxonLevelProfile.findMany({ orderBy: [{ level: 'asc' }, { value: 'asc' }] }),
    prisma.taxonLevelCriterion.findMany({ orderBy: [{ profileId: 'asc' }, { position: 'asc' }] }),
    prisma.reference.findMany({
      include: { taxons: { select: { id: true } } },
      orderBy: [{ type: 'asc' }, { title: 'asc' }],
    }),
    prisma.observationEntry.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.entryImage.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.gameSession.findMany({ orderBy: { createdAt: 'asc' } }),
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
      taxonLevelProfiles,
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
      observationEntries,
      entryImages,
      gameSessions,
    },
  }
}

export async function importDatabaseSnapshot(snapshot: DatabaseSnapshot) {
  await prisma.$transaction(async (tx) => {
    await tx.gameSession.deleteMany()
    await tx.entryImage.deleteMany()
    await tx.observationEntry.deleteMany()
    await tx.taxonLevelCriterion.deleteMany()
    await tx.taxonLevelProfile.deleteMany()
    await tx.reference.deleteMany()
    await tx.taxon.deleteMany()

    if (snapshot.data.taxons.length > 0) {
      await tx.taxon.createMany({ data: snapshot.data.taxons })
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
      await tx.observationEntry.createMany({ data: snapshot.data.observationEntries })
    }

    if (snapshot.data.entryImages.length > 0) {
      await tx.entryImage.createMany({ data: snapshot.data.entryImages })
    }

    if (snapshot.data.gameSessions.length > 0) {
      await tx.gameSession.createMany({ data: snapshot.data.gameSessions })
    }
  })

  invalidateTaxonCatalogCache()

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
      gameSessions: snapshot.data.gameSessions.length,
    },
  }
}

export async function createDatabaseBundleArchive() {
  const snapshot = await getDatabaseSnapshot()
  const zip = new AdmZip()

  zip.addFile('snapshot.json', Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8'))

  const uploadsDir = ensureUploadsDir()
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
