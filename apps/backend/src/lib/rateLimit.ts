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

  const attempts = await redis.incr(key)
  if (attempts === 1) {
    await redis.expire(key, ttl)
  }

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
