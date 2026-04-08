import { Router } from 'express'
import { getGameStats } from '../services/stats.js'

export const statsRouter = Router()

statsRouter.get('/game', async (req, res) => {
  const stats = await getGameStats(req.query.period)
  return res.json(stats)
})
