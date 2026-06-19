import { AppError } from './errors.js'
import { logger } from './logger.js'
import { getRedis } from './redis.js'

function normalizeIp(ip: string) {
  return ip.replace(/^::ffff:/, '').trim()
}

export async function enforceIpRateLimit(
  namespace: string,
  ipInput: string | null | undefined,
  windowMs: number,
  maxAttempts: number,
  message: string,
) {
  if (!ipInput) {
    logger.warn(
      { namespace },
      'enforceIpRateLimit: IP manquante, requête bloquée par précaution',
    )
    throw new AppError(429, message)
  }

  const redis = getRedis()
  const ip = normalizeIp(ipInput)
  const key = `${namespace}:${ip}`
  const ttl = Math.ceil(windowMs / 1000)

  // Atomic: SET NX initialises with TTL, INCR counts within the window.
  // Two separate INCR+EXPIRE calls would leave a permanent key if the process
  // crashes between them, blocking the IP forever.
  const pipeline = redis.pipeline()
  pipeline.set(key, 0, 'EX', ttl, 'NX')
  pipeline.incr(key)
  const results = await pipeline.exec()
  const attempts = (results?.[1]?.[1] as number | null) ?? 1

  if (attempts > maxAttempts) {
    throw new AppError(429, message)
  }
}

export async function resetIpRateLimit(
  namespace: string,
  ipInput: string | null | undefined,
) {
  if (!ipInput) {
    return
  }

  const redis = getRedis()
  const ip = normalizeIp(ipInput)
  await redis.del(`${namespace}:${ip}`)
}
