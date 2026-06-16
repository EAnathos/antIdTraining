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
  getLeaderboard: vi.fn(),
}))

vi.mock('../../src/services/stats.js', () => ({
  getLeaderboard: mocks.getLeaderboard,
}))

import { publicStatsRouter } from '../../src/routes/publicStats.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/stats', publicStatsRouter)
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

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
})

beforeEach(() => {
  mocks.getLeaderboard.mockReset()
})

describe('GET /api/stats/leaderboard', () => {
  it('returns leaderboard data', async () => {
    const data = [{ userId: 'u1', username: 'Alice', points: 100 }]
    mocks.getLeaderboard.mockResolvedValue(data)

    const res = await fetch(`${baseUrl}/api/stats/leaderboard`)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(data)
    expect(mocks.getLeaderboard).toHaveBeenCalledWith(undefined)
  })

  it('passes limit query param to service', async () => {
    mocks.getLeaderboard.mockResolvedValue([])

    await fetch(`${baseUrl}/api/stats/leaderboard?limit=5`)

    expect(mocks.getLeaderboard).toHaveBeenCalledWith('5')
  })
})
