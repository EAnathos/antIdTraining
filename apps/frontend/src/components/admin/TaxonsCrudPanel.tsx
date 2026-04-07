import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Taxon } from '../../types/models'

type TaxonForm = {
  subfamily: string
  tribe: string
  genus: string
  subgenus: string
  speciesGroup: string
  species: string
}

type Props = {
  taxons: Taxon[]
  taxonForm: TaxonForm
  setTaxonForm: (value: TaxonForm) => void
  selectedTaxonId: string
  setSelectedTaxonId: (value: string) => void
  createTaxon: (event: FormEvent) => Promise<void>
  updateTaxon: (event: FormEvent) => Promise<void>
  deleteTaxon: (id: string) => Promise<void>
}

export function TaxonsCrudPanel({
  taxons,
  taxonForm,
  setTaxonForm,
  selectedTaxonId,
  setSelectedTaxonId,
  createTaxon,
  updateTaxon,
  deleteTaxon,
}: Props) {
  const [level, setLevel] = useState('')
  const [query, setQuery] = useState('')
  const [appliedLevel, setAppliedLevel] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')

  const filteredTaxons = useMemo(() => {
    const value = appliedQuery.trim().toLowerCase()
    const currentLevel = appliedLevel

    if (!value) return taxons

    return taxons.filter((taxon) => {
      if (currentLevel === 'subfamily') return taxon.subfamily.toLowerCase().includes(value)
      if (currentLevel === 'genus') return taxon.genus.toLowerCase().includes(value)
      if (currentLevel === 'species') return taxon.species.toLowerCase().includes(value)

      const haystack = [taxon.subfamily, taxon.genus, taxon.species].join(' ').toLowerCase()
      return haystack.includes(value)
    })
  }, [appliedLevel, appliedQuery, taxons])

  function applySearch() {
    setAppliedLevel(level)
    setAppliedQuery(query)
  }

  function submitTaxon(event: FormEvent) {
    return selectedTaxonId ? updateTaxon(event) : createTaxon(event)
  }

  function resetTaxonForm() {
    setSelectedTaxonId('')
    setTaxonForm({ subfamily: '', tribe: '', genus: '', subgenus: '', speciesGroup: '', species: '' })
  }

  function loadTaxonInForm(taxon: Taxon) {
    setSelectedTaxonId(taxon.id)
    setTaxonForm({
      subfamily: taxon.subfamily,
      tribe: taxon.tribe ?? '',
      genus: taxon.genus,
      subgenus: taxon.subgenus ?? '',
      speciesGroup: taxon.speciesGroup ?? '',
      species: taxon.species,
    })
  }

  return (
    <div className="mt-3 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Ajout / modification</h3>
        <form className="grid gap-2 md:grid-cols-6" onSubmit={submitTaxon}>
          <input className="rounded border p-2" placeholder="Sous-famille" value={taxonForm.subfamily} onChange={(e) => setTaxonForm({ ...taxonForm, subfamily: e.target.value })} required />
          <input className="rounded border p-2" placeholder="Tribu" value={taxonForm.tribe} onChange={(e) => setTaxonForm({ ...taxonForm, tribe: e.target.value })} />
          <input className="rounded border p-2" placeholder="Genre" value={taxonForm.genus} onChange={(e) => setTaxonForm({ ...taxonForm, genus: e.target.value })} required />
          <input className="rounded border p-2" placeholder="Sous-genre" value={taxonForm.subgenus} onChange={(e) => setTaxonForm({ ...taxonForm, subgenus: e.target.value })} />
          <input className="rounded border p-2" placeholder="Groupe d'espèces" value={taxonForm.speciesGroup} onChange={(e) => setTaxonForm({ ...taxonForm, speciesGroup: e.target.value })} />
          <input className="rounded border p-2" placeholder="Espèce" value={taxonForm.species} onChange={(e) => setTaxonForm({ ...taxonForm, species: e.target.value })} required />
          <div className="md:col-span-6 flex flex-wrap gap-2">
            <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">
              {selectedTaxonId ? 'Modifier taxon' : 'Créer taxon'}
            </button>
            {selectedTaxonId && (
              <button className="rounded bg-slate-100 px-3 py-2 text-slate-700" type="button" onClick={resetTaxonForm}>
                Annuler la modification
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Recherche / liste</h3>
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
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-white" type="button" onClick={applySearch}>
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
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTaxons.map((taxon) => (
                <tr key={taxon.id} className="border-b border-slate-100">
                  <td className="p-2">{taxon.subfamily}</td>
                  <td className="p-2">{taxon.tribe ?? '-'}</td>
                  <td className="p-2">{taxon.genus}</td>
                  <td className="p-2">{taxon.subgenus ?? '-'}</td>
                  <td className="p-2">{taxon.speciesGroup ?? '-'}</td>
                  <td className="p-2">{taxon.species}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <button className="rounded bg-slate-100 px-2 py-1 text-slate-700" type="button" title="Modifier" onClick={() => loadTaxonInForm(taxon)}>
                        ✏️
                      </button>
                      <button className="rounded bg-red-100 px-2 py-1 text-red-700" type="button" title="Supprimer" onClick={() => deleteTaxon(taxon.id)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
