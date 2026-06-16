import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))

import {
  listReferences,
  createReference,
  updateReference,
  deleteReference,
  referenceSchema,
} from '../../src/services/references.js'

beforeEach(() => {
  resetSharedMocks()
})

const baseRef = {
  id: 'r1',
  title: 'Ref Title',
  authors: [],
  description: null,
  type: 'WEBSITE' as const,
  url: null,
  taxons: [],
}

describe('referenceSchema', () => {
  it('trims title and deduplicates authors', () => {
    const result = referenceSchema.parse({
      title: '  My Ref  ',
      authors: ['Alice', 'Alice', 'Bob'],
      type: 'WEBSITE',
    })
    expect(result.title).toBe('My Ref')
    expect(result.authors).toEqual(['Alice', 'Bob'])
  })

  it('converts empty url to null', () => {
    const result = referenceSchema.parse({
      title: 'R',
      type: 'WEBSITE',
      url: '',
    })
    expect(result.url).toBeNull()
  })

  it('accepts a valid URL for WEBSITE type', () => {
    const result = referenceSchema.safeParse({
      title: 'R',
      type: 'WEBSITE',
      url: 'https://example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid URL for WEBSITE type', () => {
    const result = referenceSchema.safeParse({
      title: 'R',
      type: 'WEBSITE',
      url: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a valid DOI for MYRMECOLOGY type', () => {
    const result = referenceSchema.safeParse({
      title: 'R',
      type: 'MYRMECOLOGY',
      url: '10.1234/some.doi',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid DOI/URL for MYRMECOLOGY type', () => {
    const result = referenceSchema.safeParse({
      title: 'R',
      type: 'MYRMECOLOGY',
      url: 'not-a-doi-or-url',
    })
    expect(result.success).toBe(false)
  })
})

describe('listReferences', () => {
  it('returns all references ordered', async () => {
    prismaMocks.reference.findMany.mockResolvedValue([baseRef])
    const result = await listReferences()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Ref Title')
  })
})

describe('createReference', () => {
  it('creates reference without taxons', async () => {
    prismaMocks.taxon.count.mockResolvedValue(0)
    prismaMocks.reference.create.mockResolvedValue(baseRef)

    const result = await createReference({
      title: 'Ref Title',
      authors: [],
      description: null,
      type: 'WEBSITE',
      url: null,
      taxonIds: [],
    })

    expect(prismaMocks.reference.create).toHaveBeenCalled()
    expect(result.id).toBe('r1')
  })

  it('throws 400 when taxon ids are invalid', async () => {
    prismaMocks.taxon.count.mockResolvedValue(1)

    await expect(
      createReference({
        title: 'Ref',
        authors: [],
        description: null,
        type: 'WEBSITE',
        url: null,
        taxonIds: ['t1', 't2'],
      }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('connects taxons when provided and valid', async () => {
    prismaMocks.taxon.count.mockResolvedValue(1)
    prismaMocks.reference.create.mockResolvedValue(baseRef)

    await createReference({
      title: 'Ref',
      authors: [],
      description: null,
      type: 'WEBSITE',
      url: null,
      taxonIds: ['t1'],
    })

    expect(prismaMocks.reference.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taxons: { connect: [{ id: 't1' }] },
        }),
      }),
    )
  })
})

describe('updateReference', () => {
  it('updates reference', async () => {
    prismaMocks.taxon.count.mockResolvedValue(0)
    prismaMocks.reference.update.mockResolvedValue(baseRef)

    const result = await updateReference('r1', {
      title: 'Updated',
      authors: [],
      description: null,
      type: 'WEBSITE',
      url: null,
      taxonIds: [],
    })

    expect(prismaMocks.reference.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1' } }),
    )
    expect(result.id).toBe('r1')
  })
})

describe('deleteReference', () => {
  it('deletes reference by id', async () => {
    prismaMocks.reference.delete.mockResolvedValue(baseRef)
    const result = await deleteReference('r1')
    expect(prismaMocks.reference.delete).toHaveBeenCalledWith({
      where: { id: 'r1' },
    })
    expect(result.id).toBe('r1')
  })
})
