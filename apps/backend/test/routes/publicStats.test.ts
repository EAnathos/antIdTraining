import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestServer } from '../utils/testServer.js'

const mocks = vi.hoisted(() => ({
  getLeaderboard: vi.fn(),
}))

vi.mock('../../src/services/stats.js', () => ({
  getLeaderboard: mocks.getLeaderboard,
}))

import { publicStatsRouter } from '../../src/routes/publicStats.js'

const { getBaseUrl } = createTestServer('/api/stats', publicStatsRouter)

beforeEach(() => {
  mocks.getLeaderboard.mockReset()
})

describe('GET /api/stats/leaderboard', () => {
  it('returns leaderboard data', async () => {
    const data = [{ userId: 'u1', username: 'Alice', points: 100 }]
    mocks.getLeaderboard.mockResolvedValue(data)

    const res = await fetch(`${getBaseUrl()}/api/stats/leaderboard`)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(data)
    expect(mocks.getLeaderboard).toHaveBeenCalledWith(undefined)
  })

  it('passes limit query param to service', async () => {
    mocks.getLeaderboard.mockResolvedValue([])

    await fetch(`${getBaseUrl()}/api/stats/leaderboard?limit=5`)

    expect(mocks.getLeaderboard).toHaveBeenCalledWith('5')
  })
})
