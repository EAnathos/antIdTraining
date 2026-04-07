import { ReferenceType } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'

const referenceSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum([ReferenceType.WEBSITE, ReferenceType.MYRMECOLOGY]),
  url: z.string().url().optional().nullable(),
})

export const referencesRouter = Router()

referencesRouter.get('/', async (_req, res) => {
  const references = await prisma.reference.findMany({
    orderBy: [{ type: 'asc' }, { title: 'asc' }],
  })
  return res.json(references)
})

referencesRouter.post('/', async (req, res) => {
  const parsed = referenceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  const created = await prisma.reference.create({ data: parsed.data })
  return res.status(201).json(created)
})

referencesRouter.put('/:id', async (req, res) => {
  const parsed = referenceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  const updated = await prisma.reference.update({
    where: { id: req.params.id },
    data: parsed.data,
  })
  return res.json(updated)
})

referencesRouter.delete('/:id', async (req, res) => {
  await prisma.reference.delete({ where: { id: req.params.id } })
  return res.status(204).send()
})
