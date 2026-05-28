import type { PrismaClient } from '@prisma/client'

type DependencyStatus = {
  ok: boolean
  latencyMs: number | null
  message?: string
}

export type ServiceHealthReport = {
  ok: boolean
  timestamp: string
  uptimeSeconds: number
  checks: {
    database: DependencyStatus
    redis: DependencyStatus
  }
  requests: RequestMetrics
}

export type RequestMetrics = {
  total: number
  successful: number
  clientErrors: number
  serverErrors: number
  lastRequestAt: string | null
  lastErrorAt: string | null
}

const processStartedAt = Date.now()

const requestMetrics: RequestMetrics = {
  total: 0,
  successful: 0,
  clientErrors: 0,
  serverErrors: 0,
  lastRequestAt: null,
  lastErrorAt: null,
}

function buildDependencyStatus(
  error: unknown,
  latencyMs: number,
): DependencyStatus {
  return {
    ok: false,
    latencyMs,
    message: error instanceof Error ? error.message : 'Service unavailable',
  }
}

export function recordHttpRequest(statusCode: number) {
  requestMetrics.total += 1
  requestMetrics.lastRequestAt = new Date().toISOString()

  if (statusCode >= 500) {
    requestMetrics.serverErrors += 1
    requestMetrics.lastErrorAt = requestMetrics.lastRequestAt
    return
  }

  if (statusCode >= 400) {
    requestMetrics.clientErrors += 1
    return
  }

  requestMetrics.successful += 1
}

export function getRequestMetrics(): RequestMetrics {
  return { ...requestMetrics }
}

export function resetRequestMetrics() {
  requestMetrics.total = 0
  requestMetrics.successful = 0
  requestMetrics.clientErrors = 0
  requestMetrics.serverErrors = 0
  requestMetrics.lastRequestAt = null
  requestMetrics.lastErrorAt = null
}

export async function buildServiceHealthReport(dependencies: {
  database: Pick<PrismaClient, '$queryRaw'>
  redis: { ping(): Promise<string> }
}): Promise<ServiceHealthReport> {
  const startedAt = Date.now()
  const timestamp = new Date().toISOString()

  const [databaseResult, redisResult] = await Promise.allSettled([
    dependencies.database.$queryRaw`SELECT 1`,
    dependencies.redis.ping(),
  ])

  const databaseLatency = Date.now() - startedAt
  const redisLatency = Date.now() - startedAt

  const database =
    databaseResult.status === 'fulfilled'
      ? { ok: true, latencyMs: databaseLatency }
      : buildDependencyStatus(databaseResult.reason, databaseLatency)

  const redis =
    redisResult.status === 'fulfilled'
      ? { ok: true, latencyMs: redisLatency }
      : buildDependencyStatus(redisResult.reason, redisLatency)

  return {
    ok: database.ok && redis.ok,
    timestamp,
    uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
    checks: {
      database,
      redis,
    },
    requests: getRequestMetrics(),
  }
}
