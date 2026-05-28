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
import { prismaMocks } from '../utils/sharedMocks'

const mocks = vi.hoisted(() => ({
  decryptSensitiveText: vi.fn((value: string) => value),
  encryptSensitiveText: vi.fn((value: string) => `enc:${value}`),
  resolveEntryTaxonSelection: vi.fn(),
  recordAdminAudit: vi.fn(),
  invalidateGameEntryCacheSafely: vi.fn(),
  deleteUploadFilesForImageUrl: vi.fn(),
  resolveUploadFilePath: vi.fn((fileName: string) => `/tmp/${fileName}`),
}))

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/lib/encryption.js', () => ({
  decryptSensitiveText: mocks.decryptSensitiveText,
  encryptSensitiveText: mocks.encryptSensitiveText,
}))
vi.mock('../../src/services/entries.js', () => ({
  resolveEntryTaxonSelection: mocks.resolveEntryTaxonSelection,
}))
vi.mock('../../src/lib/adminAudit.js', () => ({
  recordAdminAudit: mocks.recordAdminAudit,
}))
vi.mock('../../src/lib/gameEntryCache.js', () => ({
  invalidateGameEntryCacheSafely: mocks.invalidateGameEntryCacheSafely,
}))
vi.mock('../../src/lib/imageFiles.js', () => ({
  ensureUploadsDir: vi.fn(),
  deleteUploadFilesForImageUrl: mocks.deleteUploadFilesForImageUrl,
  resolveUploadFilePath: mocks.resolveUploadFilePath,
}))
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    rotate: () => ({
      metadata: async () => ({ width: 200, height: 200 }),
      clone: () => ({
        resize: () => ({
          webp: () => ({ toFile: async () => undefined }),
        }),
      }),
    }),
  })),
}))

import { errorHandler } from '../../src/middleware/error.js'
import { entriesRouter } from '../../src/routes/entries.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/entries', entriesRouter)
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

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
})

beforeEach(() => {
  vi.clearAllMocks()
})

async function get(path: string) {
  const response = await fetch(`${baseUrl}${path}`)
  const text = await response.text()
  return { response, json: text ? JSON.parse(text) : null }
}

async function post(path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  return { response, json: text ? JSON.parse(text) : null }
}

