import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'
import { createTestServer } from '../utils/testServer.js'

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

import { adminSuggestionsRouter } from '../../src/routes/adminSuggestions.js'

const { getBaseUrl } = createTestServer(
  '/api/admin/suggestions',
  adminSuggestionsRouter,
)

beforeEach(() => {
  resetSharedMocks()
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
    prismaMocks.suggestion.findMany.mockResolvedValue([baseSuggestion])

    const res = await fetch(`${getBaseUrl()}/api/admin/suggestions`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(prismaMocks.suggestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    )
  })

  it('filters by status when provided', async () => {
    prismaMocks.suggestion.findMany.mockResolvedValue([])

    await fetch(`${getBaseUrl()}/api/admin/suggestions?status=PROCESSED`)

    expect(prismaMocks.suggestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PROCESSED' } }),
    )
  })

  it('ignores invalid status filter', async () => {
    prismaMocks.suggestion.findMany.mockResolvedValue([])

    await fetch(`${getBaseUrl()}/api/admin/suggestions?status=INVALID`)

    expect(prismaMocks.suggestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    )
  })
})

describe('PUT /api/admin/suggestions/:id', () => {
  it('updates status to PROCESSED', async () => {
    const updated = { ...baseSuggestion, status: 'PROCESSED' }
    prismaMocks.suggestion.update.mockResolvedValue(updated)
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${getBaseUrl()}/api/admin/suggestions/s1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PROCESSED' }),
    })

    expect(res.status).toBe(200)
    expect(prismaMocks.suggestion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({ status: 'PROCESSED' }),
      }),
    )
  })

  it('resets processedAt when status set back to PENDING', async () => {
    prismaMocks.suggestion.update.mockResolvedValue({
      ...baseSuggestion,
      status: 'PENDING',
    })
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    await fetch(`${getBaseUrl()}/api/admin/suggestions/s1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PENDING' }),
    })

    expect(prismaMocks.suggestion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ processedAt: null }),
      }),
    )
  })

  it('returns 400 for invalid status', async () => {
    const res = await fetch(`${getBaseUrl()}/api/admin/suggestions/s1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INVALID' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/admin/suggestions/:id', () => {
  it('returns 404 when suggestion not found', async () => {
    prismaMocks.suggestion.findUnique.mockResolvedValue(null)

    const res = await fetch(`${getBaseUrl()}/api/admin/suggestions/s1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 when suggestion is still PENDING', async () => {
    prismaMocks.suggestion.findUnique.mockResolvedValue({
      ...baseSuggestion,
      status: 'PENDING',
    })

    const res = await fetch(`${getBaseUrl()}/api/admin/suggestions/s1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(400)
  })

  it('deletes a PROCESSED suggestion and returns 204', async () => {
    prismaMocks.suggestion.findUnique.mockResolvedValue({
      ...baseSuggestion,
      status: 'PROCESSED',
    })
    prismaMocks.suggestion.delete.mockResolvedValue(undefined)
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${getBaseUrl()}/api/admin/suggestions/s1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(204)
    expect(prismaMocks.suggestion.delete).toHaveBeenCalledWith({
      where: { id: 's1' },
    })
  })
})
