import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisMock = {
  incr: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
}

vi.mock('../../src/lib/redis.js', () => ({
  getRedis: () => redisMock,
}))
vi.mock('../../src/lib/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}))

import {
  enforceIpRateLimit,
  resetIpRateLimit,
} from '../../src/lib/rateLimit.js'

beforeEach(() => {
  redisMock.incr.mockReset()
  redisMock.expire.mockReset()
  redisMock.del.mockReset()
})

describe('enforceIpRateLimit', () => {
  it('throws 429 when IP is missing', async () => {
    await expect(
      enforceIpRateLimit('ns', null, 60000, 5, 'Trop de tentatives'),
    ).rejects.toMatchObject({ status: 429 })
    expect(redisMock.incr).not.toHaveBeenCalled()
  })

  it('allows request within limit', async () => {
    redisMock.incr.mockResolvedValue(1)
    redisMock.expire.mockResolvedValue(1)

    await expect(
      enforceIpRateLimit('ns', '1.2.3.4', 60000, 5, 'Trop'),
    ).resolves.toBeUndefined()

    expect(redisMock.incr).toHaveBeenCalledWith('ns:1.2.3.4')
    expect(redisMock.expire).toHaveBeenCalledWith('ns:1.2.3.4', 60)
  })

  it('does not set expiry when key already exists (count > 1)', async () => {
    redisMock.incr.mockResolvedValue(3)

    await enforceIpRateLimit('ns', '1.2.3.4', 60000, 5, 'Trop')

    expect(redisMock.expire).not.toHaveBeenCalled()
  })

  it('throws 429 when limit exceeded', async () => {
    redisMock.incr.mockResolvedValue(6)

    await expect(
      enforceIpRateLimit('ns', '1.2.3.4', 60000, 5, 'Trop de tentatives'),
    ).rejects.toMatchObject({ status: 429, message: 'Trop de tentatives' })
  })

  it('normalizes IPv4-mapped IPv6 address', async () => {
    redisMock.incr.mockResolvedValue(1)
    redisMock.expire.mockResolvedValue(1)

    await enforceIpRateLimit('ns', '::ffff:1.2.3.4', 60000, 5, 'Trop')

    expect(redisMock.incr).toHaveBeenCalledWith('ns:1.2.3.4')
  })
})

describe('resetIpRateLimit', () => {
  it('does nothing when IP is missing', async () => {
    await resetIpRateLimit('ns', null)
    expect(redisMock.del).not.toHaveBeenCalled()
  })

  it('deletes the rate limit key', async () => {
    redisMock.del.mockResolvedValue(1)
    await resetIpRateLimit('ns', '1.2.3.4')
    expect(redisMock.del).toHaveBeenCalledWith('ns:1.2.3.4')
  })
})
