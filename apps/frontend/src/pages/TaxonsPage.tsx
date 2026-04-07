import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Taxon, TaxonLevelDetail } from '../types/models'

type SelectedDetail = {
  level: 'subfamily' | 'genus' | 'species'
  value: string
  detail: TaxonLevelDetail
}

export function TaxonsPage() {
  const [taxons, setTaxons] = useState<Taxon[]>([])
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
                  <td className="p-2">
                    <button
                      className="text-indigo-700 underline underline-offset-2"
                      type="button"
                      onClick={() =>
                        setSelectedDetail({
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
          </div>
        </div>
      )}
    </section>
  )
}
