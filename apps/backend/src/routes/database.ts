import { Router } from 'express'
import { AppError } from '../lib/errors.js'
import { databaseSnapshotSchema, getDatabaseSnapshot, importDatabaseSnapshot } from '../services/database.js'

export const databaseRouter = Router()

databaseRouter.get('/export', async (_req, res) => {
  const snapshot = await getDatabaseSnapshot()
  return res.json(snapshot)
})

databaseRouter.post('/import', async (req, res) => {
  const parsed = databaseSnapshotSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide pour l’import de base.')
  }

  const result = await importDatabaseSnapshot(parsed.data)
  return res.json(result)
})
