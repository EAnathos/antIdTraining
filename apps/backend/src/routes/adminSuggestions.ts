import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { AppError } from '../lib/errors.js'

export const adminSuggestionsRouter = Router()

const updateSchema = z.object({ status: z.enum(['PENDING', 'PROCESSED', 'REJECTED']) })

adminSuggestionsRouter.get('/', async (req, res) => {
  const rawStatus = req.query.status
  const statusSchema = z.enum(['PENDING', 'PROCESSED', 'REJECTED']).optional()
  const parsed = statusSchema.safeParse(rawStatus)
  const where = parsed.success && parsed.data ? { status: parsed.data } : undefined

  const items = await prisma.suggestion.findMany({ where, orderBy: { createdAt: 'desc' } })
  return res.json(items)
})

adminSuggestionsRouter.put('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const data: any = { status: parsed.data.status }
  if (parsed.data.status === 'PROCESSED' || parsed.data.status === 'REJECTED') {
    data.processedAt = new Date()
  } else {
    data.processedAt = null
  }

  const updated = await prisma.suggestion.update({ where: { id: req.params.id }, data })
  return res.json(updated)
})
