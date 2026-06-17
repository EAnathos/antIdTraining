import type { TaxonNameParts } from './taxonDisplayUtils'

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
