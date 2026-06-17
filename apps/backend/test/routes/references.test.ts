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
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret'

const mocks = vi.hoisted(() => ({
  listReferences: vi.fn(),
  createReference: vi.fn(),
  updateReference: vi.fn(),
  deleteReference: vi.fn(),
  recordAdminAudit: vi.fn(),
}))

vi.mock('../../src/services/references.js', () => ({
  listReferences: mocks.listReferences,
  createReference: mocks.createReference,
  updateReference: mocks.updateReference,
  deleteReference: mocks.deleteReference,
  referenceSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
}))
vi.mock('../../src/lib/adminAudit.js', () => ({
  recordAdminAudit: mocks.recordAdminAudit,
}))

import {
  publicReferencesRouter,
  adminReferencesRouter,
} from '../../src/routes/references.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

function adminHeader() {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET)
  return { Authorization: `Bearer ${token}` }
}

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/references', publicReferencesRouter)
  app.use('/api/admin/references', adminReferencesRouter)
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
  vi.clearAllMocks()
})

const baseRef = {
  id: 'r1',
  title: 'Ref',
  authors: [],
  type: 'WEBSITE',
  taxons: [],
}

describe('GET /api/references', () => {
  it('returns list of references', async () => {
    mocks.listReferences.mockResolvedValue([baseRef])

    const res = await fetch(`${baseUrl}/api/references`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })
})

describe('POST /api/admin/references', () => {
  it('creates a reference and returns 201', async () => {
    mocks.createReference.mockResolvedValue(baseRef)
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/references`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeader() },
      body: JSON.stringify({ title: 'Ref', type: 'WEBSITE' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('r1')
  })
})

describe('PUT /api/admin/references/:id', () => {
  it('updates a reference', async () => {
    mocks.updateReference.mockResolvedValue(baseRef)
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/references/r1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...adminHeader() },
      body: JSON.stringify({ title: 'Updated', type: 'WEBSITE' }),
    })

    expect(res.status).toBe(200)
    expect(mocks.updateReference).toHaveBeenCalledWith('r1', expect.anything())
  })
})

describe('DELETE /api/admin/references/:id', () => {
  it('deletes a reference and returns 204', async () => {
    mocks.deleteReference.mockResolvedValue(baseRef)
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/references/r1`, {
      method: 'DELETE',
      headers: adminHeader(),
    })

    expect(res.status).toBe(204)
    expect(mocks.deleteReference).toHaveBeenCalledWith('r1')
  })
})
