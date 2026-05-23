import crypto from 'node:crypto'
import fs from 'node:fs'
import multer from 'multer'
import type { RequestHandler } from 'express'
import { Router } from 'express'
import sharp from 'sharp'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { upload } from '../middleware/upload.js'
import { AppError } from '../lib/errors.js'
import { deleteUploadFilesForImageUrl, ensureUploadsDir, resolveUploadFilePath } from '../lib/imageFiles.js'
import { resolveEntryTaxonSelection } from '../services/entries.js'
import { recordAdminAudit } from '../lib/adminAudit.js'

ensureUploadsDir()

const RESPONSIVE_IMAGE_WIDTHS = [1600, 960, 480] as const
const MAX_PROPOSALS_PER_USER = 20
const MAX_SUGGESTIONS_PER_USER = 10

const proposalSchema = z.object({
  taxonLevel: z.enum(['SUBFAMILY', 'GENUS', 'SPECIES']),
  taxonValue: z.string().min(1),
  taxonGenus: z.string().optional().nullable(),
  subgenus: z.string().optional().nullable(),
  speciesGroup: z.string().optional().nullable(),
  department: z.string().min(1),
  observedAt: z.coerce.date(),
  biotope: z.string().min(1),
  photoCredit: z.string().min(1),
  size: z.string().optional().nullable(),
  caste: z.enum(['WORKER', 'QUEEN', 'MALE']),
})

export const entryProposalsRouter = Router()

function sanitizeFileStem(name: string) {
  const stem = name.replace(/\.[^.]+$/, '')
  const normalized = stem
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return normalized || 'image'
}

async function optimizeAndSaveImage(file: Express.Multer.File, index: number) {
  if (!file.mimetype.startsWith('image/')) {
    throw new AppError(400, 'Seules les images sont acceptées.')
  }

  const image = sharp(file.buffer, { animated: false }).rotate()
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height) {
    throw new AppError(400, 'Image invalide.')
  }

  const safeStem = sanitizeFileStem(file.originalname)
  const fileId = `${Date.now()}-${index + 1}-${safeStem}-${crypto.randomUUID().slice(0, 8)}`
  const baseFileName = `${fileId}.webp`
  const savedPaths: string[] = []

  for (const width of RESPONSIVE_IMAGE_WIDTHS) {
    const outputFileName = width === 1600 ? baseFileName : `${fileId}-${width}.webp`
    const outputPath = resolveUploadFilePath(outputFileName)

    await image
      .clone()
      .resize({
        width,
        height: width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: width === 1600 ? 82 : 78, effort: 6 })
      .toFile(outputPath)

    savedPaths.push(outputPath)
  }

  return {
    baseFileName,
    savedPaths,
  }
}

const uploadProposalImages: RequestHandler = (req, res, next) => {
  upload.array('images', 3)(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Chaque image doit faire 8 Mo maximum.' })
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Vous pouvez envoyer 3 images maximum.' })
    }

    if (error instanceof Error && error.message === 'ONLY_IMAGE_FILES') {
      return res.status(400).json({ message: 'Seules les images sont acceptées.' })
    }

    if (error) {
      return res.status(400).json({ message: "Erreur lors de l'upload des images." })
    }

    return next()
  })
}

// Get user's proposals and suggestions
entryProposalsRouter.get('/my-contributions', async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'Non autorisé.')
  }

  const [proposals, suggestions] = await Promise.all([
    prisma.entryProposal.findMany({
      where: { userId: req.user.userId },
      include: { images: { orderBy: [{ position: 'asc' } as any, { createdAt: 'asc' }] } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.suggestion.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return res.json({ proposals, suggestions })
})

// Get proposal count for user (check limit)
entryProposalsRouter.get('/user-counts', async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'Non autorisé.')
  }

  const [proposalCount, suggestionCount] = await Promise.all([
    prisma.entryProposal.count({
      where: { userId: req.user.userId },
    }),
    prisma.suggestion.count({
      where: { userId: req.user.userId },
    }),
  ])

  return res.json({
    proposalCount,
    proposalLimit: MAX_PROPOSALS_PER_USER,
    suggestionCount,
    suggestionLimit: MAX_SUGGESTIONS_PER_USER,
    canPropose: proposalCount < MAX_PROPOSALS_PER_USER,
    canSuggest: suggestionCount < MAX_SUGGESTIONS_PER_USER,
  })
})

// Create entry proposal
entryProposalsRouter.post('/', uploadProposalImages, async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'Non autorisé.')
  }

  const savedFilePaths: string[] = []

  try {
    const parsed = proposalSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'Requête invalide.')
    }

    // Check proposal limit
    const proposalCount = await prisma.entryProposal.count({
      where: { userId: req.user.userId },
    })
    if (proposalCount >= MAX_PROPOSALS_PER_USER) {
      throw new AppError(400, `Limite de ${MAX_PROPOSALS_PER_USER} propositions atteinte.`)
    }

    const taxonSelection = await resolveEntryTaxonSelection(parsed.data)
    if (!taxonSelection) {
      throw new AppError(400, 'Taxon introuvable pour ce niveau.')
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    const optimizedFileNames = await Promise.all(
      files.map(async (file, index) => {
        const result = await optimizeAndSaveImage(file, index)
        savedFilePaths.push(...result.savedPaths)
        return result.baseFileName
      }),
    )

    const created = await prisma.entryProposal.create({
      data: {
        userId: req.user.userId,
        taxonLevel: taxonSelection.taxonLevel,
        taxonValue: taxonSelection.taxonValue,
        subfamily: taxonSelection.subfamily,
        genus: taxonSelection.genus,
        species: taxonSelection.species,
        caste: parsed.data.caste,
        size: parsed.data.size?.trim() || taxonSelection.size || undefined,
        department: parsed.data.department,
        observedAt: parsed.data.observedAt,
        biotope: parsed.data.biotope,
        photoCredit: parsed.data.photoCredit,
        subgenus: parsed.data.subgenus ?? undefined,
        speciesGroup: parsed.data.speciesGroup ?? undefined,
        images: {
          create: optimizedFileNames.map((filename, i) => ({ imageUrl: `/uploads/${filename}`, position: i })),
        },
      },
      include: { images: true },
    })

    await recordAdminAudit(req, {
      action: 'Proposition d\'entrée créée',
      detail: `${created.subfamily} · ${created.genus ?? '-'} · ${created.species ?? '-'} (${created.department}) par ${req.user.userId}`,
      tone: 'SUCCESS',
      entityType: 'entryProposal',
      entityId: created.id,
    })

    return res.status(201).json(created)
  } catch (error) {
    for (const filePath of savedFilePaths) {
      fs.rmSync(filePath, { force: true })
    }

    throw error
  }
})
