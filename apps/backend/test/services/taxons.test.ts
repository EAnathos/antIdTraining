import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

const mocks = vi.hoisted(() => ({
  getTaxonCatalog: vi.fn(),
  invalidateTaxonCatalogCache: vi.fn(),
  invalidateTaxonLevelProfileCache: vi.fn(),
  invalidateGameEntryCacheSafely: vi.fn(),
  buildTaxonSizeMaps: vi.fn(),
}))

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/lib/taxonCatalog.js', () => ({
  getTaxonCatalog: mocks.getTaxonCatalog,
  invalidateTaxonCatalogCache: mocks.invalidateTaxonCatalogCache,
}))
vi.mock('../../src/lib/taxonLevelProfileCache.js', () => ({
  invalidateTaxonLevelProfileCache: mocks.invalidateTaxonLevelProfileCache,
}))
vi.mock('../../src/lib/gameEntryCache.js', () => ({
  invalidateGameEntryCacheSafely: mocks.invalidateGameEntryCacheSafely,
}))
vi.mock('../../src/lib/taxonSizes.js', () => ({
  buildTaxonSizeMaps: mocks.buildTaxonSizeMaps,
}))
;(prismaMocks as any).taxon = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}
;(prismaMocks as any).taxonLevelProfile = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}
;(prismaMocks as any).taxonConfusion = {
  deleteMany: vi.fn(),
  createMany: vi.fn(),
}

import {
  listSubfamilies,
  listGenera,
  listSpecies,
  listSubgenera,
  listSpeciesGroups,
  getSpeciesMetadata,
  deleteTaxon,
} from '../../src/services/taxons.js'

beforeEach(() => {
  resetSharedMocks()
  ;(prismaMocks as any).taxon.findMany.mockReset()
  ;(prismaMocks as any).taxon.findUnique.mockReset()
  ;(prismaMocks as any).taxon.findFirst.mockReset()
  ;(prismaMocks as any).taxon.create.mockReset()
  ;(prismaMocks as any).taxon.update.mockReset()
  ;(prismaMocks as any).taxon.delete.mockReset()
  ;(prismaMocks as any).taxonLevelProfile.findUnique.mockReset()
  ;(prismaMocks as any).taxonLevelProfile.findFirst.mockReset()
  ;(prismaMocks as any).taxonLevelProfile.create.mockReset()
  ;(prismaMocks as any).taxonLevelProfile.update.mockReset()
  ;(prismaMocks as any).taxonConfusion.deleteMany.mockReset()
  ;(prismaMocks as any).taxonConfusion.createMany.mockReset()
  mocks.getTaxonCatalog.mockReset()
  mocks.invalidateTaxonCatalogCache.mockReset()
  mocks.invalidateTaxonLevelProfileCache.mockReset()
  mocks.invalidateGameEntryCacheSafely.mockReset()
})

describe('listSubfamilies', () => {
  it('returns subfamilies from the taxon catalog', async () => {
    mocks.getTaxonCatalog.mockResolvedValue({
      subfamilies: ['Formicinae', 'Myrmicinae'],
    })

    const result = await listSubfamilies()
    expect(result).toEqual(['Formicinae', 'Myrmicinae'])
  })
})

describe('listGenera', () => {
  it('throws 400 when subfamily is empty', async () => {
    await expect(listGenera('')).rejects.toMatchObject({ status: 400 })
  })

  it('returns distinct genera for a given subfamily', async () => {
    ;(prismaMocks as any).taxon.findMany.mockResolvedValue([
      { genus: 'Formica' },
      { genus: 'Lasius' },
    ])

    const result = await listGenera('Formicinae')
    expect(result).toEqual(['Formica', 'Lasius'])
  })
})

describe('listSpecies', () => {
  it('throws 400 when genus is empty', async () => {
    await expect(listSpecies('')).rejects.toMatchObject({ status: 400 })
  })

  it('returns species strings for a given genus', async () => {
    ;(prismaMocks as any).taxon.findMany.mockResolvedValue([
      { species: 'rufa' },
      { species: 'polyctena' },
    ])

    const result = await listSpecies('Formica')
    expect(result).toEqual(['rufa', 'polyctena'])
  })
})

describe('listSubgenera', () => {
  it('throws 400 when genus is empty', async () => {
    await expect(listSubgenera('')).rejects.toMatchObject({ status: 400 })
  })

  it('returns subgenera for a genus', async () => {
    ;(prismaMocks as any).taxon.findMany.mockResolvedValue([
      { subgenus: 'Serviformica' },
      { subgenus: null },
    ])

    const result = await listSubgenera('Formica')
    expect(result).toEqual(['Serviformica'])
  })
})

describe('listSpeciesGroups', () => {
  it('throws 400 when genus is empty', async () => {
    await expect(listSpeciesGroups('')).rejects.toMatchObject({ status: 400 })
  })

  it('returns non-null species groups', async () => {
    ;(prismaMocks as any).taxon.findMany.mockResolvedValue([
      { speciesGroup: 'rufa' },
      { speciesGroup: null },
    ])

    const result = await listSpeciesGroups('Formica')
    expect(result).toEqual(['rufa'])
  })
})

describe('getSpeciesMetadata', () => {
  it('throws 400 when genus is empty', async () => {
    await expect(getSpeciesMetadata('', 'rufa')).rejects.toMatchObject({
      status: 400,
    })
  })

  it('throws 400 when species is empty', async () => {
    await expect(getSpeciesMetadata('Formica', '')).rejects.toMatchObject({
      status: 400,
    })
  })

  it('returns subgenus and speciesGroup from matched taxon', async () => {
    ;(prismaMocks as any).taxon.findFirst.mockResolvedValue({
      subgenus: 'Serviformica',
      speciesGroup: 'rufa',
    })

    const result = await getSpeciesMetadata('Formica', 'rufa')
    expect(result).toEqual({ subgenus: 'Serviformica', speciesGroup: 'rufa' })
  })

  it('returns nulls when no match found', async () => {
    ;(prismaMocks as any).taxon.findFirst.mockResolvedValue(null)

    const result = await getSpeciesMetadata('Formica', 'unknown')
    expect(result).toEqual({ subgenus: null, speciesGroup: null })
  })
})

describe('deleteTaxon', () => {
  it('deletes taxon and invalidates caches', async () => {
    ;(prismaMocks as any).taxon.delete.mockResolvedValue({ id: 't1' })

    const result = await deleteTaxon('t1')

    expect((prismaMocks as any).taxon.delete).toHaveBeenCalledWith({
      where: { id: 't1' },
    })
    expect(result).toEqual({ id: 't1' })
    expect(mocks.invalidateTaxonCatalogCache).toHaveBeenCalled()
    expect(mocks.invalidateTaxonLevelProfileCache).toHaveBeenCalled()
    expect(mocks.invalidateGameEntryCacheSafely).toHaveBeenCalled()
  })
})
