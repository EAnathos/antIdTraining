import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listAdminHistoryEvents: vi.fn(),
}))

vi.mock('../../src/services/adminHistory.js', () => ({
  listAdminHistoryEvents: mocks.listAdminHistoryEvents,
}))

import { adminHistoryRouter } from '../../src/routes/adminHistory.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/admin/history', adminHistoryRouter)
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

describe('GET /api/admin/history', () => {
  it('returns history events', async () => {
    const events = [
      {
        id: 'e1',
        at: '2024-01-01T00:00:00.000Z',
        title: 'Action',
        detail: 'detail',
        tone: 'info',
      },
    ]
    mocks.listAdminHistoryEvents.mockResolvedValue(events)

    const res = await fetch(`${baseUrl}/api/admin/history`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].title).toBe('Action')
    expect(mocks.listAdminHistoryEvents).toHaveBeenCalledWith(100)
  })
})
