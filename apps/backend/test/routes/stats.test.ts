import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestServer } from '../utils/testServer.js'

const mocks = vi.hoisted(() => ({
  getGameStats: vi.fn(),
  getEntryStats: vi.fn(),
  getLeaderboard: vi.fn(),
}))

vi.mock('../../src/services/stats.js', () => ({
  getGameStats: mocks.getGameStats,
  getEntryStats: mocks.getEntryStats,
  getLeaderboard: mocks.getLeaderboard,
}))

import { statsRouter } from '../../src/routes/stats.js'

const { getBaseUrl } = createTestServer('/api/stats', statsRouter)

beforeEach(() => {
  mocks.getGameStats.mockReset()
  mocks.getEntryStats.mockReset()
  mocks.getLeaderboard.mockReset()
})

describe('GET /api/stats/game', () => {
  it('returns game stats', async () => {
    const data = { period: 'all', levels: [] }
    mocks.getGameStats.mockResolvedValue(data)

    const res = await fetch(`${getBaseUrl()}/api/stats/game`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(data)
    expect(mocks.getGameStats).toHaveBeenCalledWith(undefined)
  })

  it('passes period query param', async () => {
    mocks.getGameStats.mockResolvedValue({ period: '7d', levels: [] })
    await fetch(`${getBaseUrl()}/api/stats/game?period=7d`)
    expect(mocks.getGameStats).toHaveBeenCalledWith('7d')
  })
})

describe('GET /api/stats/entries', () => {
  it('returns entry stats', async () => {
    const data = { period: 'all', totalPhotos: 10, postsByTaxon: [] }
    mocks.getEntryStats.mockResolvedValue(data)

    const res = await fetch(`${getBaseUrl()}/api/stats/entries`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(data)
  })
})

describe('GET /api/stats/leaderboard', () => {
  it('returns leaderboard', async () => {
    const data = { items: [] }
    mocks.getLeaderboard.mockResolvedValue(data)

    const res = await fetch(`${getBaseUrl()}/api/stats/leaderboard`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(data)
  })
})
