import { describe, expect, it, vi } from 'vitest'
import { createTestServer } from '../utils/testServer.js'

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

const { getBaseUrl } = createTestServer('/health', healthRouter)

describe('GET /health', () => {
  it('returns ok: true', async () => {
    const res = await fetch(`${getBaseUrl()}/health`)
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

    const res = await fetch(`${getBaseUrl()}/health/ready`)
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

    const res = await fetch(`${getBaseUrl()}/health/ready`)
    const body = await res.json()
    expect(res.status).toBe(503)
    expect(body.ok).toBe(false)
  })
})
