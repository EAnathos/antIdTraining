import { Router } from 'express'
import { getGameStats, getEntryStats } from '../services/stats.js'

export const statsRouter = Router()

statsRouter.get('/game', async (req, res) => {
  const stats = await getGameStats(req.query.period)
  return res.json(stats)
})

// Stats about observation entries (photos, posts per taxon)
statsRouter.get('/entries', async (req, res) => {
  const stats = await getEntryStats(req.query.period)
  return res.json(stats)
})
