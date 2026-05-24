import { describe, expect, it } from 'vitest'

import { formatScientificTaxonNameText } from './taxonDisplayUtils'

describe('scientific taxon name formatting', () => {
  it('formats a full taxon name with subgenus and species group', () => {
    expect(
      formatScientificTaxonNameText({
        genus: 'Formica',
        subgenus: 'Raptiformica',
        species: 'rufibarbis',
        speciesGroup: 'group',
      }),
    ).toBe('Formica (Raptiformica) rufibarbis group')
  })

  it('omits optional taxon parts when they are missing', () => {
    expect(
      formatScientificTaxonNameText({
        genus: 'Myrmica',
        subgenus: null,
        species: 'rubra',
        speciesGroup: null,
      }),
    ).toBe('Myrmica rubra')
  })
})