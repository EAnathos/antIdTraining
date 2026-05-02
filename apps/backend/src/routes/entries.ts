import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { type RequestHandler, Router } from 'express'
import multer from 'multer'
import type { Prisma } from '@prisma/client'
import sharp from 'sharp'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { upload } from '../middleware/upload.js'
import { AppError } from '../lib/errors.js'
import { deleteUploadFilesForImageUrl, ensureUploadsDir, resolveUploadFilePath } from '../lib/imageFiles.js'
import { resolveEntryTaxonSelection } from '../services/entries.js'

ensureUploadsDir()

const RESPONSIVE_IMAGE_WIDTHS = [1600, 960, 480] as const

const entrySchema = z.object({
  taxonLevel: z.enum(['SUBFAMILY', 'GENUS', 'SPECIES']),
  taxonValue: z.string().min(1),
  taxonGenus: z.string().optional().nullable(),
  speciesGroup: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  department: z.string().min(1),
  observedAt: z.coerce.date(),
  biotope: z.string().min(1),
  photoCredit: z.string().min(1),
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

entriesRouter.get('/', async (_req, res) => {
  const entries = await prisma.observationEntry.findMany({
    include: { images: true },
    orderBy: { observedAt: 'desc' },
  })
  return res.json(entries)
})

entriesRouter.post('/', uploadEntryImages, async (req, res) => {
  const savedFilePaths: string[] = []

  try {
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
        savedFilePaths.push(...result.savedPaths)
        return result.baseFileName
      }),
    )

    const createData: Prisma.ObservationEntryUncheckedCreateInput = {
      ...taxonSelection,
      department: parsed.data.department,
      observedAt: parsed.data.observedAt,
      biotope: parsed.data.biotope,
      photoCredit: parsed.data.photoCredit,
      speciesGroup: parsed.data.speciesGroup ?? undefined,
      size: parsed.data.size ?? undefined,
    }

    const created = await prisma.observationEntry.create({
      data: {
        ...createData,
        images: {
          create: optimizedFileNames.map((filename) => ({ imageUrl: `/uploads/${filename}` })),
        },
      },
      include: { images: true },
    })

    return res.status(201).json(created)
  } catch (error) {
    for (const filePath of savedFilePaths) {
      fs.rmSync(filePath, { force: true })
    }

    throw error
  }
})

entriesRouter.put('/:id', async (req, res) => {
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
    department: parsed.data.department,
    observedAt: parsed.data.observedAt,
    biotope: parsed.data.biotope,
    photoCredit: parsed.data.photoCredit,
    speciesGroup: parsed.data.speciesGroup ?? undefined,
    size: parsed.data.size ?? undefined,
  }

  const updated = await prisma.observationEntry.update({
    where: { id: req.params.id },
    data: updateData,
    include: { images: true },
  })

  return res.json(updated)
})

entriesRouter.delete('/:id', async (req, res) => {
  const entry = await prisma.observationEntry.findUnique({
    where: { id: req.params.id },
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

  await prisma.observationEntry.delete({ where: { id: req.params.id } })

  for (const image of entry.images) {
    deleteUploadFilesForImageUrl(image.imageUrl)
  }

  return res.status(204).send()
})
