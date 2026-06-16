import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))

import {
  getTaxonCatalog,
  invalidateTaxonCatalogCache,
} from '../../src/lib/taxonCatalog.js'

beforeEach(() => {
  resetSharedMocks()
  invalidateTaxonCatalogCache()
})

const taxons = [
  { subfamily: 'Formicinae', genus: 'Formica', species: 'rufa' },
  { subfamily: 'Formicinae', genus: 'Formica', species: 'polyctena' },
  { subfamily: 'Myrmicinae', genus: 'Myrmica', species: 'rubra' },
]

describe('getTaxonCatalog', () => {
  it('fetches from DB and builds catalog', async () => {
    prismaMocks.taxon.findMany.mockResolvedValue(taxons)

    const result = await getTaxonCatalog()

    expect(result.items).toHaveLength(3)
    expect(result.subfamilies).toContain('Formicinae')
    expect(result.subfamilies).toContain('Myrmicinae')
    expect(result.subfamilies).toHaveLength(2)
  })

  it('returns cached result on second call without hitting DB', async () => {
    prismaMocks.taxon.findMany.mockResolvedValue(taxons)

    await getTaxonCatalog()
    await getTaxonCatalog()

    expect(prismaMocks.taxon.findMany).toHaveBeenCalledTimes(1)
  })

  it('refetches after cache invalidation', async () => {
    prismaMocks.taxon.findMany.mockResolvedValue(taxons)

    await getTaxonCatalog()
    invalidateTaxonCatalogCache()
    await getTaxonCatalog()

    expect(prismaMocks.taxon.findMany).toHaveBeenCalledTimes(2)
  })

  it('deduplicates subfamilies', async () => {
    prismaMocks.taxon.findMany.mockResolvedValue([
      { subfamily: 'Formicinae', genus: 'Formica', species: 'rufa' },
      { subfamily: 'Formicinae', genus: 'Lasius', species: 'niger' },
    ])

    const result = await getTaxonCatalog()

    expect(result.subfamilies).toEqual(['Formicinae'])
  })
})
