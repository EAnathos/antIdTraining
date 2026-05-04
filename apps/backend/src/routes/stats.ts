import { Router } from 'express'
import { getGameStats, getEntryStats, getLeaderboard } from '../services/stats.js'

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

statsRouter.get('/leaderboard', async (req, res) => {
  const stats = await getLeaderboard(req.query.limit)
  return res.json(stats)
})
