import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { AppError } from '../lib/errors.js'
import { recordAdminAudit } from '../lib/adminAudit.js'

export const adminSuggestionsRouter = Router()

const updateSchema = z.object({ 
  status: z.enum(['PENDING', 'PROCESSED', 'REJECTED']),
  rejectionMessage: z.string().optional(),
})

adminSuggestionsRouter.get('/', async (req, res) => {
  const rawStatus = req.query.status
  const statusSchema = z.enum(['PENDING', 'PROCESSED', 'REJECTED']).optional()
  const parsed = statusSchema.safeParse(rawStatus)
  const where = parsed.success && parsed.data ? { status: parsed.data } : undefined

  const items = await prisma.suggestion.findMany({ 
    where, 
    include: { user: true },
    orderBy: { createdAt: 'desc' } 
  })
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
    if (parsed.data.rejectionMessage) {
      data.rejectionMessage = parsed.data.rejectionMessage
    }
  } else {
    data.processedAt = null
  }

  const updated = await prisma.suggestion.update({ 
    where: { id: req.params.id }, 
    data,
    include: { user: true },
  })
  
  await recordAdminAudit(req, {
    action: 'Suggestion mise à jour',
    detail: `Suggestion ${updated.id} → ${updated.status}${updated.user ? ` (${updated.user.username})` : ''}`,
    tone: 'INFO',
    entityType: 'suggestion',
    entityId: updated.id,
  })
  return res.json(updated)
})

adminSuggestionsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.suggestion.findUnique({
    where: { id: req.params.id },
  })

  if (!existing) {
    throw new AppError(404, 'Suggestion introuvable.')
  }

  if (existing.status === 'PENDING') {
    throw new AppError(400, 'Vous ne pouvez supprimer qu’une suggestion déjà traitée ou rejetée.')
  }

  await prisma.suggestion.delete({
    where: { id: req.params.id },
  })

  await recordAdminAudit(req, {
    action: 'Suggestion supprimée',
    detail: `Suggestion ${existing.id} supprimée (${existing.status})`,
    tone: 'INFO',
    entityType: 'suggestion',
    entityId: existing.id,
  })

  return res.status(204).send()
})
