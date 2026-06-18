import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'
import { createTestServer } from '../utils/testServer.js'

const mocks = vi.hoisted(() => ({
  decryptSensitiveText: vi.fn((v: string) => v),
  recordAdminAudit: vi.fn(),
  invalidateGameEntryCacheSafely: vi.fn(),
}))

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/lib/encryption.js', () => ({
  decryptSensitiveText: mocks.decryptSensitiveText,
}))
vi.mock('../../src/lib/adminAudit.js', () => ({
  recordAdminAudit: mocks.recordAdminAudit,
}))
vi.mock('../../src/lib/gameEntryCache.js', () => ({
  invalidateGameEntryCacheSafely: mocks.invalidateGameEntryCacheSafely,
}))

import { adminProposalsRouter } from '../../src/routes/adminProposals.js'

const { getBaseUrl } = createTestServer(
  '/api/admin/proposals',
  adminProposalsRouter,
)

beforeEach(() => {
  resetSharedMocks()
  mocks.recordAdminAudit.mockReset()
  mocks.invalidateGameEntryCacheSafely.mockReset()
})

const baseProposal = {
  id: 'p1',
  userId: 'u1',
  taxonLevel: 'GENUS',
  taxonValue: 'Formica',
  subfamily: 'Formicinae',
  genus: 'Formica',
  species: null,
  subgenus: null,
  speciesGroup: null,
  size: null,
  caste: 'WORKER',
  department: '75',
  observedAt: new Date().toISOString(),
  biotope: 'Prairie',
  photoCredit: 'Alice',
  status: 'PENDING',
  processedAt: null,
  rejectionMessage: null,
  createdAt: new Date().toISOString(),
  images: [],
  user: { id: 'u1', username: 'Alice' },
}

describe('GET /api/admin/proposals', () => {
  it('returns all proposals', async () => {
    prismaMocks.entryProposal.findMany.mockResolvedValue([baseProposal])

    const res = await fetch(`${getBaseUrl()}/api/admin/proposals`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })

  it('filters by status when provided', async () => {
    prismaMocks.entryProposal.findMany.mockResolvedValue([])

    await fetch(`${getBaseUrl()}/api/admin/proposals?status=PENDING`)

    expect(prismaMocks.entryProposal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING' }),
      }),
    )
  })

  it('filters by userId when provided', async () => {
    prismaMocks.entryProposal.findMany.mockResolvedValue([])

    await fetch(`${getBaseUrl()}/api/admin/proposals?userId=u1`)

    expect(prismaMocks.entryProposal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'u1' }),
      }),
    )
  })
})

describe('PUT /api/admin/proposals/:id — reject', () => {
  it('returns 404 when proposal not found', async () => {
    prismaMocks.entryProposal.findUnique.mockResolvedValue(null)

    const res = await fetch(`${getBaseUrl()}/api/admin/proposals/p1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'REJECT',
        rejectionMessage: 'Photo de mauvaise qualité.',
      }),
    })
    expect(res.status).toBe(404)
  })

  it('rejects proposal and returns REJECTED status', async () => {
    prismaMocks.entryProposal.findUnique.mockResolvedValue(baseProposal)
    prismaMocks.entryProposal.update.mockResolvedValue({
      ...baseProposal,
      status: 'REJECTED',
    })
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${getBaseUrl()}/api/admin/proposals/p1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'REJECT',
        rejectionMessage: 'Photo floue.',
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('REJECTED')
    expect(prismaMocks.entryProposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectionMessage: 'Photo floue.',
        }),
      }),
    )
  })

  it('returns 400 for invalid decision', async () => {
    const res = await fetch(`${getBaseUrl()}/api/admin/proposals/p1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'MAYBE' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/admin/proposals/:id — accept', () => {
  it('accepts proposal, creates entry, invalidates cache', async () => {
    prismaMocks.entryProposal.findUnique.mockResolvedValue(baseProposal)
    prismaMocks.observationEntry.create.mockResolvedValue({
      ...baseProposal,
      id: 'entry-1',
      images: [],
    })
    prismaMocks.entryProposal.update.mockResolvedValue({
      ...baseProposal,
      status: 'ACCEPTED',
    })
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${getBaseUrl()}/api/admin/proposals/p1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'ACCEPT' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ACCEPTED')
    expect(prismaMocks.observationEntry.create).toHaveBeenCalled()
    expect(mocks.invalidateGameEntryCacheSafely).toHaveBeenCalled()
  })
})

describe('DELETE /api/admin/proposals/:id', () => {
  it('returns 404 when not found', async () => {
    prismaMocks.entryProposal.findUnique.mockResolvedValue(null)

    const res = await fetch(`${getBaseUrl()}/api/admin/proposals/p1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 when proposal is still PENDING', async () => {
    prismaMocks.entryProposal.findUnique.mockResolvedValue({
      ...baseProposal,
      status: 'PENDING',
    })

    const res = await fetch(`${getBaseUrl()}/api/admin/proposals/p1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(400)
  })

  it('deletes a REJECTED proposal and returns 204', async () => {
    prismaMocks.entryProposal.findUnique.mockResolvedValue({
      ...baseProposal,
      status: 'REJECTED',
    })
    prismaMocks.entryProposal.delete.mockResolvedValue(undefined)
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${getBaseUrl()}/api/admin/proposals/p1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(204)
    expect(prismaMocks.entryProposal.delete).toHaveBeenCalledWith({
      where: { id: 'p1' },
    })
  })
})
