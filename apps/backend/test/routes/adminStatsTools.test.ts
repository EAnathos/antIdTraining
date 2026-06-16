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
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

const mocks = vi.hoisted(() => ({
  recordAdminAudit: vi.fn(),
}))

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/lib/adminAudit.js', () => ({
  recordAdminAudit: mocks.recordAdminAudit,
}))

import { adminStatsToolsRouter } from '../../src/routes/adminStatsTools.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/admin/stats-tools', adminStatsToolsRouter)
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
  resetSharedMocks()
  mocks.recordAdminAudit.mockReset()
})

describe('POST /api/admin/stats-tools/reset', () => {
  it('deletes all game sessions and returns 204', async () => {
    prismaMocks.gameSession.deleteMany = vi.fn().mockResolvedValue({ count: 5 })
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/stats-tools/reset`, {
      method: 'POST',
    })

    expect(res.status).toBe(204)
    expect(prismaMocks.gameSession.deleteMany).toHaveBeenCalledWith({})
    expect(mocks.recordAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'Statistiques réinitialisées',
        detail: '5 sessions supprimées',
      }),
    )
  })
})
