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
  buildUserPointRows: vi.fn(),
  recordAdminAudit: vi.fn(),
}))

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/services/stats.js', () => ({
  buildUserPointRows: mocks.buildUserPointRows,
}))
vi.mock('../../src/lib/adminAudit.js', () => ({
  recordAdminAudit: mocks.recordAdminAudit,
}))

import { adminUsersRouter } from '../../src/routes/adminUsers.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/admin/users', adminUsersRouter)
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
  mocks.buildUserPointRows.mockReset()
  mocks.recordAdminAudit.mockReset()
})

describe('GET /api/admin/users', () => {
  it('returns users with their points', async () => {
    prismaMocks.user.findMany.mockResolvedValue([
      { id: 'u1', username: 'Alice', role: 'USER', createdAt: new Date() },
    ])
    mocks.buildUserPointRows.mockResolvedValue([{ userId: 'u1', points: 300 }])

    const res = await fetch(`${baseUrl}/api/admin/users`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].username).toBe('Alice')
    expect(body[0].points).toBe(300)
  })

  it('defaults to 0 points when user not in point rows', async () => {
    prismaMocks.user.findMany.mockResolvedValue([
      { id: 'u1', username: 'Alice', role: 'USER', createdAt: new Date() },
    ])
    mocks.buildUserPointRows.mockResolvedValue([])

    const res = await fetch(`${baseUrl}/api/admin/users`)
    const body = await res.json()
    expect(body[0].points).toBe(0)
  })
})

describe('PUT /api/admin/users/:id/points', () => {
  it('updates user points', async () => {
    prismaMocks.user.findUnique.mockResolvedValue({
      id: 'u1',
      username: 'Alice',
      role: 'USER',
    })
    prismaMocks.user.update.mockResolvedValue({
      id: 'u1',
      username: 'Alice',
      role: 'USER',
      points: 500,
    })
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/users/u1/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: 500 }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.points).toBe(500)
  })

  it('returns 400 for invalid points (negative)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/u1/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: -1 }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 when user not found', async () => {
    prismaMocks.user.findUnique.mockResolvedValue(null)

    const res = await fetch(`${baseUrl}/api/admin/users/unknown/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: 100 }),
    })
    expect(res.status).toBe(404)
  })
})
