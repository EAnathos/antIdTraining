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
  getDatabaseSnapshot: vi.fn(),
  importDatabaseSnapshot: vi.fn(),
  createDatabaseBundleArchive: vi.fn(),
  importDatabaseBundleArchive: vi.fn(),
  cleanupUploadFiles: vi.fn(),
  databaseSnapshotSchema: {
    safeParse: vi.fn(),
  },
  recordAdminAudit: vi.fn(),
}))

vi.mock('../../src/services/database.js', () => ({
  getDatabaseSnapshot: mocks.getDatabaseSnapshot,
  importDatabaseSnapshot: mocks.importDatabaseSnapshot,
  createDatabaseBundleArchive: mocks.createDatabaseBundleArchive,
  importDatabaseBundleArchive: mocks.importDatabaseBundleArchive,
  cleanupUploadFiles: mocks.cleanupUploadFiles,
  databaseSnapshotSchema: mocks.databaseSnapshotSchema,
}))
vi.mock('../../src/lib/adminAudit.js', () => ({
  recordAdminAudit: mocks.recordAdminAudit,
}))

import { databaseRouter } from '../../src/routes/database.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/admin/database', databaseRouter)
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
  mocks.getDatabaseSnapshot.mockReset()
  mocks.importDatabaseSnapshot.mockReset()
  mocks.createDatabaseBundleArchive.mockReset()
  mocks.importDatabaseBundleArchive.mockReset()
  mocks.cleanupUploadFiles.mockReset()
  mocks.recordAdminAudit.mockReset()
  mocks.databaseSnapshotSchema.safeParse.mockReset()
})

describe('GET /api/admin/database/export', () => {
  it('returns the database snapshot as JSON', async () => {
    const snapshot = { taxons: [], users: [] }
    mocks.getDatabaseSnapshot.mockResolvedValue(snapshot)

    const res = await fetch(`${baseUrl}/api/admin/database/export`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(snapshot)
  })
})

describe('POST /api/admin/database/import', () => {
  it('returns 400 when body is invalid', async () => {
    mocks.databaseSnapshotSchema.safeParse.mockReturnValue({
      success: false,
      error: { errors: [{ message: 'invalid' }] },
    })

    const res = await fetch(`${baseUrl}/api/admin/database/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bad: true }),
    })
    expect(res.status).toBe(400)
  })

  it('imports snapshot and returns result', async () => {
    const importResult = { taxonsCreated: 5, usersCreated: 2 }
    mocks.databaseSnapshotSchema.safeParse.mockReturnValue({
      success: true,
      data: { taxons: [], users: [] },
    })
    mocks.importDatabaseSnapshot.mockResolvedValue(importResult)
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/database/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxons: [], users: [] }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(importResult)
    expect(mocks.recordAdminAudit).toHaveBeenCalled()
  })
})

describe('GET /api/admin/database/export/bundle', () => {
  it('returns a ZIP buffer with correct headers', async () => {
    const fakeBuffer = Buffer.from('PK')
    mocks.createDatabaseBundleArchive.mockResolvedValue(fakeBuffer)
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/database/export/bundle`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/zip')
    expect(res.headers.get('content-disposition')).toContain('attachment')
    expect(mocks.recordAdminAudit).toHaveBeenCalled()
  })
})

describe('POST /api/admin/database/cleanup/uploads', () => {
  it('returns cleanup result and calls audit', async () => {
    mocks.cleanupUploadFiles.mockResolvedValue({
      deletedFiles: 3,
      generatedVariants: 9,
    })
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${baseUrl}/api/admin/database/cleanup/uploads`, {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deletedFiles).toBe(3)
    expect(body.generatedVariants).toBe(9)
    expect(mocks.recordAdminAudit).toHaveBeenCalled()
  })
})
