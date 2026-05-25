import { describe, expect, it, vi, beforeEach } from 'vitest'

import { buildServiceHealthReport, getRequestMetrics, recordHttpRequest, resetRequestMetrics } from '../../src/lib/monitoring.js'

beforeEach(() => {
  resetRequestMetrics()
})

describe('monitoring helpers', () => {
  it('tracks request metrics', () => {
    recordHttpRequest(200)
    recordHttpRequest(404)
    recordHttpRequest(503)

    expect(getRequestMetrics()).toMatchObject({
      total: 3,
      successful: 1,
      clientErrors: 1,
      serverErrors: 1,
    })
  })

  it('builds a health report for healthy dependencies', async () => {
    vi.setSystemTime(new Date('2026-05-24T12:00:00.000Z'))

    const database = {
      $queryRaw: async () => [{ one: 1 }],
    } as unknown as Parameters<typeof buildServiceHealthReport>[0]['database']

    const report = await buildServiceHealthReport({
      database,
      redis: {
        ping: async () => 'PONG',
      },
    })

    expect(report.ok).toBe(true)
    expect(report.checks.database.ok).toBe(true)
    expect(report.checks.redis.ok).toBe(true)
    expect(report.requests.total).toBe(0)
  })
})
