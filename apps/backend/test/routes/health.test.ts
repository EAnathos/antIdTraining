import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildServiceHealthReport: vi.fn(),
  getRedis: vi.fn(() => ({})),
}))

vi.mock('../../src/lib/monitoring.js', () => ({
  buildServiceHealthReport: mocks.buildServiceHealthReport,
}))
vi.mock('../../src/lib/redis.js', () => ({
  getRedis: mocks.getRedis,
}))
vi.mock('../../src/prisma.js', () => ({
  prisma: {},
}))

import { healthRouter } from '../../src/routes/health.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/health', healthRouter)
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

describe('GET /health', () => {
  it('returns ok: true', async () => {
    const res = await fetch(`${baseUrl}/health`)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.service).toBe('ant-id-training-backend')
  })
})

describe('GET /health/ready', () => {
  it('returns 200 when services are healthy', async () => {
    mocks.buildServiceHealthReport.mockResolvedValue({
      ok: true,
      database: 'ok',
      redis: 'ok',
    })

    const res = await fetch(`${baseUrl}/health/ready`)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('returns 503 when a service is unhealthy', async () => {
    mocks.buildServiceHealthReport.mockResolvedValue({
      ok: false,
      database: 'error',
      redis: 'ok',
    })

    const res = await fetch(`${baseUrl}/health/ready`)
    const body = await res.json()
    expect(res.status).toBe(503)
    expect(body.ok).toBe(false)
  })
})
