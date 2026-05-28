import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { prisma } from '../prisma.js'
import { recordAdminAudit } from '../lib/adminAudit.js'

export const adminStatsToolsRouter = Router()

// Réinitialise toutes les statistiques de parties (supprime les sessions)
adminStatsToolsRouter.post(
  '/reset',
  asyncHandler(async (req, res) => {
    const result = await prisma.gameSession.deleteMany({})
    await recordAdminAudit(req, {
      action: 'Statistiques réinitialisées',
      detail: `${result.count} sessions supprimées`,
      tone: 'INFO',
      entityType: 'stats',
    })
    res.status(204).send()
  }),
)
