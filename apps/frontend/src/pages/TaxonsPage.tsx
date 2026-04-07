import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Taxon } from '../types/models'

export function TaxonsPage() {
  const [taxons, setTaxons] = useState<Taxon[]>([])
  const [level, setLevel] = useState('')
  const [query, setQuery] = useState('')

  async function load() {
    const { data } = await api.get<Taxon[]>('/taxons', { params: { level, q: query } })
    setTaxons(data)
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Taxons enregistrés</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <select className="rounded-lg border border-slate-300 p-2" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">Tous niveaux</option>
          <option value="subfamily">Sous-famille</option>
          <option value="genus">Genre</option>
          <option value="species">Espèce</option>
        </select>
        <input
          className="rounded-lg border border-slate-300 p-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Recherche"
        />
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-white" onClick={load}>
          Rechercher
        </button>
      </div>

      <div className="mt-4 overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-700">
              <th className="p-2">Sous-famille</th>
              <th className="p-2">Tribu</th>
              <th className="p-2">Genre</th>
              <th className="p-2">Sous-genre</th>
              <th className="p-2">Groupe d'espèces</th>
              <th className="p-2">Espèce</th>
            </tr>
          </thead>
          <tbody>
            {taxons.map((taxon) => (
              <tr key={taxon.id} className="border-b border-slate-100">
                <td className="p-2">{taxon.subfamily}</td>
                <td className="p-2">{taxon.tribe ?? '-'}</td>
                <td className="p-2">{taxon.genus}</td>
                <td className="p-2">{taxon.subgenus ?? '-'}</td>
                <td className="p-2">{taxon.speciesGroup ?? '-'}</td>
                <td className="p-2">{taxon.species}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