describe('entriesRouter', () => {
  it('lists entries with pagination and decrypted photo credit', async () => {
    ;(prismaMocks as any).observationEntry.findMany.mockResolvedValue([
      {
        id: 'entry_1',
        photoCredit: 'enc:alice',
        images: [],
      },
    ])
    ;(prismaMocks as any).observationEntry.count.mockResolvedValue(1)

    const { response, json } = await get('/api/entries?page=2&limit=20')

    expect(response.status).toBe(200)
    expect(json.pagination).toMatchObject({
      page: 2,
      limit: 20,
      total: 1,
      pages: 1,
    })
    expect(json.items[0].photoCredit).toBe('enc:alice')
    expect(prismaMocks.observationEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    )
  })

  it('returns 400 for invalid create payload', async () => {
    const { response, json } = await post('/api/entries', { invalid: true })

    expect(response.status).toBe(400)
    expect(json.message).toBe('Requête invalide.')
    expect(mocks.resolveEntryTaxonSelection as any).not.toHaveBeenCalled()
  })

  it('creates an entry and records audit log', async () => {
    ;(mocks.resolveEntryTaxonSelection as any).mockResolvedValue({
      subfamily: 'Formicinae',
      genus: 'Formica',
      species: 'rufibarbis',
    })
    ;(prismaMocks as any).observationEntry.create.mockResolvedValue({
      id: 'entry_1',
      subfamily: 'Formicinae',
      genus: 'Formica',
      species: 'rufibarbis',
      department: '75',
      photoCredit: 'enc:alice',
      images: [],
    })

    const { response, json } = await post('/api/entries', {
      taxonLevel: 'SPECIES',
      taxonValue: 'rufibarbis',
      taxonGenus: 'Formica',
      subgenus: null,
      speciesGroup: null,
      department: '75',
      observedAt: '2026-05-01T00:00:00.000Z',
      biotope: 'Forêt',
      photoCredit: 'alice',
      size: '4-6 mm',
      caste: 'WORKER',
    })

    expect(response.status).toBe(201)
    expect(json.subfamily).toBe('Formicinae')
    expect(mocks.resolveEntryTaxonSelection).toHaveBeenCalledTimes(1)
    expect(prismaMocks.observationEntry.create).toHaveBeenCalledTimes(1)
    expect(mocks.recordAdminAudit).toHaveBeenCalledTimes(1)
    expect(mocks.invalidateGameEntryCacheSafely).toHaveBeenCalledTimes(1)
  })

  it('returns 400 when entry taxon cannot be resolved', async () => {
    ;(mocks.resolveEntryTaxonSelection as any).mockResolvedValue(null)

    const { response, json } = await post('/api/entries', {
      taxonLevel: 'SPECIES',
      taxonValue: 'rufibarbis',
      department: '75',
      observedAt: '2026-05-01T00:00:00.000Z',
      biotope: 'Forêt',
      photoCredit: 'alice',
      caste: 'WORKER',
    })

    expect(response.status).toBe(400)
    expect(json.message).toBe('Taxon introuvable pour ce niveau.')
  })

  it('updates an entry and invalidates cache', async () => {
    ;(mocks.resolveEntryTaxonSelection as any).mockResolvedValue({
      subfamily: 'Myrmicinae',
      genus: 'Myrmica',
      species: 'rubra',
    })
    ;(prismaMocks as any).observationEntry.update.mockResolvedValue({
      id: 'entry_2',
      subfamily: 'Myrmicinae',
      genus: 'Myrmica',
      species: 'rubra',
      department: '33',
      photoCredit: 'enc:bob',
      images: [],
    })

    const response = await fetch(`${baseUrl}/api/entries/entry_2`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taxonLevel: 'SPECIES',
        taxonValue: 'rubra',
        taxonGenus: 'Myrmica',
        subgenus: null,
        speciesGroup: null,
        department: '33',
        observedAt: '2026-05-02T00:00:00.000Z',
        biotope: 'Prairie',
        photoCredit: 'bob',
        size: '5-7 mm',
        caste: 'WORKER',
      }),
    })

    expect(response.status).toBe(200)
    expect(prismaMocks.observationEntry.update).toHaveBeenCalledTimes(1)
    expect(mocks.recordAdminAudit).toHaveBeenCalledTimes(1)
    expect(mocks.invalidateGameEntryCacheSafely).toHaveBeenCalledTimes(1)
  })

  it('reorders entry images', async () => {
    ;(prismaMocks as any).entryImage.findMany
      .mockResolvedValueOnce([
        { id: 'img_1', entryId: 'entry_1', position: 0, createdAt: new Date() },
        { id: 'img_2', entryId: 'entry_1', position: 1, createdAt: new Date() },
      ])
      .mockResolvedValueOnce([
        { id: 'img_2', entryId: 'entry_1', position: 0, createdAt: new Date() },
        { id: 'img_1', entryId: 'entry_1', position: 1, createdAt: new Date() },
      ])
    ;(prismaMocks as any).$transaction.mockResolvedValue(undefined)

    const response = await fetch(
      `${baseUrl}/api/entries/entry_1/images/order`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: ['img_2', 'img_1'] }),
      },
    )

    const json = await response.json()
    expect(response.status).toBe(200)
    expect(Array.isArray(json)).toBe(true)
    expect(prismaMocks.$transaction).toHaveBeenCalledTimes(1)
    expect(mocks.recordAdminAudit).toHaveBeenCalledTimes(1)
    expect(mocks.invalidateGameEntryCacheSafely).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when deleting missing entry', async () => {
    ;(prismaMocks as any).observationEntry.findUnique.mockResolvedValue(null)

    const response = await fetch(`${baseUrl}/api/entries/missing`, {
      method: 'DELETE',
    })

    const json = await response.json()
    expect(response.status).toBe(404)
    expect(json.message).toBe('Entrée introuvable.')
  })

  it('deletes an entry and removes uploaded files', async () => {
    ;(prismaMocks as any).observationEntry.findUnique.mockResolvedValue({
      images: [{ imageUrl: '/uploads/entry_1.webp' }],
    })
    ;(prismaMocks as any).observationEntry.delete.mockResolvedValue({
      id: 'entry_1',
    })

    const response = await fetch(`${baseUrl}/api/entries/entry_1`, {
      method: 'DELETE',
    })

    expect(response.status).toBe(204)
    expect(prismaMocks.observationEntry.delete).toHaveBeenCalledTimes(1)
    expect(mocks.deleteUploadFilesForImageUrl).toHaveBeenCalledWith(
      '/uploads/entry_1.webp',
    )
    expect(mocks.recordAdminAudit).toHaveBeenCalledTimes(1)
    expect(mocks.invalidateGameEntryCacheSafely).toHaveBeenCalledTimes(1)
  })
})
