import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Taxon } from '../../types/models'
import { ScientificTaxonName } from '../../lib/taxonDisplay'
import { AdminIconButton, EditIcon, TrashIcon } from './AdminIconButton'

type TaxonForm = {
  subfamily: string
  tribe: string
  genus: string
  subgenus: string
  speciesGroup: string
  species: string
}

type LevelDetailDraft = {
  description: string
  criteria: string[]
}

type TaxonDetailsDraft = {
  subfamily: LevelDetailDraft
  genus: LevelDetailDraft
  species: LevelDetailDraft
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
  saveTaxonLevelDetails: (taxonId: string, levelDetails: TaxonDetailsDraft) => Promise<void>
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
  saveTaxonLevelDetails,
}: Props) {
  const [level, setLevel] = useState('genus')
  const [query, setQuery] = useState('')
  const [modalTaxon, setModalTaxon] = useState<Taxon | null>(null)
  const [modalDraft, setModalDraft] = useState<TaxonDetailsDraft | null>(null)

  const filteredTaxons = useMemo(() => {
    const value = query.trim().toLowerCase()
    const currentLevel = level

    if (!value) return taxons

    return taxons.filter((taxon) => {
      if (currentLevel === 'subfamily') return taxon.subfamily.toLowerCase().includes(value)
      if (currentLevel === 'genus') return taxon.genus.toLowerCase().includes(value)
      if (currentLevel === 'species') return taxon.species.toLowerCase().includes(value)

      const haystack = [taxon.subfamily, taxon.genus, taxon.species].join(' ').toLowerCase()
      return haystack.includes(value)
    })
  }, [level, query, taxons])

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

  function openDetailsModal(taxon: Taxon) {
    setModalTaxon(taxon)
    setModalDraft({
      subfamily: {
        description: taxon.levelDetails.subfamily.description ?? '',
        criteria: taxon.levelDetails.subfamily.criteria.map((criterion) => criterion.label),
      },
      genus: {
        description: taxon.levelDetails.genus.description ?? '',
        criteria: taxon.levelDetails.genus.criteria.map((criterion) => criterion.label),
      },
      species: {
        description: taxon.levelDetails.species.description ?? '',
        criteria: taxon.levelDetails.species.criteria.map((criterion) => criterion.label),
      },
    })
  }

  function closeDetailsModal() {
    setModalTaxon(null)
    setModalDraft(null)
  }

  function updateLevelDescription(levelKey: keyof TaxonDetailsDraft, value: string) {
    if (!modalDraft) return
    setModalDraft({
      ...modalDraft,
      [levelKey]: {
        ...modalDraft[levelKey],
        description: value,
      },
    })
  }

  function updateCriterion(levelKey: keyof TaxonDetailsDraft, index: number, value: string) {
    if (!modalDraft) return
    const nextCriteria = [...modalDraft[levelKey].criteria]
    nextCriteria[index] = value
    setModalDraft({
      ...modalDraft,
      [levelKey]: {
        ...modalDraft[levelKey],
        criteria: nextCriteria,
      },
    })
  }

  function addCriterion(levelKey: keyof TaxonDetailsDraft) {
    if (!modalDraft) return
    setModalDraft({
      ...modalDraft,
      [levelKey]: {
        ...modalDraft[levelKey],
        criteria: [...modalDraft[levelKey].criteria, ''],
      },
    })
  }

  function removeCriterion(levelKey: keyof TaxonDetailsDraft, index: number) {
    if (!modalDraft) return
    setModalDraft({
      ...modalDraft,
      [levelKey]: {
        ...modalDraft[levelKey],
        criteria: modalDraft[levelKey].criteria.filter((_, currentIndex) => currentIndex !== index),
      },
    })
  }

  async function saveDetailsModal() {
    if (!modalTaxon || !modalDraft) return
    await saveTaxonLevelDetails(modalTaxon.id, modalDraft)
    closeDetailsModal()
  }

  async function handleDeleteTaxon(id: string) {
    if (!window.confirm('Confirmer la suppression de ce taxon ?')) {
      return
    }
    await deleteTaxon(id)
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
          <select className="h-10 w-44 rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700" value={level} onChange={(e) => setLevel(e.target.value)}>
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
          {filteredTaxons.length} entrée{filteredTaxons.length > 1 ? 's' : ''} trouvée{filteredTaxons.length > 1 ? 's' : ''}
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
                <th className="p-2">Détails</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTaxons.map((taxon) => (
                <tr
                  key={taxon.id}
                  className={`border-b ${selectedTaxonId === taxon.id ? 'border-slate-200 bg-slate-50' : 'border-slate-100'}`}
                >
                  <td className="p-2">{taxon.subfamily}</td>
                  <td className="p-2">{taxon.tribe ?? '-'}</td>
                  <td className="p-2"><em>{taxon.genus}</em></td>
                  <td className="p-2">{taxon.subgenus ? `(${taxon.subgenus})` : '-'}</td>
                  <td className="p-2"><em>{taxon.species}</em></td>
                  <td className="p-2">
                    <button className="rounded bg-indigo-50 px-2 py-1 text-indigo-700" type="button" onClick={() => openDetailsModal(taxon)}>
                      Ouvrir
                    </button>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <AdminIconButton title="Modifier" onClick={() => loadTaxonInForm(taxon)} icon={<EditIcon />} />
                      <AdminIconButton title="Supprimer" tone="danger" onClick={() => void handleDeleteTaxon(taxon.id)} icon={<TrashIcon />} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalTaxon && modalDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Critères et description — <ScientificTaxonName taxon={modalTaxon} />
              </h3>
              <button className="rounded bg-slate-100 px-3 py-1 text-sm" type="button" onClick={closeDetailsModal}>
                Fermer
              </button>
            </div>

            {(['subfamily', 'genus', 'species'] as const).map((levelKey) => {
              const levelDraft = modalDraft[levelKey]

              return (
                <div key={levelKey} className="mb-4 rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-800">
                    {levelKey === 'subfamily' ? (
                      <>Sous-famille ({modalTaxon.subfamily})</>
                    ) : levelKey === 'genus' ? (
                      <>Genre (<em>{modalTaxon.genus}</em>)</>
                    ) : (
                      <>Espèce (<em>{modalTaxon.genus}</em> <em>{modalTaxon.species}</em>)</>
                    )}
                  </p>
                  <textarea
                    className="mt-2 w-full rounded border p-2"
                    placeholder="Description"
                    rows={2}
                    value={levelDraft.description}
                    onChange={(e) => updateLevelDescription(levelKey, e.target.value)}
                  />

                  <div className="mt-2 space-y-2">
                    {levelDraft.criteria.map((criterion, index) => (
                      <div key={`${levelKey}-${index}`} className="flex gap-2">
                        <input
                          className="flex-1 rounded border p-2"
                          placeholder="Critère"
                          value={criterion}
                          onChange={(e) => updateCriterion(levelKey, index, e.target.value)}
                        />
                        <AdminIconButton title="Supprimer" tone="danger" onClick={() => removeCriterion(levelKey, index)} icon={<TrashIcon />} />
                      </div>
                    ))}
                  </div>

                  <button className="mt-2 rounded bg-slate-100 px-3 py-1 text-sm" type="button" onClick={() => addCriterion(levelKey)}>
                    + Ajouter un critère
                  </button>
                </div>
              )
            })}

            <div className="mt-2 flex justify-end gap-2">
              <button className="rounded bg-slate-100 px-3 py-2" type="button" onClick={closeDetailsModal}>
                Annuler
              </button>
              <button className="rounded bg-slate-900 px-3 py-2 text-white" type="button" onClick={() => void saveDetailsModal()}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
