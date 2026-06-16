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
  decryptSensitiveText: vi.fn((v: string) => v),
  recordAdminAudit: vi.fn(),
}))

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/lib/encryption.js', () => ({
  decryptSensitiveText: mocks.decryptSensitiveText,
}))
vi.mock('../../src/lib/adminAudit.js', () => ({
  recordAdminAudit: mocks.recordAdminAudit,
}))

const suggestionMock = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}
;(prismaMocks as any).suggestion = suggestionMock

import { adminSuggestionsRouter } from '../../src/routes/adminSuggestions.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/admin/suggestions', adminSuggestionsRouter)
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
  suggestionMock.findMany.mockReset()
  suggestionMock.findUnique.mockReset()
  suggestionMock.update.mockReset()
  suggestionMock.delete.mockReset()
  mocks.recordAdminAudit.mockReset()
})

const baseSuggestion = {
  id: 's1',
  userId: 'u1',
  name: null,
  email: null,
  message: 'Un message de test',
  status: 'PENDING',
  processedAt: null,
  rejectionMessage: null,
  createdAt: new Date().toISOString(),
  user: { id: 'u1', username: 'Alice' },
}

describe('GET /api/admin/suggestions', () => {
  it('returns all suggestions without filter', async () => {
    suggestionMock.findMany.mockResolvedValue([baseSuggestion])

    const res = await fetch(`${baseUrl}/api/admin/suggestions`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(suggestionMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    )
  })

  it('filters by status when provided', async () => {
    suggestionMock.findMany.mockResolvedValue([])

    await fetch(`${baseUrl}/api/admin/suggestions?status=PROCESSED`)

    expect(suggestionMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PROCESSED' } }),
    )
  })

  it('ignores invalid status filter', async () => {
    suggestionMock.findMany.mockResolvedValue([])

    await fetch(`${baseUrl}/api/admin/suggestions?status=INVALID`)

    expect(suggestionMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    )
  })
})

describe('PUT /api/admin/suggestions/:id', () => {
  it('updates status to PROCESSED', async () => {
    const updated = { ...baseSuggestion, status: 'PROCESSED' }
    suggestionMock.update.mockResolvedValue(updated)
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/suggestions/s1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PROCESSED' }),
    })

    expect(res.status).toBe(200)
    expect(suggestionMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({ status: 'PROCESSED' }),
      }),
    )
  })

  it('resets processedAt when status set back to PENDING', async () => {
    suggestionMock.update.mockResolvedValue({
      ...baseSuggestion,
      status: 'PENDING',
    })
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    await fetch(`${baseUrl}/api/admin/suggestions/s1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PENDING' }),
    })

    expect(suggestionMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ processedAt: null }),
      }),
    )
  })

  it('returns 400 for invalid status', async () => {
    const res = await fetch(`${baseUrl}/api/admin/suggestions/s1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INVALID' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/admin/suggestions/:id', () => {
  it('returns 404 when suggestion not found', async () => {
    suggestionMock.findUnique.mockResolvedValue(null)

    const res = await fetch(`${baseUrl}/api/admin/suggestions/s1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 when suggestion is still PENDING', async () => {
    suggestionMock.findUnique.mockResolvedValue({
      ...baseSuggestion,
      status: 'PENDING',
    })

    const res = await fetch(`${baseUrl}/api/admin/suggestions/s1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(400)
  })

  it('deletes a PROCESSED suggestion and returns 204', async () => {
    suggestionMock.findUnique.mockResolvedValue({
      ...baseSuggestion,
      status: 'PROCESSED',
    })
    suggestionMock.delete.mockResolvedValue(undefined)
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/suggestions/s1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(204)
    expect(suggestionMock.delete).toHaveBeenCalledWith({ where: { id: 's1' } })
  })
})
