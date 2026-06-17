import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'
import { createTestServer } from '../utils/testServer.js'

const mocks = vi.hoisted(() => ({
  decryptSensitiveText: vi.fn((v: string) => v),
  encryptSensitiveText: vi.fn((v: string) => `enc:${v}`),
  recordAdminAudit: vi.fn(),
  resolveEntryTaxonSelection: vi.fn(),
  ensureUploadsDir: vi.fn(),
  deleteUploadFilesForImageUrl: vi.fn(),
  resolveUploadFilePath: vi.fn((f: string) => `/tmp/${f}`),
}))

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/lib/encryption.js', () => ({
  decryptSensitiveText: mocks.decryptSensitiveText,
  encryptSensitiveText: mocks.encryptSensitiveText,
}))
vi.mock('../../src/lib/adminAudit.js', () => ({
  recordAdminAudit: mocks.recordAdminAudit,
}))
vi.mock('../../src/services/entries.js', () => ({
  resolveEntryTaxonSelection: mocks.resolveEntryTaxonSelection,
}))
vi.mock('../../src/lib/imageFiles.js', () => ({
  ensureUploadsDir: mocks.ensureUploadsDir,
  deleteUploadFilesForImageUrl: mocks.deleteUploadFilesForImageUrl,
  resolveUploadFilePath: mocks.resolveUploadFilePath,
  ENTRY_RESPONSIVE_IMAGE_WIDTHS: [400, 800, 1600],
}))
vi.mock('../../src/middleware/upload.js', () => ({
  upload: { array: () => (_req: any, _res: any, next: any) => next() },
}))
vi.mock('../../src/middleware/auth.js', () => ({
  optionalAuth: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    const raw = req.header('x-test-user')
    if (raw) req.user = JSON.parse(raw)
    next()
  },
}))
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    rotate: () => ({
      metadata: async () => ({ width: 500, height: 500 }),
      clone: () => ({
        resize: () => ({ webp: () => ({ toFile: async () => undefined }) }),
      }),
    }),
  })),
}))

import { entryProposalsRouter } from '../../src/routes/entryProposals.js'
import { optionalAuth } from '../../src/middleware/auth.js'

const { getBaseUrl } = createTestServer(
  '/api/entry-proposals',
  entryProposalsRouter,
  [optionalAuth as express.RequestHandler],
)

function authHeader(role: 'USER' | 'ADMIN' = 'USER') {
  return { 'x-test-user': JSON.stringify({ userId: 'user-1', role }) }
}

beforeEach(() => {
  resetSharedMocks()
  mocks.recordAdminAudit.mockReset()
})

describe('GET /api/entry-proposals/my-contributions', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/entry-proposals/my-contributions`,
    )
    expect(res.status).toBe(401)
  })

  it('returns proposals and suggestions for authenticated user', async () => {
    prismaMocks.entryProposal.findMany.mockResolvedValue([
      { id: 'p1', photoCredit: 'Alice', images: [] },
    ])
    prismaMocks.suggestion.findMany.mockResolvedValue([
      { id: 's1', name: null, email: null, message: 'test' },
    ])

    const res = await fetch(
      `${getBaseUrl()}/api/entry-proposals/my-contributions`,
      {
        headers: authHeader(),
      },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.proposals).toHaveLength(1)
    expect(body.suggestions).toHaveLength(1)
  })
})

describe('GET /api/entry-proposals/user-counts', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await fetch(`${getBaseUrl()}/api/entry-proposals/user-counts`)
    expect(res.status).toBe(401)
  })

  it('returns counts and limits', async () => {
    prismaMocks.entryProposal.count.mockResolvedValue(3)
    prismaMocks.suggestion.count.mockResolvedValue(1)

    const res = await fetch(`${getBaseUrl()}/api/entry-proposals/user-counts`, {
      headers: authHeader(),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.proposalCount).toBe(3)
    expect(body.suggestionCount).toBe(1)
    expect(body.proposalLimit).toBe(20)
    expect(body.suggestionLimit).toBe(10)
    expect(body.canPropose).toBe(true)
    expect(body.canSuggest).toBe(true)
  })

  it('sets canPropose to false when at limit', async () => {
    prismaMocks.entryProposal.count.mockResolvedValue(20)
    prismaMocks.suggestion.count.mockResolvedValue(0)

    const res = await fetch(`${getBaseUrl()}/api/entry-proposals/user-counts`, {
      headers: authHeader(),
    })

    const body = await res.json()
    expect(body.canPropose).toBe(false)
  })
})
