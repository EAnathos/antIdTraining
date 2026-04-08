import { Router } from 'express'
import { AppError } from '../lib/errors.js'
import { createReference, deleteReference, listReferences, referenceSchema, updateReference } from '../services/references.js'

export const publicReferencesRouter = Router()
export const adminReferencesRouter = Router()

publicReferencesRouter.get('/', async (_req, res) => {
  const references = await listReferences()
  return res.json(references)
})

adminReferencesRouter.post('/', async (req, res) => {
  const parsed = referenceSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const created = await createReference(parsed.data)
  return res.status(201).json(created)
})

adminReferencesRouter.put('/:id', async (req, res) => {
  const parsed = referenceSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const updated = await updateReference(req.params.id, parsed.data)
  return res.json(updated)
})

adminReferencesRouter.delete('/:id', async (req, res) => {
  await deleteReference(req.params.id)
  return res.status(204).send()
})
