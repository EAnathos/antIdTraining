import { type RequestHandler, Router } from 'express'
import multer from 'multer'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { upload } from '../middleware/upload.js'
import { AppError } from '../lib/errors.js'
import { resolveEntryTaxonSelection } from '../services/entries.js'

const entrySchema = z.object({
  taxonLevel: z.enum(['SUBFAMILY', 'GENUS', 'SPECIES']),
  taxonValue: z.string().min(1),
  taxonGenus: z.string().optional().nullable(),
  department: z.string().min(1),
  observedAt: z.coerce.date(),
  biotope: z.string().min(1),
  photoCredit: z.string().min(1),
})

export const entriesRouter = Router()

const uploadEntryImages: RequestHandler = (req, res, next) => {
  upload.array('images', 3)(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Chaque image doit faire 8 Mo maximum.' })
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Vous pouvez envoyer 3 images maximum.' })
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
  const parsed = entrySchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const taxonSelection = await resolveEntryTaxonSelection(parsed.data)
  if (!taxonSelection) {
    throw new AppError(400, 'Taxon introuvable pour ce niveau.')
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  const createData: Prisma.ObservationEntryUncheckedCreateInput = {
    ...taxonSelection,
    department: parsed.data.department,
    observedAt: parsed.data.observedAt,
    biotope: parsed.data.biotope,
    photoCredit: parsed.data.photoCredit,
  }

  const created = await prisma.observationEntry.create({
    data: {
      ...createData,
      images: {
        create: files.map((file) => ({ imageUrl: `/uploads/${file.filename}` })),
      },
    },
    include: { images: true },
  })

  return res.status(201).json(created)
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
  }

  const updated = await prisma.observationEntry.update({
    where: { id: req.params.id },
    data: updateData,
    include: { images: true },
  })

  return res.json(updated)
})

entriesRouter.delete('/:id', async (req, res) => {
  await prisma.observationEntry.delete({ where: { id: req.params.id } })
  return res.status(204).send()
})
