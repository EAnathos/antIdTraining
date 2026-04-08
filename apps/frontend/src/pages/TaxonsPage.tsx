import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import type { ReferenceItem, Taxon, TaxonLevelDetail } from '../types/models'

type SelectedDetail = {
  taxon: Taxon
  level: 'subfamily' | 'genus' | 'species'
  value: string
  detail: TaxonLevelDetail
}

const monthLabels = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const

function getReferenceHref(reference: ReferenceItem) {
  if (!reference.url) {
    return null
  }

  if (reference.type === 'MYRMECOLOGY' && !reference.url.startsWith('http://') && !reference.url.startsWith('https://')) {
    return `https://doi.org/${reference.url}`
  }

  return reference.url
}

function isMonthInRange(month: number, startMonth: number | null, endMonth: number | null) {
  if (!startMonth || !endMonth) {
    return false
  }

  return month >= startMonth && month <= endMonth
}

function isRangeEndpoint(month: number, startMonth: number | null, endMonth: number | null) {
  if (!startMonth || !endMonth) {
    return false
  }

  return month === startMonth || month === endMonth
}

export function TaxonsPage() {
  const [taxons, setTaxons] = useState<Taxon[]>([])
  const [references, setReferences] = useState<ReferenceItem[]>([])
  const [level, setLevel] = useState<'subfamily' | 'genus' | 'species'>('genus')
  const [query, setQuery] = useState('')
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(null)

  async function load() {
    const { data } = await api.get<Taxon[]>('/taxons', { params: { level, q: query } })
    setTaxons(data)
  }

  useEffect(() => {
    void load()
  }, [level, query])

  useEffect(() => {
    api.get<ReferenceItem[]>('/references').then((res) => setReferences(res.data))
  }, [])

  const linkedReferences = useMemo(() => {
    if (!selectedDetail) {
      return []
    }

    return references.filter((reference) => reference.taxons.some((taxon) => taxon.id === selectedDetail.taxon.id))
  }, [references, selectedDetail])

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Taxons enregistrés</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <select className="h-10 w-44 rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700" value={level} onChange={(e) => setLevel(e.target.value as 'subfamily' | 'genus' | 'species')}>
          <option value="subfamily">Sous-famille</option>
          <option value="genus">Genre</option>
          <option value="species">Espèce</option>
        </select>
        <input
          className="h-10 min-w-[260px] flex-1 rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700 placeholder:text-slate-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Recherche"
        />
      </div>

      <p className="mt-3 text-sm text-slate-600">
        {taxons.length} entrée{taxons.length > 1 ? 's' : ''} trouvée{taxons.length > 1 ? 's' : ''}
      </p>

      <div className="mt-4 overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-700">
              <th className="p-2">Sous-famille</th>
              <th className="p-2">Tribu</th>
              <th className="p-2">Genre</th>
              <th className="p-2">Sous-genre</th>
              <th className="p-2">Groupe d'espèce</th>
              <th className="p-2">Espèce</th>
            </tr>
          </thead>
          <tbody>
            {taxons.map((taxon) => (
                <tr key={taxon.id} className="border-b border-slate-100">
                  <td className="p-2">
                    <button
                      className="text-indigo-700 underline underline-offset-2"
                      type="button"
                      onClick={() =>
                        setSelectedDetail({
                          taxon,
                          level: 'subfamily',
                          value: taxon.subfamily,
                          detail: taxon.levelDetails.subfamily,
                        })
                      }
                    >
                      {taxon.subfamily}
                    </button>
                  </td>
                  <td className="p-2">{taxon.tribe ?? '-'}</td>
                  <td className="p-2">
                    <button
                      className="text-indigo-700 underline underline-offset-2"
                      type="button"
                      onClick={() =>
                        setSelectedDetail({
                          taxon,
                          level: 'genus',
                          value: taxon.genus,
                          detail: taxon.levelDetails.genus,
                        })
                      }
                    >
                      <em>{taxon.genus}</em>
                    </button>
                  </td>
                  <td className="p-2">{taxon.subgenus ? `(${taxon.subgenus})` : '-'}</td>
                  <td className="p-2">{taxon.speciesGroup ?? '-'}</td>
                  <td className="p-2">
                    <button
                      className="text-indigo-700 underline underline-offset-2"
                      type="button"
                      onClick={() =>
                        setSelectedDetail({
                          taxon,
                          level: 'species',
                          value: taxon.species,
                          detail: taxon.levelDetails.species,
                        })
                      }
                    >
                      <em>{taxon.species}</em>
                    </button>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setSelectedDetail(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-slate-900">
                {selectedDetail.level === 'subfamily' ? 'Sous-famille' : selectedDetail.level === 'genus' ? 'Genre' : 'Espèce'} : {selectedDetail.level === 'subfamily' ? selectedDetail.value : <em>{selectedDetail.value}</em>}
              </p>
              <button className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-700" type="button" onClick={() => setSelectedDetail(null)}>
                Fermer
              </button>
            </div>

            <p className="mt-2 font-medium text-slate-800">Description</p>
            <p className="mt-1 text-slate-700">{selectedDetail.detail.description ?? 'Aucune description.'}</p>

            <p className="mt-3 font-medium text-slate-800">Caractéristiques</p>
            {selectedDetail.detail.criteria.length > 0 ? (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                {selectedDetail.detail.criteria.map((criterion) => (
                  <li key={criterion.id}>{criterion.label}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-slate-700">Aucun critère renseigné.</p>
            )}

            {selectedDetail.level === 'species' && (
              <>
                <p className="mt-3 font-medium text-slate-800">Période d'essaimage</p>
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-12 justify-items-center gap-2">
                    {monthLabels.map((month, index) => {
                      const monthValue = index + 1
                      return (
                        <span
                          key={month}
                          className={`shrink-0 rounded-full border ${
                            isRangeEndpoint(monthValue, selectedDetail.taxon.swarmingStartMonth, selectedDetail.taxon.swarmingEndMonth)
                              ? 'h-6 w-6 border-indigo-700 bg-indigo-600'
                              : isMonthInRange(monthValue, selectedDetail.taxon.swarmingStartMonth, selectedDetail.taxon.swarmingEndMonth)
                                ? 'h-4 w-4 border-indigo-500 bg-indigo-400'
                                : 'h-4 w-4 border-slate-500 bg-slate-300'
                          }`}
                        />
                      )
                    })}
                  </div>
                  <div className="grid grid-cols-12 justify-items-center gap-2 text-xs text-slate-500">
                    {monthLabels.map((month) => (
                      <span key={`label-${month}`} className="w-6 text-center">{month.slice(0, 1)}</span>
                    ))}
                  </div>
                </div>

                {selectedDetail.taxon.swarmingStartMonth && selectedDetail.taxon.swarmingEndMonth ? (
                  <p className="mt-1 text-slate-700">
                    {monthLabels[selectedDetail.taxon.swarmingStartMonth - 1]} à {monthLabels[selectedDetail.taxon.swarmingEndMonth - 1]}
                  </p>
                ) : (
                  <p className="mt-1 text-slate-700">Aucune période d'essaimage renseignée pour cette espèce.</p>
                )}
              </>
            )}

            <p className="mt-3 font-medium text-slate-800">Références liées</p>
            {linkedReferences.length > 0 ? (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                {linkedReferences.map((reference) => {
                  const href = getReferenceHref(reference)
                  return (
                    <li key={reference.id}>
                      {href ? (
                        <a className="text-indigo-700 underline" href={href} target="_blank" rel="noreferrer">
                          {reference.title}
                        </a>
                      ) : (
                        reference.title
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-1 text-slate-700">Aucune référence liée.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
