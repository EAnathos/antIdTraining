import crypto from 'node:crypto'
import fs from 'node:fs'
import multer from 'multer'
import type { RequestHandler } from 'express'
import { Router } from 'express'
import sharp from 'sharp'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { upload } from '../middleware/upload.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { AppError } from '../lib/errors.js'
import {
  deleteUploadFilesForImageUrl,
  ensureUploadsDir,
  ENTRY_RESPONSIVE_IMAGE_WIDTHS,
  resolveUploadFilePath,
} from '../lib/imageFiles.js'
import {
  decryptSensitiveText,
  encryptSensitiveText,
} from '../lib/encryption.js'
import { resolveEntryTaxonSelection } from '../services/entries.js'
import { recordAdminAudit } from '../lib/adminAudit.js'
import { MAX_SUGGESTIONS_PER_USER } from '../lib/suggestionConstants.js'

ensureUploadsDir()

const MAX_PROPOSALS_PER_USER = 20

const proposalSchema = z.object({
  taxonLevel: z.enum(['SUBFAMILY', 'GENUS', 'SPECIES']),
  taxonValue: z
    .string()
    .min(1, 'Valeur requise')
    .max(255, 'Valeur trop longue')
    .trim(),
  taxonGenus: z.string().max(255, 'Trop long').trim().optional().nullable(),
  subgenus: z.string().max(255, 'Trop long').trim().optional().nullable(),
  speciesGroup: z.string().max(255, 'Trop long').trim().optional().nullable(),
  department: z
    .string()
    .regex(/^(?:[0-9]{2}|2[AB]|9[7-8][0-9])$/, 'Département invalide')
    .trim(),
  observedAt: z.coerce
    .date()
    .max(new Date(), 'La date ne peut pas être dans le futur'),
  biotope: z
    .string()
    .min(3, 'Biotope trop court')
    .max(50, 'Biotope trop long (50 caractères max)')
    .trim(),
  photoCredit: z
    .string()
    .min(3, 'Crédit photo trop court')
    .max(255, 'Crédit photo trop long')
    .trim(),
  size: z.string().max(100, 'Taille trop longue').trim().optional().nullable(),
  caste: z.enum(['WORKER', 'QUEEN', 'MALE']),
})

export const entryProposalsRouter = Router()

function publicProposal<T extends { photoCredit: string }>(proposal: T): T {
  return {
    ...proposal,
    photoCredit:
      decryptSensitiveText(proposal.photoCredit) ?? proposal.photoCredit,
  }
}

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
  // Validate MIME type
  const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!validMimes.includes(file.mimetype)) {
    throw new AppError(
      400,
      "Format d'image non supporté. Utilisez JPEG, PNG, WebP ou GIF.",
    )
  }

  // Validate file size (8MB max from multer, but double-check)
  if (file.buffer.length > 8 * 1024 * 1024) {
    throw new AppError(413, 'Image trop volumineux (max 8MB).')
  }

  // Validate image metadata
  const image = sharp(file.buffer, { animated: false }).rotate()
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new AppError(400, 'Image invalide ou corrompue.')
  }

  // Validate dimensions (min 200x200, max 12000x12000)
  if (metadata.width < 200 || metadata.height < 200) {
    throw new AppError(400, 'Image trop petite (minimum 200x200 pixels).')
  }

  if (metadata.width > 12000 || metadata.height > 12000) {
    throw new AppError(400, 'Image trop grande (maximum 12000x12000 pixels).')
  }

  const safeStem = sanitizeFileStem(file.originalname)
  const fileId = `${Date.now()}-${index + 1}-${safeStem}-${crypto.randomUUID().slice(0, 8)}`
  const baseFileName = `${fileId}.webp`
  const savedPaths: string[] = []

  try {
    for (const width of ENTRY_RESPONSIVE_IMAGE_WIDTHS) {
      const outputFileName =
        width === 1600 ? baseFileName : `${fileId}-${width}.webp`
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
  } catch (error) {
    await Promise.allSettled(savedPaths.map((p) => fs.promises.unlink(p)))
    if (error instanceof AppError) throw error
    throw new AppError(400, 'Image corrompue ou invalide.')
  }

  return {
    baseFileName,
    savedPaths,
  }
}

