import type { Taxon } from '../types/models'

export type TaxonNameParts = Pick<
  Taxon,
  'genus' | 'subgenus' | 'species' | 'speciesGroup'
>

export function formatScientificTaxonNameText(taxon: TaxonNameParts) {
  const subgenusPart = taxon.subgenus ? ` (${taxon.subgenus})` : ''
  const speciesGroupPart = taxon.speciesGroup ? ` ${taxon.speciesGroup}` : ''
  return `${taxon.genus}${subgenusPart} ${taxon.species}${speciesGroupPart}`
}
