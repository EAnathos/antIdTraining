import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'

type DbLevel = 'EASY' | 'MEDIUM' | 'HARD'

const LEVELS: { db: DbLevel; api: 'easy' | 'medium' | 'hard' }[] = [
  { db: 'EASY', api: 'easy' },
  { db: 'MEDIUM', api: 'medium' },
  { db: 'HARD', api: 'hard' },
]

type StatsPeriod = '7d' | '30d' | 'all'

function normalizePeriod(value: unknown): StatsPeriod {
  const period = String(value ?? 'all').toLowerCase()
  if (period === '7d' || period === '30d') {
    return period
  }

  return 'all'
}

function getPeriodDate(period: StatsPeriod): Date | null {
  if (period === 'all') {
    return null
  }

  const now = new Date()
  const days = period === '7d' ? 7 : 30
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

export const statsRouter = Router()

statsRouter.get('/game', async (req, res) => {
  const period = normalizePeriod(req.query.period)
  const startDate = getPeriodDate(period)

  const stats = await Promise.all(
    LEVELS.map(async ({ db, api }) => {
      const baseWhere: Prisma.GameSessionWhereInput = {
        level: db,
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      }

      const [launchedCount, finalizedCount, finalCorrectCount] = await Promise.all([
        prisma.gameSession.count({ where: baseWhere }),
        prisma.gameSession.count({ where: { ...baseWhere, finalCorrect: { not: null } } }),
        prisma.gameSession.count({ where: { ...baseWhere, finalCorrect: true } }),
      ])

      const finalCorrectRate = finalizedCount > 0 ? Number(((finalCorrectCount / finalizedCount) * 100).toFixed(1)) : 0

      return {
        level: api,
        launchedCount,
        finalizedCount,
        finalCorrectCount,
        finalCorrectRate,
      }
    }),
  )

  return res.json({ period, levels: stats })
})
