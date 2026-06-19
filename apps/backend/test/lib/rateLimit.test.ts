import { beforeEach, describe, expect, it, vi } from 'vitest'

function makePipelineMock(incrResult: number) {
  const pipeline = {
    set: vi.fn().mockReturnThis(),
    incr: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([
      [null, 'OK'],
      [null, incrResult],
    ]),
  }
  return pipeline
}

const redisMock = {
  pipeline: vi.fn(),
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
  redisMock.pipeline.mockReset()
  redisMock.del.mockReset()
})

describe('enforceIpRateLimit', () => {
  it('throws 429 when IP is missing', async () => {
    await expect(
      enforceIpRateLimit('ns', null, 60000, 5, 'Trop de tentatives'),
    ).rejects.toMatchObject({ status: 429 })
    expect(redisMock.pipeline).not.toHaveBeenCalled()
  })

  it('allows request within limit', async () => {
    const pipeline = makePipelineMock(1)
    redisMock.pipeline.mockReturnValue(pipeline)

    await expect(
      enforceIpRateLimit('ns', '1.2.3.4', 60000, 5, 'Trop'),
    ).resolves.toBeUndefined()

    expect(pipeline.set).toHaveBeenCalledWith('ns:1.2.3.4', 0, 'EX', 60, 'NX')
    expect(pipeline.incr).toHaveBeenCalledWith('ns:1.2.3.4')
    expect(pipeline.exec).toHaveBeenCalled()
  })

  it('allows request when count is within limit (count > 1)', async () => {
    const pipeline = makePipelineMock(3)
    redisMock.pipeline.mockReturnValue(pipeline)

    await expect(
      enforceIpRateLimit('ns', '1.2.3.4', 60000, 5, 'Trop'),
    ).resolves.toBeUndefined()
  })

  it('throws 429 when limit exceeded', async () => {
    const pipeline = makePipelineMock(6)
    redisMock.pipeline.mockReturnValue(pipeline)

    await expect(
      enforceIpRateLimit('ns', '1.2.3.4', 60000, 5, 'Trop de tentatives'),
    ).rejects.toMatchObject({ status: 429, message: 'Trop de tentatives' })
  })

  it('normalizes IPv4-mapped IPv6 address', async () => {
    const pipeline = makePipelineMock(1)
    redisMock.pipeline.mockReturnValue(pipeline)

    await enforceIpRateLimit('ns', '::ffff:1.2.3.4', 60000, 5, 'Trop')

    expect(pipeline.set).toHaveBeenCalledWith('ns:1.2.3.4', 0, 'EX', 60, 'NX')
    expect(pipeline.incr).toHaveBeenCalledWith('ns:1.2.3.4')
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
