import { afterEach, describe, expect, it, vi } from 'vitest'

const redisMock = {
  on: vi.fn(),
  quit: vi.fn().mockResolvedValue('OK'),
}

vi.mock('ioredis', () => ({
  default: class MockRedis {
    on = redisMock.on
    quit = redisMock.quit
  },
}))

import { getRedis, closeRedis } from '../../src/lib/redis.js'

afterEach(async () => {
  await closeRedis()
})

describe('getRedis', () => {
  it('returns an object with on and quit methods', () => {
    const client = getRedis()
    expect(typeof client.on).toBe('function')
    expect(typeof client.quit).toBe('function')
  })

  it('returns the same singleton on repeated calls', () => {
    const c1 = getRedis()
    const c2 = getRedis()
    expect(c1).toBe(c2)
  })
})

describe('closeRedis', () => {
  it('calls quit and resets the singleton', async () => {
    getRedis()
    await closeRedis()
    expect(redisMock.quit).toHaveBeenCalled()
  })

  it('does nothing when called without an active connection', async () => {
    await expect(closeRedis()).resolves.toBeUndefined()
  })
})
