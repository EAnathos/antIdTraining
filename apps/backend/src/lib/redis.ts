// @ts-ignore - ioredis has some TypeScript export issues
import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
let redis: any = null

export function getRedis() {
  if (!redis) {
    // @ts-ignore
    redis = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      maxRetriesPerRequest: null,
    })

    redis.on('error', (err: Error) => {
      console.error('Redis connection error:', err)
    })

    redis.on('connect', () => {
      console.log('Connected to Redis')
    })
  }

  return redis
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
