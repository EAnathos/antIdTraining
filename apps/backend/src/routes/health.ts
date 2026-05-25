import { Router } from 'express'
import { prisma } from '../prisma.js'
import { getRedis } from '../lib/redis.js'
import { buildServiceHealthReport } from '../lib/monitoring.js'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'ant-id-training-backend',
  })
})

healthRouter.get('/ready', async (_req, res, next) => {
  try {
    const report = await buildServiceHealthReport({
      database: prisma,
      redis: getRedis(),
    })

    return res.status(report.ok ? 200 : 503).json(report)
  } catch (error) {
    return next(error)
  }
})