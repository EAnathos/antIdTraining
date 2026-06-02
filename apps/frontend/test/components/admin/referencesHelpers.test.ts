import { describe, expect, it } from 'vitest'
import { normalizeAuthors } from '../../../src/components/admin/referencesHelpers'

describe('References helpers', () => {
  it('normalizes authors array by trimming and removing empty lines', () => {
    const input = [' Dupont ', '', 'Martin', '  ']
    expect(normalizeAuthors(input)).toEqual(['Dupont', 'Martin'])
  })
})
