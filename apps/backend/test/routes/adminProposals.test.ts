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

const entryProposalMock = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}
;(prismaMocks as any).entryProposal = entryProposalMock

import { adminProposalsRouter } from '../../src/routes/adminProposals.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/admin/proposals', adminProposalsRouter)
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
  entryProposalMock.findMany.mockReset()
  entryProposalMock.findUnique.mockReset()
  entryProposalMock.update.mockReset()
  entryProposalMock.delete.mockReset()
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
    entryProposalMock.findMany.mockResolvedValue([baseProposal])

    const res = await fetch(`${baseUrl}/api/admin/proposals`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })

  it('filters by status when provided', async () => {
    entryProposalMock.findMany.mockResolvedValue([])

    await fetch(`${baseUrl}/api/admin/proposals?status=PENDING`)

    expect(entryProposalMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING' }),
      }),
    )
  })

  it('filters by userId when provided', async () => {
    entryProposalMock.findMany.mockResolvedValue([])

    await fetch(`${baseUrl}/api/admin/proposals?userId=u1`)

    expect(entryProposalMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'u1' }),
      }),
    )
  })
})

describe('PUT /api/admin/proposals/:id — reject', () => {
  it('returns 404 when proposal not found', async () => {
    entryProposalMock.findUnique.mockResolvedValue(null)

    const res = await fetch(`${baseUrl}/api/admin/proposals/p1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'REJECT' }),
    })
    expect(res.status).toBe(404)
  })

  it('rejects proposal and returns REJECTED status', async () => {
    entryProposalMock.findUnique.mockResolvedValue(baseProposal)
    entryProposalMock.update.mockResolvedValue({
      ...baseProposal,
      status: 'REJECTED',
    })
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/proposals/p1`, {
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
    expect(entryProposalMock.update).toHaveBeenCalledWith(
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
    const res = await fetch(`${baseUrl}/api/admin/proposals/p1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'MAYBE' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/admin/proposals/:id — accept', () => {
  it('accepts proposal, creates entry, invalidates cache', async () => {
    entryProposalMock.findUnique.mockResolvedValue(baseProposal)
    prismaMocks.observationEntry.create.mockResolvedValue({
      ...baseProposal,
      id: 'entry-1',
      images: [],
    })
    entryProposalMock.update.mockResolvedValue({
      ...baseProposal,
      status: 'ACCEPTED',
    })
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/proposals/p1`, {
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
    entryProposalMock.findUnique.mockResolvedValue(null)

    const res = await fetch(`${baseUrl}/api/admin/proposals/p1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 when proposal is still PENDING', async () => {
    entryProposalMock.findUnique.mockResolvedValue({
      ...baseProposal,
      status: 'PENDING',
    })

    const res = await fetch(`${baseUrl}/api/admin/proposals/p1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(400)
  })

  it('deletes a REJECTED proposal and returns 204', async () => {
    entryProposalMock.findUnique.mockResolvedValue({
      ...baseProposal,
      status: 'REJECTED',
    })
    entryProposalMock.delete.mockResolvedValue(undefined)
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/proposals/p1`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(204)
    expect(entryProposalMock.delete).toHaveBeenCalledWith({
      where: { id: 'p1' },
    })
  })
})
