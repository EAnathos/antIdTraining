import express from 'express'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

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
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/stats', statsRouter)
  app.use(errorHandler)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        baseUrl = `http://127.0.0.1:${address.port}`
      }
      resolve()
    })
  })
})

afterAll(
  async () =>
    new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    ),
)

beforeEach(() => {
  mocks.getGameStats.mockReset()
  mocks.getEntryStats.mockReset()
  mocks.getLeaderboard.mockReset()
})

describe('GET /api/stats/game', () => {
  it('returns game stats', async () => {
    const data = { period: 'all', levels: [] }
    mocks.getGameStats.mockResolvedValue(data)

    const res = await fetch(`${baseUrl}/api/stats/game`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(data)
    expect(mocks.getGameStats).toHaveBeenCalledWith(undefined)
  })

  it('passes period query param', async () => {
    mocks.getGameStats.mockResolvedValue({ period: '7d', levels: [] })
    await fetch(`${baseUrl}/api/stats/game?period=7d`)
    expect(mocks.getGameStats).toHaveBeenCalledWith('7d')
  })
})

describe('GET /api/stats/entries', () => {
  it('returns entry stats', async () => {
    const data = { period: 'all', totalPhotos: 10, postsByTaxon: [] }
    mocks.getEntryStats.mockResolvedValue(data)

    const res = await fetch(`${baseUrl}/api/stats/entries`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(data)
  })
})

describe('GET /api/stats/leaderboard', () => {
  it('returns leaderboard', async () => {
    const data = { items: [] }
    mocks.getLeaderboard.mockResolvedValue(data)

    const res = await fetch(`${baseUrl}/api/stats/leaderboard`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(data)
  })
})
