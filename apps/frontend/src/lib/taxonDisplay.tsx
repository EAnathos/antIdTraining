import type { Taxon } from '../types/models'

type TaxonNameParts = Pick<
  Taxon,
  'genus' | 'subgenus' | 'species' | 'speciesGroup'
>

export function ScientificTaxonName({ taxon }: { taxon: TaxonNameParts }) {
  return (
    <>
      <em>{taxon.genus}</em>
      {taxon.subgenus ? <> ({taxon.subgenus})</> : null}{' '}
      <em>{taxon.species}</em>
      {taxon.speciesGroup ? (
        <>
          {' '}
          <em>{taxon.speciesGroup}</em>
        </>
      ) : null}
    </>
  )
}
