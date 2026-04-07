import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'

const referenceTypeSchema = z.enum(['WEBSITE', 'MYRMECOLOGY'])
const taxonLevelSchema = z.enum(['SUBFAMILY', 'GENUS', 'SPECIES'])
const gameDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD'])

const databaseSnapshotSchema = z.object({
  version: z.string(),
  exportedAt: z.coerce.date(),
  data: z.object({
    taxons: z.array(
      z.object({
        id: z.string(),
        subfamily: z.string(),
        tribe: z.string().nullable(),
        genus: z.string(),
        subgenus: z.string().nullable(),
        speciesGroup: z.string().nullable(),
        species: z.string(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
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
        description: z.string().nullable(),
        type: referenceTypeSchema,
        url: z.string().nullable(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
      }),
    ),
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

export const databaseRouter = Router()

databaseRouter.get('/export', async (_req, res) => {
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
    prisma.reference.findMany({ orderBy: [{ type: 'asc' }, { title: 'asc' }] }),
    prisma.observationEntry.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.entryImage.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.gameSession.findMany({ orderBy: { createdAt: 'asc' } }),
  ])

  return res.json({
    version: '1',
    exportedAt: new Date().toISOString(),
    data: {
      taxons,
      taxonLevelProfiles,
      taxonLevelCriteria,
      references,
      observationEntries,
      entryImages,
      gameSessions,
    },
  })
})

databaseRouter.post('/import', async (req, res) => {
  const parsed = databaseSnapshotSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide pour import de base.' })
  }

  const snapshot = parsed.data

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

  return res.json({
    message: 'Base importée avec succès.',
    imported: {
      taxons: snapshot.data.taxons.length,
      taxonLevelProfiles: snapshot.data.taxonLevelProfiles.length,
      taxonLevelCriteria: snapshot.data.taxonLevelCriteria.length,
      references: snapshot.data.references.length,
      observationEntries: snapshot.data.observationEntries.length,
      entryImages: snapshot.data.entryImages.length,
      gameSessions: snapshot.data.gameSessions.length,
    },
  })
})
