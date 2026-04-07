import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { upload } from '../middleware/upload.js'

const entrySchema = z.object({
  taxonId: z.string().min(1),
  department: z.string().min(1),
  observedAt: z.coerce.date(),
  biotope: z.string().min(1),
  photoCredit: z.string().min(1),
})

export const entriesRouter = Router()

entriesRouter.get('/', async (_req, res) => {
  const entries = await prisma.observationEntry.findMany({
    include: { taxon: true, images: true },
    orderBy: { observedAt: 'desc' },
  })
  return res.json(entries)
})

entriesRouter.post('/', upload.array('images', 5), async (req, res) => {
  const parsed = entrySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  const created = await prisma.observationEntry.create({
    data: {
      ...parsed.data,
      images: {
        create: files.map((file) => ({ imageUrl: `/uploads/${file.filename}` })),
      },
    },
    include: { taxon: true, images: true },
  })

  return res.status(201).json(created)
})

entriesRouter.put('/:id', async (req, res) => {
  const parsed = entrySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  const updated = await prisma.observationEntry.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { taxon: true, images: true },
  })

  return res.json(updated)
})

entriesRouter.delete('/:id', async (req, res) => {
  await prisma.observationEntry.delete({ where: { id: req.params.id } })
  return res.status(204).send()
})
