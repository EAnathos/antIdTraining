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

  it('creates suggestion and returns 201 with encrypted fields', async () => {
    const created = {
      id: 's1',
      userId: 'user-1',
      name: 'enc:Alice',
      email: 'enc:alice@example.com',
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
        name: 'Alice',
        email: 'alice@example.com',
        message: 'Une suggestion valide de test',
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('Alice')
    expect(body.email).toBe('alice@example.com')
    expect(prismaMocks.suggestion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'enc:Alice',
          email: 'enc:alice@example.com',
        }),
      }),
    )
  })

  it('creates suggestion without name/email', async () => {
    const created = {
      id: 's2',
      userId: 'user-1',
      name: null,
      email: null,
      message: 'Message anonyme valide pour le test',
      createdAt: new Date().toISOString(),
    }
    prismaMocks.suggestion = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue(created),
    } as any

    const res = await fetch(`${baseUrl}/api/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ message: 'Message anonyme valide pour le test' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBeNull()
    expect(body.email).toBeNull()
  })
})
