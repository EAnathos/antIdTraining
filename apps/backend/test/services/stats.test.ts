import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))

import {
  buildUserPointRows,
  getUserPoints,
  getLeaderboard,
  getGameStats,
  getEntryStats,
} from '../../src/services/stats.js'

beforeEach(() => {
  resetSharedMocks()
})

describe('buildUserPointRows', () => {
  it('returns empty array for empty userIds', async () => {
    const result = await buildUserPointRows([])
    expect(result).toEqual([])
  })

  it('returns empty array when no users found', async () => {
    prismaMocks.user.findMany.mockResolvedValue([])
    prismaMocks.gameSession.groupBy = vi.fn().mockResolvedValue([])
    const result = await buildUserPointRows(['u1'])
    expect(result).toEqual([])
  })

  it('builds user point rows with game stats', async () => {
    prismaMocks.user.findMany.mockResolvedValue([
      { id: 'u1', username: 'Alice', role: 'USER', points: 500 },
    ])
    prismaMocks.gameSession.groupBy = vi.fn().mockResolvedValue([
      { userId: 'u1', level: 'EASY', finalCorrect: true, _count: { _all: 3 } },
      {
        userId: 'u1',
        level: 'MEDIUM',
        finalCorrect: false,
        _count: { _all: 2 },
      },
    ])

    const rows = await buildUserPointRows(['u1'])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      userId: 'u1',
      username: 'Alice',
      gamesPlayed: 5,
      correctCount: 3,
      wrongCount: 2,
      points: 500,
    })
  })
})

describe('getUserPoints', () => {
  it('returns 0 when user not found', async () => {
    prismaMocks.user.findMany.mockResolvedValue([])
    prismaMocks.gameSession.groupBy = vi.fn().mockResolvedValue([])
    const points = await getUserPoints('unknown')
    expect(points).toBe(0)
  })

  it('returns user points', async () => {
    prismaMocks.user.findMany.mockResolvedValue([
      { id: 'u1', username: 'Alice', role: 'USER', points: 300 },
    ])
    prismaMocks.gameSession.groupBy = vi.fn().mockResolvedValue([])
    const points = await getUserPoints('u1')
    expect(points).toBe(300)
  })
})

describe('getLeaderboard', () => {
  it('returns empty items when no eligible users', async () => {
    prismaMocks.user.findMany.mockResolvedValue([])
    prismaMocks.gameSession.groupBy = vi.fn().mockResolvedValue([])
    const result = await getLeaderboard()
    expect(result.items).toEqual([])
  })

  it('filters users with less than 200 points', async () => {
    prismaMocks.user.findMany.mockResolvedValue([
      { id: 'u1', username: 'Alice', role: 'USER', points: 100 },
      { id: 'u2', username: 'Bob', role: 'USER', points: 500 },
    ])
    prismaMocks.gameSession.groupBy = vi.fn().mockResolvedValue([])

    const result = await getLeaderboard()
    expect(result.items).toHaveLength(1)
    expect(result.items[0].username).toBe('Bob')
  })

  it('respects limit parameter', async () => {
    const users = Array.from({ length: 5 }, (_, i) => ({
      id: `u${i}`,
      username: `User${i}`,
      role: 'USER',
      points: 300 + i * 10,
    }))
    prismaMocks.user.findMany.mockResolvedValue(users)
    prismaMocks.gameSession.groupBy = vi.fn().mockResolvedValue([])

    const result = await getLeaderboard('3')
    expect(result.items).toHaveLength(3)
  })
})

describe('getGameStats', () => {
  it('returns stats with period all by default', async () => {
    prismaMocks.gameSession.groupBy = vi.fn().mockResolvedValue([
      { level: 'EASY', finalCorrect: true, _count: { _all: 10 } },
      { level: 'EASY', finalCorrect: false, _count: { _all: 5 } },
    ])

    const result = await getGameStats(undefined)

    expect(result.period).toBe('all')
    expect(result.levels).toHaveLength(3)
    const easy = result.levels.find((l) => l.level === 'easy')
    expect(easy?.launchedCount).toBe(15)
    expect(easy?.finalCorrectCount).toBe(10)
  })

  it('normalizes unknown period to all', async () => {
    prismaMocks.gameSession.groupBy = vi.fn().mockResolvedValue([])
    const result = await getGameStats('unknown')
    expect(result.period).toBe('all')
  })

  it('accepts 7d and 30d periods', async () => {
    prismaMocks.gameSession.groupBy = vi.fn().mockResolvedValue([])

    const r7 = await getGameStats('7d')
    expect(r7.period).toBe('7d')

    const r30 = await getGameStats('30d')
    expect(r30.period).toBe('30d')
  })
})

describe('getEntryStats', () => {
  it('returns entry stats with totals and taxon breakdown', async () => {
    prismaMocks.entryImage.count = vi.fn().mockResolvedValue(42)
    prismaMocks.observationEntry.groupBy = vi.fn().mockResolvedValue([
      { taxonValue: 'Formica', _count: { _all: 20 } },
      { taxonValue: 'Lasius', _count: { _all: 10 } },
    ])

    const result = await getEntryStats('all')

    expect(result.totalPhotos).toBe(42)
    expect(result.postsByTaxon).toHaveLength(2)
    expect(result.postsByTaxon[0].taxon).toBe('Formica')
  })
})