const uploadProposalImages: RequestHandler = (req, res, next) => {
  upload.array('images', 3)(req, res, (error) => {
    if (
      error instanceof multer.MulterError &&
      error.code === 'LIMIT_FILE_SIZE'
    ) {
      return res
        .status(413)
        .json({ message: 'Chaque image doit faire 8 Mo maximum.' })
    }

    if (
      error instanceof multer.MulterError &&
      error.code === 'LIMIT_UNEXPECTED_FILE'
    ) {
      return res
        .status(400)
        .json({ message: 'Vous pouvez envoyer 3 images maximum.' })
    }

    if (error instanceof Error && error.message === 'ONLY_IMAGE_FILES') {
      return res
        .status(400)
        .json({ message: 'Seules les images sont acceptées.' })
    }

    if (error) {
      return res
        .status(400)
        .json({ message: "Erreur lors de l'upload des images." })
    }

    return next()
  })
}

// Get user's proposals and suggestions
entryProposalsRouter.get(
  '/my-contributions',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Non autorisé.')
    }

    const [proposals, suggestions] = await Promise.all([
      prisma.entryProposal.findMany({
        where: { userId: req.user.userId },
        include: {
          images: {
            orderBy: [{ position: 'asc' } as any, { createdAt: 'asc' }],
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.suggestion.findMany({
        where: { userId: req.user.userId },
        select: {
          id: true,
          userId: true,
          title: true,
          message: true,
          status: true,
          rejectionMessage: true,
          createdAt: true,
          processedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return res.json({
      proposals: proposals.map((proposal) => publicProposal(proposal)),
      suggestions,
    })
  }),
)

// Get proposal count for user (check limit)
entryProposalsRouter.get(
  '/user-counts',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Non autorisé.')
    }

    const [proposalCount, suggestionCount] = await Promise.all([
      prisma.entryProposal.count({
        where: { userId: req.user.userId, status: 'PENDING' },
      }),
      prisma.suggestion.count({
        where: { userId: req.user.userId, status: 'PENDING' },
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
  }),
)

// Create entry proposal
entryProposalsRouter.post(
  '/',
  uploadProposalImages,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Non autorisé.')
    }

    const parsed = proposalSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'Requête invalide.')
    }

    // Check proposal limit
    const proposalCount = await prisma.entryProposal.count({
      where: { userId: req.user.userId, status: 'PENDING' },
    })
    if (proposalCount >= MAX_PROPOSALS_PER_USER) {
      throw new AppError(
        400,
        `Limite de ${MAX_PROPOSALS_PER_USER} propositions atteinte.`,
      )
    }

    const taxonSelection = await resolveEntryTaxonSelection(parsed.data)
    if (!taxonSelection) {
      throw new AppError(400, 'Taxon introuvable pour ce niveau.')
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    if (files.length === 0) {
      throw new AppError(400, 'Au moins une photo est requise.')
    }
    const optimizedFileNames = await Promise.all(
      files.map(async (file, index) => {
        const result = await optimizeAndSaveImage(file, index)
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
        photoCredit:
          encryptSensitiveText(parsed.data.photoCredit) ??
          parsed.data.photoCredit,
        subgenus: parsed.data.subgenus ?? undefined,
        speciesGroup: parsed.data.speciesGroup ?? undefined,
        images: {
          create: optimizedFileNames.map((filename, i) => ({
            imageUrl: `/uploads/${filename}`,
            position: i,
          })),
        },
      },
      include: { images: true },
    })

    await recordAdminAudit(req, {
      action: "Proposition d'entrée créée",
      detail: `${created.subfamily} · ${created.genus ?? '-'} · ${created.species ?? '-'} (${created.department}) par ${req.user.userId}`,
      tone: 'SUCCESS',
      entityType: 'entryProposal',
      entityId: created.id,
    })

    return res.status(201).json(publicProposal(created))
  }),
)

const patchProposalSchema = proposalSchema.partial()

// Edit a pending entry proposal
entryProposalsRouter.patch(
  '/:id',
  uploadProposalImages,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new AppError(401, 'Non autorisé.')

    const id = req.params.id as string

    const parsed = patchProposalSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError(400, 'Requête invalide.')

    const existing = await prisma.entryProposal.findUnique({
      where: { id },
      include: { images: true },
    })
    if (!existing) throw new AppError(404, 'Proposition introuvable.')
    if (existing.userId !== req.user.userId)
      throw new AppError(403, 'Accès refusé.')
    if (existing.status !== 'PENDING')
      throw new AppError(
        400,
        'Seules les propositions en attente peuvent être modifiées.',
      )

    // Resolve taxon only when taxon fields are provided
    let taxonSelection = null
    if (parsed.data.taxonLevel || parsed.data.taxonValue) {
      taxonSelection = await resolveEntryTaxonSelection({
        taxonLevel: (parsed.data.taxonLevel ?? existing.taxonLevel) as
          | 'SUBFAMILY'
          | 'GENUS'
          | 'SPECIES',
        taxonValue: parsed.data.taxonValue ?? existing.taxonValue,
        taxonGenus: parsed.data.taxonGenus ?? existing.genus ?? undefined,
        subgenus: parsed.data.subgenus ?? existing.subgenus ?? undefined,
        speciesGroup:
          parsed.data.speciesGroup ?? existing.speciesGroup ?? undefined,
        department: existing.department,
        observedAt: existing.observedAt,
        biotope: existing.biotope,
        photoCredit: existing.photoCredit,
      })
      if (!taxonSelection)
        throw new AppError(400, 'Taxon introuvable pour ce niveau.')
    }

    // Parse individual image IDs to delete
    const rawDeleteIds = req.body.deleteImageIds as string | undefined
    const deleteImageIds: string[] = rawDeleteIds
      ? (JSON.parse(rawDeleteIds) as string[]).filter(
          (imgId) => typeof imgId === 'string',
        )
      : []

    const files = (req.files as Express.Multer.File[] | undefined) ?? []

    // Delete individually-selected images
    if (deleteImageIds.length > 0) {
      const toDelete = existing.images.filter((img) =>
        deleteImageIds.includes(img.id),
      )
      await Promise.allSettled(
        toDelete.map((img) => deleteUploadFilesForImageUrl(img.imageUrl)),
      )
      await prisma.entryProposalImage.deleteMany({
        where: { id: { in: deleteImageIds }, proposalId: existing.id },
      })
    }

    // Validate at least one image remains (considering deletions and uploads)
    const remainingCount =
      existing.images.length - deleteImageIds.length + files.length
    if (remainingCount < 1) {
      throw new AppError(400, 'La proposition doit avoir au moins une photo.')
    }

    // Save new uploaded images
    let imageCreateData: { imageUrl: string; position: number }[] | undefined
    if (files.length > 0) {
      const keptImages = existing.images.filter(
        (img) => !deleteImageIds.includes(img.id),
      )
      const nextPosition = keptImages.length
      const optimizedFileNames = await Promise.all(
        files.map((file, index) =>
          optimizeAndSaveImage(file, index).then((r) => r.baseFileName),
        ),
      )
      imageCreateData = optimizedFileNames.map((filename, i) => ({
        imageUrl: `/uploads/${filename}`,
        position: nextPosition + i,
      }))
    }

    const updateData: Record<string, unknown> = {}
    if (taxonSelection) {
      updateData.taxonLevel = taxonSelection.taxonLevel
      updateData.taxonValue = taxonSelection.taxonValue
      updateData.subfamily = taxonSelection.subfamily
      updateData.genus = taxonSelection.genus
      updateData.species = taxonSelection.species
    }
    if (parsed.data.caste !== undefined) updateData.caste = parsed.data.caste
    if (parsed.data.department !== undefined)
      updateData.department = parsed.data.department
    if (parsed.data.observedAt !== undefined)
      updateData.observedAt = parsed.data.observedAt
    if (parsed.data.biotope !== undefined)
      updateData.biotope = parsed.data.biotope
    if (parsed.data.photoCredit !== undefined)
      updateData.photoCredit =
        encryptSensitiveText(parsed.data.photoCredit) ?? parsed.data.photoCredit
    if (parsed.data.size !== undefined) updateData.size = parsed.data.size
    if (parsed.data.subgenus !== undefined)
      updateData.subgenus = parsed.data.subgenus
    if (parsed.data.speciesGroup !== undefined)
      updateData.speciesGroup = parsed.data.speciesGroup

    const updated = await prisma.entryProposal.update({
      where: { id },
      data: {
        ...updateData,
        ...(imageCreateData
          ? { images: { create: imageCreateData } }
          : undefined),
      },
      include: { images: true },
    })

    return res.json(publicProposal(updated))
  }),
)
