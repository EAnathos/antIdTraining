import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/lib/encryption.js', () => ({
  decryptSensitiveText: vi.fn((v: string) => `dec:${v}`),
}))
vi.mock('../../src/lib/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}))

import {
  getGameEntriesCache,
  invalidateGameEntryCache,
  invalidateGameEntryCacheSafely,
} from '../../src/lib/gameEntryCache.js'

const sampleEntry = {
  id: 'e1',
  taxonLevel: 'SPECIES',
  subfamily: 'Formicinae',
  genus: 'Formica',
  species: 'rufa',
  size: '4-9 mm',
  department: '75',
  observedAt: new Date('2024-06-01'),
  biotope: 'Prairie',
  photoCredit: 'enc:Alice',
  images: [{ imageUrl: '/uploads/img.webp' }],
  taxon: { swarmingStartMonth: 5, swarmingEndMonth: 8 },
}

beforeEach(() => {
  resetSharedMocks()
  prismaMocks.observationEntry.findMany.mockReset()
  invalidateGameEntryCache()
})

describe('getGameEntriesCache', () => {
  it('fetches entries from DB and decrypts photoCredit', async () => {
    prismaMocks.observationEntry.findMany.mockResolvedValue([sampleEntry])

    const entries = await getGameEntriesCache()

    expect(entries).toHaveLength(1)
    expect(entries[0].photoCredit).toBe('dec:enc:Alice')
    expect(entries[0].swarmingStartMonth).toBe(5)
    expect(entries[0].swarmingEndMonth).toBe(8)
  })

  it('returns cached result on second call', async () => {
    prismaMocks.observationEntry.findMany.mockResolvedValue([sampleEntry])

    await getGameEntriesCache()
    await getGameEntriesCache()

    expect(prismaMocks.observationEntry.findMany).toHaveBeenCalledTimes(1)
  })

  it('refetches after cache invalidation', async () => {
    prismaMocks.observationEntry.findMany.mockResolvedValue([sampleEntry])

    await getGameEntriesCache()
    invalidateGameEntryCache()
    await getGameEntriesCache()

    expect(prismaMocks.observationEntry.findMany).toHaveBeenCalledTimes(2)
  })

  it('uses null for swarmingMonths when taxon is null', async () => {
    prismaMocks.observationEntry.findMany.mockResolvedValue([
      { ...sampleEntry, taxon: null },
    ])

    const entries = await getGameEntriesCache()

    expect(entries[0].swarmingStartMonth).toBeNull()
    expect(entries[0].swarmingEndMonth).toBeNull()
  })
})

describe('invalidateGameEntryCacheSafely', () => {
  it('does not throw when called', () => {
    expect(() => invalidateGameEntryCacheSafely('test reason')).not.toThrow()
  })
})
