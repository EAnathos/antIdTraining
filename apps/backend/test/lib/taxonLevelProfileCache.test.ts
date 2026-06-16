import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))

import {
  getTaxonLevelProfile,
  getTaxonLevelProfileCache,
  invalidateTaxonLevelProfileCache,
  resolveTaxonWorkerSize,
} from '../../src/lib/taxonLevelProfileCache.js'

beforeEach(() => {
  resetSharedMocks()
  invalidateTaxonLevelProfileCache()
})

const sampleProfiles = [
  {
    level: 'SPECIES',
    value: 'rufa',
    genusValue: 'Formica',
    description: null,
    sizeWorker: '4-9 mm',
    sizeQueen: '9-14 mm',
    sizeMale: '8-10 mm',
    criteria: [{ label: 'Rouge' }],
  },
  {
    level: 'GENUS',
    value: 'Formica',
    genusValue: null,
    description: null,
    sizeWorker: '3-9 mm',
    sizeQueen: null,
    sizeMale: null,
    criteria: [],
  },
]

describe('getTaxonLevelProfileCache', () => {
  it('builds a Map keyed by level:value:genus', async () => {
    prismaMocks.taxonLevelProfile.findMany.mockResolvedValue(sampleProfiles)

    const profiles = await getTaxonLevelProfileCache()

    expect(profiles.size).toBe(2)
    expect(profiles.get('SPECIES:rufa:Formica')?.sizeWorker).toBe('4-9 mm')
    expect(profiles.get('GENUS:Formica:')?.sizeWorker).toBe('3-9 mm')
  })

  it('caches results on second call', async () => {
    prismaMocks.taxonLevelProfile.findMany.mockResolvedValue(sampleProfiles)

    await getTaxonLevelProfileCache()
    await getTaxonLevelProfileCache()

    expect(prismaMocks.taxonLevelProfile.findMany).toHaveBeenCalledTimes(1)
  })

  it('refetches after invalidation', async () => {
    prismaMocks.taxonLevelProfile.findMany.mockResolvedValue(sampleProfiles)

    await getTaxonLevelProfileCache()
    invalidateTaxonLevelProfileCache()
    await getTaxonLevelProfileCache()

    expect(prismaMocks.taxonLevelProfile.findMany).toHaveBeenCalledTimes(2)
  })
})

describe('getTaxonLevelProfile', () => {
  it('returns profile by level/value/genus', async () => {
    prismaMocks.taxonLevelProfile.findMany.mockResolvedValue(sampleProfiles)

    const profile = await getTaxonLevelProfile('SPECIES', 'rufa', 'Formica')

    expect(profile?.sizeWorker).toBe('4-9 mm')
    expect(profile?.criteria).toEqual(['Rouge'])
  })

  it('returns null for unknown profile', async () => {
    prismaMocks.taxonLevelProfile.findMany.mockResolvedValue(sampleProfiles)

    const profile = await getTaxonLevelProfile('SPECIES', 'unknown', null)

    expect(profile).toBeNull()
  })
})

describe('resolveTaxonWorkerSize', () => {
  it('returns species worker size when species+genus match', async () => {
    prismaMocks.taxonLevelProfile.findMany.mockResolvedValue(sampleProfiles)

    const size = await resolveTaxonWorkerSize({
      species: 'rufa',
      genus: 'Formica',
      subfamily: 'Formicinae',
    })

    expect(size).toBe('4-9 mm')
  })

  it('falls back to genus size when species profile missing', async () => {
    prismaMocks.taxonLevelProfile.findMany.mockResolvedValue([
      sampleProfiles[1],
    ])

    const size = await resolveTaxonWorkerSize({
      species: 'unknown',
      genus: 'Formica',
      subfamily: 'Formicinae',
    })

    expect(size).toBe('3-9 mm')
  })

  it('returns null when no matching profile at any level', async () => {
    prismaMocks.taxonLevelProfile.findMany.mockResolvedValue([])

    const size = await resolveTaxonWorkerSize({
      subfamily: 'Unknowninae',
    })

    expect(size).toBeNull()
  })
})
