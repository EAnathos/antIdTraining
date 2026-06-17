import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/lib/taxonSizes.js', () => ({
  resolveTaxonSizeDetails: vi.fn().mockResolvedValue(null),
}))

import { resolveEntryTaxonSelection } from '../../src/services/entries.js'

const baseInput = {
  taxonLevel: 'GENUS' as const,
  taxonValue: 'Formica',
  department: '75',
  observedAt: new Date('2024-06-01'),
  biotope: 'Prairie humide',
  photoCredit: 'Alice',
}

beforeEach(() => {
  resetSharedMocks()
})

describe('resolveEntryTaxonSelection — SUBFAMILY', () => {
  it('returns null when subfamily not found', async () => {
    prismaMocks.taxon.findFirst.mockResolvedValue(null)

    const result = await resolveEntryTaxonSelection({
      ...baseInput,
      taxonLevel: 'SUBFAMILY',
      taxonValue: 'Unknowninae',
    })

    expect(result).toBeNull()
  })

  it('resolves subfamily taxon', async () => {
    prismaMocks.taxon.findFirst.mockResolvedValue({
      id: 't1',
      subfamily: 'Formicinae',
      genus: 'Formica',
      species: null,
    })

    const result = await resolveEntryTaxonSelection({
      ...baseInput,
      taxonLevel: 'SUBFAMILY',
      taxonValue: 'Formicinae',
    })

    expect(result).toMatchObject({
      taxonLevel: 'SUBFAMILY',
      taxonValue: 'Formicinae',
      subfamily: 'Formicinae',
      genus: null,
      species: null,
    })
  })
})

describe('resolveEntryTaxonSelection — GENUS', () => {
  it('returns null when genus not found', async () => {
    prismaMocks.taxon.findFirst.mockResolvedValue(null)

    const result = await resolveEntryTaxonSelection({
      ...baseInput,
      taxonLevel: 'GENUS',
      taxonValue: 'Unknown',
    })

    expect(result).toBeNull()
  })

  it('resolves genus taxon', async () => {
    prismaMocks.taxon.findFirst.mockResolvedValue({
      id: 't2',
      subfamily: 'Formicinae',
      genus: 'Formica',
      species: null,
    })

    const result = await resolveEntryTaxonSelection({
      ...baseInput,
      taxonLevel: 'GENUS',
      taxonValue: 'Formica',
    })

    expect(result).toMatchObject({
      taxonLevel: 'GENUS',
      taxonValue: 'Formica',
      genus: 'Formica',
      species: null,
    })
  })
})

describe('resolveEntryTaxonSelection — SPECIES', () => {
  it('returns null for invalid species taxonValue format', async () => {
    const result = await resolveEntryTaxonSelection({
      ...baseInput,
      taxonLevel: 'SPECIES',
      taxonValue: 'SingleWord',
    })

    expect(result).toBeNull()
  })

  it('returns null when species not found in DB', async () => {
    prismaMocks.taxon.findFirst.mockResolvedValue(null)

    const result = await resolveEntryTaxonSelection({
      ...baseInput,
      taxonLevel: 'SPECIES',
      taxonValue: 'Formica rufa',
    })

    expect(result).toBeNull()
  })

  it('resolves species taxon by "Genus species" value', async () => {
    prismaMocks.taxon.findFirst.mockResolvedValue({
      id: 't3',
      subfamily: 'Formicinae',
      genus: 'Formica',
      species: 'rufa',
    })

    const result = await resolveEntryTaxonSelection({
      ...baseInput,
      taxonLevel: 'SPECIES',
      taxonValue: 'Formica rufa',
    })

    expect(result).toMatchObject({
      taxonLevel: 'SPECIES',
      taxonValue: 'Formica rufa',
      genus: 'Formica',
      species: 'rufa',
    })
  })

  it('uses explicit taxonGenus when provided', async () => {
    prismaMocks.taxon.findFirst.mockResolvedValue({
      id: 't4',
      subfamily: 'Formicinae',
      genus: 'Formica',
      species: 'rufa',
    })

    const result = await resolveEntryTaxonSelection({
      ...baseInput,
      taxonLevel: 'SPECIES',
      taxonValue: 'rufa',
      taxonGenus: 'Formica',
    })

    expect(result?.genus).toBe('Formica')
    expect(result?.species).toBe('rufa')
  })
})
