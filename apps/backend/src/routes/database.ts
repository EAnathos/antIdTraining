import { Router } from 'express'
import multer from 'multer'
import { AppError } from '../lib/errors.js'
import {
  createDatabaseBundleArchive,
  cleanupUploadFiles,
  databaseSnapshotSchema,
  getDatabaseSnapshot,
  importDatabaseBundleArchive,
  importDatabaseSnapshot,
} from '../services/database.js'
import { recordAdminAudit } from '../lib/adminAudit.js'

export const databaseRouter = Router()
const bundleUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 },
})

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
  await recordAdminAudit(req, {
    action: 'Import base (JSON)',
    detail: 'Base importée depuis payload JSON',
    tone: 'INFO',
    entityType: 'database',
  })
  return res.json(result)
})

databaseRouter.get('/export/bundle', async (req, res) => {
  const archiveBuffer = await createDatabaseBundleArchive()
  const dateTag = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '')

  await recordAdminAudit(req, {
    action: 'Export base + images',
    detail: 'Archive ZIP générée',
    tone: 'INFO',
    entityType: 'database',
  })

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="ant-id-training-bundle-${dateTag}.zip"`)
  return res.send(archiveBuffer)
})

databaseRouter.post('/import/bundle', bundleUpload.single('bundle'), async (req, res) => {
  const file = req.file
  if (!file) {
    throw new AppError(400, 'Archive ZIP manquante (champ bundle).')
  }

  const result = await importDatabaseBundleArchive(file.buffer)
  await recordAdminAudit(req, {
    action: 'Import base + images (ZIP)',
    detail: `${result.imagesRestored ?? 0} images restaurées`,
    tone: 'INFO',
    entityType: 'database',
  })
  return res.json(result)
})

databaseRouter.post('/cleanup/uploads', async (req, res) => {
  const result = await cleanupUploadFiles()
  await recordAdminAudit(req, {
    action: 'Nettoyage uploads',
    detail: `${result.deletedFiles} supprimés, ${result.generatedVariants} variantes générées`,
    tone: 'INFO',
    entityType: 'database',
  })
  return res.json(result)
})
