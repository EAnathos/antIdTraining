import { Router } from 'express'
import { prisma } from '../prisma.js'

export const adminStatsToolsRouter = Router()

// Réinitialise toutes les statistiques de parties (supprime les sessions)
adminStatsToolsRouter.post('/reset', async (_req, res) => {
  await prisma.gameSession.deleteMany({})
  res.status(204).send()
})
