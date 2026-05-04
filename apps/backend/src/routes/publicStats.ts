import { Router } from 'express'
import { getLeaderboard } from '../services/stats.js'

export const publicStatsRouter = Router()

publicStatsRouter.get('/leaderboard', async (req, res) => {
  const stats = await getLeaderboard(req.query.limit)
  return res.json(stats)
})