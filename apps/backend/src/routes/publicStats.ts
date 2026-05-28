import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { getLeaderboard } from '../services/stats.js'

export const publicStatsRouter = Router()

publicStatsRouter.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const stats = await getLeaderboard(req.query.limit)
    return res.json(stats)
  }),
)
