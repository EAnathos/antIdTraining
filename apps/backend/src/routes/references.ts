import { Router } from 'express'
import { AppError } from '../lib/errors.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createReference, deleteReference, listReferences, referenceSchema, updateReference } from '../services/references.js'
import { recordAdminAudit } from '../lib/adminAudit.js'

export const publicReferencesRouter = Router()
export const adminReferencesRouter = Router()

publicReferencesRouter.get('/', asyncHandler(async (_req, res) => {
  const references = await listReferences()
  return res.json(references)
}))

adminReferencesRouter.post('/', asyncHandler(async (req, res) => {
  const parsed = referenceSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const created = await createReference(parsed.data)
  await recordAdminAudit(req, {
    action: 'Référence créée',
    detail: created.title,
    tone: 'SUCCESS',
    entityType: 'reference',
    entityId: created.id,
  })
  return res.status(201).json(created)
}))

adminReferencesRouter.put('/:id', asyncHandler(async (req, res) => {
  const parsed = referenceSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const updated = await updateReference(req.params.id as string, parsed.data)
  await recordAdminAudit(req, {
    action: 'Référence modifiée',
    detail: updated.title,
    tone: 'INFO',
    entityType: 'reference',
    entityId: updated.id,
  })
  return res.json(updated)
}))

adminReferencesRouter.delete('/:id', asyncHandler(async (req, res) => {
  const deleted = await deleteReference(req.params.id as string)
  await recordAdminAudit(req, {
    action: 'Référence supprimée',
    detail: deleted.title,
    tone: 'ERROR',
    entityType: 'reference',
    entityId: deleted.id,
  })
  return res.status(204).send()
}))
