import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { type RequestHandler, Router } from 'express'
import multer from 'multer'
import type { Prisma } from '@prisma/client'
import sharp from 'sharp'
import { z } from 'zod'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { prisma } from '../prisma.js'
import { upload } from '../middleware/upload.js'
import { AppError } from '../lib/errors.js'
import { deleteUploadFilesForImageUrl, ensureUploadsDir, resolveUploadFilePath } from '../lib/imageFiles.js'
import { resolveEntryTaxonSelection } from '../services/entries.js'
import { recordAdminAudit } from '../lib/adminAudit.js'

ensureUploadsDir()

const RESPONSIVE_IMAGE_WIDTHS = [1600, 960, 480] as const

const entrySchema = z.object({
  taxonLevel: z.enum(['SUBFAMILY', 'GENUS', 'SPECIES']),
  taxonValue: z.string().min(1, 'Valeur requise').max(255, 'Valeur trop longue').trim(),
  taxonGenus: z.string().max(255, 'Trop long').trim().optional().nullable(),
  subgenus: z.string().max(255, 'Trop long').trim().optional().nullable(),
  speciesGroup: z.string().max(255, 'Trop long').trim().optional().nullable(),
  department: z.string().min(2, 'Département invalide').max(2, 'Département invalide').regex(/^[0-9]{2}$/, 'Département invalide').trim(),
  observedAt: z.coerce.date().max(new Date(), 'La date ne peut pas être dans le futur'),
  biotope: z.string().min(3, 'Biotope trop court').max(1000, 'Biotope trop long').trim(),
  photoCredit: z.string().min(3, 'Crédit photo trop court').max(255, 'Crédit photo trop long').trim(),
  size: z.string().max(100, 'Taille trop longue').trim().optional().nullable(),
  caste: z.enum(['WORKER', 'QUEEN', 'MALE']),
})

export const entriesRouter = Router()

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

const uploadEntryImages: RequestHandler = (req, res, next) => {
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
      return res.status(400).json({ message: 'Erreur lors de l’upload des images.' })
    }

    return next()
  })
}

entriesRouter.get('/', asyncHandler(async (_req, res) => {
  const entries = await prisma.observationEntry.findMany({
    include: { images: { orderBy: [{ position: 'asc' } as any, { createdAt: 'asc' }] } },
    orderBy: { observedAt: 'desc' },
  })
  return res.json(entries)
}))

entriesRouter.post('/', uploadEntryImages, asyncHandler(async (req, res) => {
  const parsed = entrySchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const taxonSelection = await resolveEntryTaxonSelection(parsed.data)
  if (!taxonSelection) {
    throw new AppError(400, 'Taxon introuvable pour ce niveau.')
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  const optimizedFileNames = await Promise.all(
    files.map(async (file, index) => {
      const result = await optimizeAndSaveImage(file, index)
      return result.baseFileName
    }),
  )

  const createData: Prisma.ObservationEntryUncheckedCreateInput = {
    ...taxonSelection,
    caste: parsed.data.caste,
    size: parsed.data.size?.trim() || (taxonSelection as any).size || undefined,
    department: parsed.data.department,
    observedAt: parsed.data.observedAt,
    biotope: parsed.data.biotope,
    photoCredit: parsed.data.photoCredit,
    subgenus: parsed.data.subgenus ?? undefined,
    speciesGroup: parsed.data.speciesGroup ?? undefined,
  }

  const created = await prisma.observationEntry.create({
    data: {
      ...createData,
      images: {
        create: optimizedFileNames.map((filename, i) => ({ imageUrl: `/uploads/${filename}`, position: i })),
      },
    },
    include: { images: true },
  })

  await recordAdminAudit(req, {
    action: 'Entrée créée',
    detail: `${created.subfamily} · ${created.genus ?? '-'} · ${created.species ?? '-'} (${created.department})`,
    tone: 'SUCCESS',
    entityType: 'entry',
    entityId: created.id,
  })

  return res.status(201).json(created)
}))

entriesRouter.put('/:id', asyncHandler(async (req, res) => {
  const parsed = entrySchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const taxonSelection = await resolveEntryTaxonSelection(parsed.data)
  if (!taxonSelection) {
    throw new AppError(400, 'Taxon introuvable pour ce niveau.')
  }

  const updateData: Prisma.ObservationEntryUncheckedUpdateInput = {
    ...taxonSelection,
    caste: parsed.data.caste,
    size: parsed.data.size?.trim() || (taxonSelection as any).size || undefined,
    department: parsed.data.department,
    observedAt: parsed.data.observedAt,
    biotope: parsed.data.biotope,
    photoCredit: parsed.data.photoCredit,
    subgenus: parsed.data.subgenus ?? undefined,
    speciesGroup: parsed.data.speciesGroup ?? undefined,
  }

  const updated = await prisma.observationEntry.update({
    where: { id: req.params.id as string },
    data: updateData,
    include: { images: true },
  })

  await recordAdminAudit(req, {
    action: 'Entrée modifiée',
    detail: `${updated.subfamily} · ${updated.genus ?? '-'} · ${updated.species ?? '-'} (${updated.department})`,
    tone: 'INFO',
    entityType: 'entry',
    entityId: updated.id,
  })

  return res.json(updated)
}))

entriesRouter.put('/:id/images/order', asyncHandler(async (req, res) => {
  const bodySchema = z.object({ imageIds: z.array(z.string().min(1)).min(1, 'Au moins une image requise').max(10, 'Max 10 images') })
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const { imageIds } = parsed.data
  const entryId = req.params.id as string

  const existing = await prisma.entryImage.findMany({ where: { entryId } })
  const existingIds = new Set(existing.map((i) => i.id))

  // Ensure provided ids belong to the entry
  for (const id of imageIds) {
    if (!existingIds.has(id)) {
      throw new AppError(400, 'Une des images n’appartient pas à cette entrée.')
    }
  }

  // Apply new positions in a transaction
  await prisma.$transaction(
    imageIds.map((id, index) => prisma.entryImage.update({ where: { id }, data: ({ position: index } as any) })),
  )

  const updatedImages = await prisma.entryImage.findMany({ where: { entryId }, orderBy: [{ position: 'asc' } as any, { createdAt: 'asc' }] })

  await recordAdminAudit(req, {
    action: 'Ordre des images modifié',
    detail: `Entrée ${entryId}`,
    tone: 'INFO',
    entityType: 'entry',
    entityId: entryId,
  })

  return res.json(updatedImages)
}))

entriesRouter.delete('/:id', asyncHandler(async (req, res) => {
  const entry = await prisma.observationEntry.findUnique({
    where: { id: req.params.id as string },
    select: {
      images: {
        select: {
          imageUrl: true,
        },
      },
    },
  })

  if (!entry) {
    throw new AppError(404, 'Entrée introuvable.')
  }

  await prisma.observationEntry.delete({ where: { id: req.params.id as string } })

  for (const image of entry.images) {
    deleteUploadFilesForImageUrl(image.imageUrl)
  }

  await recordAdminAudit(req, {
    action: 'Entrée supprimée',
    detail: `Entrée ${req.params.id as string}`,
    tone: 'ERROR',
    entityType: 'entry',
    entityId: req.params.id as string,
  })

  return res.status(204).send()
}))
