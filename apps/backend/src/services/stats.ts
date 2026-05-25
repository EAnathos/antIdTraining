import { prisma } from '../prisma.js'

type UserPointRow = {
  userId: string
  username: string
  role: 'ADMIN' | 'USER'
  gamesPlayed: number
  correctCount: number
  wrongCount: number
  points: number
}

type DbLevel = 'EASY' | 'MEDIUM' | 'HARD'

const LEVELS: { db: DbLevel; api: 'easy' | 'medium' | 'hard' }[] = [
  { db: 'EASY', api: 'easy' },
  { db: 'MEDIUM', api: 'medium' },
  { db: 'HARD', api: 'hard' },
]

const GAME_POINTS_BY_LEVEL: Record<DbLevel, { correct: number; wrong: number }> = {
  EASY: { correct: 5, wrong: -2 },
  MEDIUM: { correct: 10, wrong: -5 },
  HARD: { correct: 15, wrong: -5 },
}

export type StatsPeriod = '7d' | '30d' | 'all'

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

export async function buildUserPointRows(userIds?: string[]) {
  if (userIds && userIds.length === 0) {
    return []
  }

  const users = await prisma.user.findMany({
    ...(userIds ? { where: { id: { in: userIds } } } : {}),
    select: {
      id: true,
      username: true,
      role: true,
      points: true,
    },
  })

  if (!users.length) {
    return []
  }

  const grouped = await prisma.gameSession.groupBy({
    by: ['userId', 'level', 'finalCorrect'],
    where: {
      userId: { in: users.map((user) => user.id) },
      finalCorrect: { not: null },
    },
    _count: { _all: true },
  })

  const rows = new Map<string, UserPointRow>(
    users.map((user) => [
      user.id,
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        gamesPlayed: 0,
        correctCount: 0,
        wrongCount: 0,
        points: user.points,
      },
    ]),
  )

  grouped.forEach((group) => {
    if (!group.userId) {
      return
    }

    const current = rows.get(group.userId)
    if (!current) {
      return
    }

    current.gamesPlayed += group._count._all
    if (group.finalCorrect === true) {
      current.correctCount += group._count._all
    }

  })

  return Array.from(rows.values()).map((row) => ({
    ...row,
    wrongCount: row.gamesPlayed - row.correctCount,
  }))
}

export async function getUserPoints(userId: string) {
  const rows = await buildUserPointRows([userId])
  return rows[0]?.points ?? 0
}

export async function getGameStats(periodInput: unknown) {
  const period = normalizePeriod(periodInput)
  const startDate = getPeriodDate(period)

  const groupedStats = await prisma.gameSession.groupBy({
    by: ['level', 'finalCorrect'],
    ...(startDate ? { where: { createdAt: { gte: startDate } } } : {}),
    _count: { _all: true },
  })

  const statsByLevel = new Map<DbLevel, { launchedCount: number; finalizedCount: number; finalCorrectCount: number }>(
    LEVELS.map(({ db }) => [db, { launchedCount: 0, finalizedCount: 0, finalCorrectCount: 0 }]),
  )

  groupedStats.forEach(({ level, finalCorrect, _count }) => {
    const current = statsByLevel.get(level)
    if (!current) {
      return
    }

    current.launchedCount += _count._all
    if (finalCorrect !== null) {
      current.finalizedCount += _count._all
    }
    if (finalCorrect === true) {
      current.finalCorrectCount += _count._all
    }
  })

  const levels = LEVELS.map(({ db, api }) => {
    const current = statsByLevel.get(db) ?? { launchedCount: 0, finalizedCount: 0, finalCorrectCount: 0 }
    const finalCorrectRate = current.finalizedCount > 0 ? Number(((current.finalCorrectCount / current.finalizedCount) * 100).toFixed(1)) : 0

    return {
      level: api,
      launchedCount: current.launchedCount,
      finalizedCount: current.finalizedCount,
      finalCorrectCount: current.finalCorrectCount,
      finalCorrectRate,
    }
  })

  return { period, levels }
}

export async function getEntryStats(periodInput: unknown) {
  const period = normalizePeriod(periodInput)
  const startDate = getPeriodDate(period)

  // Total photos (optionally filtered by period)
  const totalPhotos = await prisma.entryImage.count({ ...(startDate ? { where: { createdAt: { gte: startDate } } } : {}) })

  // Number of posts per taxonValue (optionally filtered by period)
  const groupByTaxon = await prisma.observationEntry.groupBy({
    by: ['taxonValue'],
    ...(startDate ? { where: { createdAt: { gte: startDate } } } : {}),
    _count: { _all: true },
  })

  const postsByTaxon = groupByTaxon
    .map((g) => ({ taxon: g.taxonValue, count: g._count._all }))
    .sort((a, b) => b.count - a.count)

  return { period, totalPhotos, postsByTaxon }
}

export async function getLeaderboard(limitInput?: unknown) {
  const limit = Math.max(1, Math.min(Number(limitInput ?? 10) || 10, 50))
  const sessions = (await buildUserPointRows())
    .filter((item) => item.points > 200)
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.points - a.points)
    .slice(0, limit)

  return {
    items: sessions.map((session) => ({
      userId: session.userId,
      username: session.username,
      gamesPlayed: session.gamesPlayed,
      correctCount: session.correctCount,
      wrongCount: session.wrongCount,
      points: session.points,
    })),
  }
}
