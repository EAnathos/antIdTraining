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
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret'

const mocks = vi.hoisted(() => ({
  encryptSensitiveText: vi.fn((v: string) => `enc:${v}`),
  decryptSensitiveText: vi.fn((v: string) => v.replace(/^enc:/, '')),
}))

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/lib/encryption.js', () => ({
  encryptSensitiveText: mocks.encryptSensitiveText,
  decryptSensitiveText: mocks.decryptSensitiveText,
}))

import { suggestionsRouter } from '../../src/routes/suggestions.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

function authHeader(role: 'USER' | 'ADMIN' = 'USER') {
  const token = jwt.sign({ userId: 'user-1', role }, JWT_SECRET)
  return { Authorization: `Bearer ${token}` }
}

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/suggestions', suggestionsRouter)
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
    server.close((err) => (err ? reject(err) : resolve()))
  })
})

beforeEach(() => {
  resetSharedMocks()
  mocks.encryptSensitiveText.mockImplementation((v: string) => `enc:${v}`)
  mocks.decryptSensitiveText.mockImplementation((v: string) =>
    v.replace(/^enc:/, ''),
  )
})

describe('POST /api/suggestions', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await fetch(`${baseUrl}/api/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Une suggestion valide de test' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when body is invalid (message too short)', async () => {
    prismaMocks.suggestion = { count: vi.fn().mockResolvedValue(0) } as any

    const res = await fetch(`${baseUrl}/api/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ message: 'court' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when suggestion limit reached', async () => {
    prismaMocks.suggestion = { count: vi.fn().mockResolvedValue(10) } as any

    const res = await fetch(`${baseUrl}/api/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ message: 'Une suggestion valide de test' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toMatch(/Limite/)
  })

  it('creates suggestion with title and returns 201', async () => {
    const created = {
      id: 's1',
      userId: 'user-1',
      title: 'Mon titre',
      message: 'Une suggestion valide de test',
      createdAt: new Date().toISOString(),
    }
    prismaMocks.suggestion = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue(created),
    } as any

    const res = await fetch(`${baseUrl}/api/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        title: 'Mon titre',
        message: 'Une suggestion valide de test',
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.title).toBe('Mon titre')
    expect(prismaMocks.suggestion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Mon titre',
        }),
      }),
    )
  })

  it('creates suggestion without title', async () => {
    const created = {
      id: 's2',
      userId: 'user-1',
      title: null,
      message: 'Message valide pour le test',
      createdAt: new Date().toISOString(),
    }
    prismaMocks.suggestion = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue(created),
    } as any

    const res = await fetch(`${baseUrl}/api/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ message: 'Message valide pour le test' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.title).toBeNull()
  })
})

describe('PATCH /api/suggestions/:id', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await fetch(`${baseUrl}/api/suggestions/s1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Message modifié valide pour le test' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when message is too short', async () => {
    const res = await fetch(`${baseUrl}/api/suggestions/s1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ message: 'court' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 when suggestion not found', async () => {
    prismaMocks.suggestion = {
      findUnique: vi.fn().mockResolvedValue(null),
    } as any

    const res = await fetch(`${baseUrl}/api/suggestions/missing`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ message: 'Message modifié valide pour le test' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 403 when suggestion belongs to another user', async () => {
    prismaMocks.suggestion = {
      findUnique: vi.fn().mockResolvedValue({
        id: 's1',
        userId: 'other-user',
        status: 'PENDING',
      }),
    } as any

    const res = await fetch(`${baseUrl}/api/suggestions/s1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ message: 'Message modifié valide pour le test' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 when suggestion is not PENDING', async () => {
    prismaMocks.suggestion = {
      findUnique: vi.fn().mockResolvedValue({
        id: 's1',
        userId: 'user-1',
        status: 'PROCESSED',
      }),
    } as any

    const res = await fetch(`${baseUrl}/api/suggestions/s1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ message: 'Message modifié valide pour le test' }),
    })
    expect(res.status).toBe(400)
  })

  it('updates and returns the suggestion when valid', async () => {
    const updated = {
      id: 's1',
      userId: 'user-1',
      name: null,
      email: null,
      message: 'Message modifié valide pour le test',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    }
    prismaMocks.suggestion = {
      findUnique: vi.fn().mockResolvedValue({
        id: 's1',
        userId: 'user-1',
        status: 'PENDING',
      }),
      update: vi.fn().mockResolvedValue(updated),
    } as any

    const res = await fetch(`${baseUrl}/api/suggestions/s1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ message: 'Message modifié valide pour le test' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Message modifié valide pour le test')
    expect(prismaMocks.suggestion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { message: 'Message modifié valide pour le test' },
      }),
    )
  })
})
