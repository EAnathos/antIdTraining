import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))

const taxonLevelProfileMock = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
}
const taxonMock = { findMany: prismaMocks.user.findMany } // reuse shape
;(prismaMocks as any).taxonLevelProfile = taxonLevelProfileMock
;(prismaMocks as any).taxon = { findMany: vi.fn() }

import { resolveTaxonSizeDetails } from '../../src/lib/taxonSizes.js'

beforeEach(() => {
  resetSharedMocks()
  taxonLevelProfileMock.findUnique.mockReset()
  taxonLevelProfileMock.findFirst.mockReset()
  taxonLevelProfileMock.findMany.mockReset()
  ;(prismaMocks as any).taxon.findMany.mockReset()
})

describe('resolveTaxonSizeDetails', () => {
  it('returns worker size from species+genus profile', async () => {
    taxonLevelProfileMock.findUnique.mockResolvedValue({
      sizeWorker: '3-5 mm',
      sizeQueen: '8 mm',
      sizeMale: '4 mm',
    })

    const result = await resolveTaxonSizeDetails(
      { species: 'rufa', genus: 'Formica', subfamily: 'Formicinae' },
      'WORKER',
    )

    expect(result).toBe('3-5 mm')
  })

  it('returns queen size when caste is QUEEN', async () => {
    taxonLevelProfileMock.findUnique.mockResolvedValue({
      sizeWorker: '3-5 mm',
      sizeQueen: '8 mm',
      sizeMale: '4 mm',
    })

    const result = await resolveTaxonSizeDetails(
      { species: 'rufa', genus: 'Formica', subfamily: 'Formicinae' },
      'QUEEN',
    )

    expect(result).toBe('8 mm')
  })

  it('falls back to shared species profile when genus-specific not found', async () => {
    taxonLevelProfileMock.findUnique.mockResolvedValue(null)
    taxonLevelProfileMock.findFirst.mockResolvedValue({
      sizeWorker: '2-4 mm',
      sizeQueen: null,
      sizeMale: null,
    })

    const result = await resolveTaxonSizeDetails({
      species: 'fusca',
      genus: 'Formica',
      subfamily: 'Formicinae',
    })

    expect(result).toBe('2-4 mm')
  })

  it('returns null when no species or genus provided and no taxa found', async () => {
    ;(prismaMocks as any).taxon.findMany.mockResolvedValue([])

    const result = await resolveTaxonSizeDetails({
      subfamily: 'Formicinae',
    })

    expect(result).toBeNull()
  })

  it('derives size from species profiles when genus given', async () => {
    ;(prismaMocks as any).taxon.findMany.mockResolvedValue([
      { species: 'rufa' },
      { species: 'polyctena' },
    ])
    taxonLevelProfileMock.findMany.mockResolvedValue([
      { sizeWorker: '4-9 mm', sizeQueen: null, sizeMale: null },
      { sizeWorker: '3-7 mm', sizeQueen: null, sizeMale: null },
    ])

    const result = await resolveTaxonSizeDetails({
      genus: 'Formica',
      subfamily: 'Formicinae',
    })

    // Should merge 3-7 mm and 4-9 mm → 3-9 mm
    expect(result).toBe('3-9 mm')
  })
})
