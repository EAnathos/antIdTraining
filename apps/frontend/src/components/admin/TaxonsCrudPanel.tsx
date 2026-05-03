import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Taxon } from '../../types/models'
import { ScientificTaxonName } from '../../lib/taxonDisplay'
import { AdminIconButton, EditIcon, TrashIcon } from './AdminIconButton'
import { FranceMap } from '../FranceMap'
import type { FrenchDepartmentCode } from '../../lib/frenchDepartments'

type TaxonForm = {
  subfamily: string
  tribe: string
  genus: string
  subgenus: string
  speciesGroup: string
  species: string
  distribution: FrenchDepartmentCode[]
}

type ModalState = {
  taxon: Taxon | null
  draft: TaxonDetailsDraft | null
  swarming: SwarmingPeriodDraft
  distribution: FrenchDepartmentCode[]
  isSelectingSwarmingRange: boolean
  selectionAnchorMonth: number | null
}

type LevelDetailDraft = {
  description: string
  sizeWorker: string
  sizeQueen: string
  sizeMale: string
  criteria: string[]
}

type TaxonDetailsDraft = {
  subfamily: LevelDetailDraft
  genus: LevelDetailDraft
  species: LevelDetailDraft
}

type SwarmingPeriodDraft = {
  swarmingStartMonth: number | null
  swarmingEndMonth: number | null
}

type TaxonDetailLevelKey = keyof TaxonDetailsDraft

type Props = {
  taxons: Taxon[]
  taxonForm: TaxonForm
  setTaxonForm: (value: TaxonForm) => void
  selectedTaxonId: string
  setSelectedTaxonId: (value: string) => void
  createTaxon: (event: FormEvent) => Promise<void>
  updateTaxon: (event: FormEvent) => Promise<void>
  deleteTaxon: (id: string) => Promise<void>
  saveTaxonLevelDetails: (
    taxonId: string,
    levelDetails: TaxonDetailsDraft,
    swarmingPeriod: SwarmingPeriodDraft,
    distribution: FrenchDepartmentCode[],
  ) => Promise<void>
}

const MONTH_OPTIONS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
] as const

const INITIAL_MODAL_STATE: ModalState = {
  taxon: null,
  draft: null,
  swarming: { swarmingStartMonth: null, swarmingEndMonth: null },
  distribution: [],
  isSelectingSwarmingRange: false,
  selectionAnchorMonth: null,
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
  const [modal, setModal] = useState<ModalState>(INITIAL_MODAL_STATE)

  const handleTaxonChange = useCallback((field: keyof TaxonForm, value: any) => {
    setTaxonForm({ ...taxonForm, [field]: value })
  }, [taxonForm, setTaxonForm])

  const validateTaxonForm = (): boolean => {
    if (!taxonForm.subfamily.trim() || !taxonForm.genus.trim() || !taxonForm.species.trim()) {
      return false
    }
    return true
  }

  const validateSizeFormat = (value: string): boolean => {
    if (!value.trim()) return true
    return /^\d+(-\d+)?\s*mm$/.test(value.trim())
  }

  const validateSwarmingPeriod = (): boolean => {
    const { swarmingStartMonth, swarmingEndMonth } = modal.swarming
    if (swarmingStartMonth === null || swarmingEndMonth === null) return true
    return swarmingStartMonth <= swarmingEndMonth
  }

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

  const submitTaxon = (event: FormEvent) => {
    event.preventDefault()
    if (!validateTaxonForm()) {
      alert('Veuillez remplir les champs obligatoires')
      return
    }
    return selectedTaxonId ? updateTaxon(event) : createTaxon(event)
  }

  const resetTaxonForm = () => {
    setSelectedTaxonId('')
    setTaxonForm({ subfamily: '', tribe: '', genus: '', subgenus: '', speciesGroup: '', species: '', distribution: [] })
  }

  const loadTaxonInForm = (taxon: Taxon) => {
    setSelectedTaxonId(taxon.id)
    setTaxonForm({
      subfamily: taxon.subfamily,
      tribe: taxon.tribe ?? '',
      genus: taxon.genus,
      subgenus: taxon.subgenus ?? '',
      speciesGroup: taxon.speciesGroup ?? '',
      species: taxon.species,
      distribution: (taxon.distribution?.departments ?? [])
        .filter((c) => typeof c === 'string') as FrenchDepartmentCode[],
    })
  }

  const buildLevelDetailsFromTaxon = (taxon: Taxon): TaxonDetailsDraft => {
    return {
      subfamily: {
        description: taxon.levelDetails.subfamily.description ?? '',
        sizeWorker: '',
        sizeQueen: '',
        sizeMale: '',
        criteria: taxon.levelDetails.subfamily.criteria.map((criterion) => criterion.label),
      },
      genus: {
        description: taxon.levelDetails.genus.description ?? '',
        sizeWorker: taxon.levelDetails.genus.sizeWorker ?? '',
        sizeQueen: taxon.levelDetails.genus.sizeQueen ?? '',
        sizeMale: taxon.levelDetails.genus.sizeMale ?? '',
        criteria: taxon.levelDetails.genus.criteria.map((criterion) => criterion.label),
      },
      species: {
        description: taxon.levelDetails.species.description ?? '',
        sizeWorker: taxon.levelDetails.species.sizeWorker ?? '',
        sizeQueen: taxon.levelDetails.species.sizeQueen ?? '',
        sizeMale: taxon.levelDetails.species.sizeMale ?? '',
        criteria: taxon.levelDetails.species.criteria.map((criterion) => criterion.label),
      },
    }
  }

  const openDetailsModal = (taxon: Taxon) => {
    const distribution = (taxon.distribution?.departments ?? []).filter((c) => typeof c === 'string') as FrenchDepartmentCode[]
    setModal({
      taxon,
      draft: buildLevelDetailsFromTaxon(taxon),
      swarming: {
        swarmingStartMonth: taxon.swarmingStartMonth,
        swarmingEndMonth: taxon.swarmingEndMonth,
      },
      distribution,
      isSelectingSwarmingRange: false,
      selectionAnchorMonth: null,
    })
  }

  const closeDetailsModal = () => {
    setModal(INITIAL_MODAL_STATE)
  }

  const updateSwarmingRange = (anchorMonth: number, currentMonth: number) => {
    setModal(prev => ({
      ...prev,
      swarming: {
        swarmingStartMonth: Math.min(anchorMonth, currentMonth),
        swarmingEndMonth: Math.max(anchorMonth, currentMonth),
      },
    }))
  }

  const beginSwarmingRangeSelection = (month: number) => {
    setModal(prev => ({
      ...prev,
      isSelectingSwarmingRange: true,
      selectionAnchorMonth: month,
      swarming: {
        swarmingStartMonth: month,
        swarmingEndMonth: month,
      },
    }))
  }

  const continueSwarmingRangeSelection = (month: number) => {
    if (!modal.isSelectingSwarmingRange || modal.selectionAnchorMonth === null) {
      return
    }
    updateSwarmingRange(modal.selectionAnchorMonth, month)
  }

  const endSwarmingRangeSelection = useCallback(() => {
    setModal(prev => ({
      ...prev,
      isSelectingSwarmingRange: false,
      selectionAnchorMonth: null,
    }))
  }, [])

  const isMonthInSelectedRange = (month: number): boolean => {
    if (modal.swarming.swarmingStartMonth === null || modal.swarming.swarmingEndMonth === null) {
      return false
    }
    return month >= modal.swarming.swarmingStartMonth && month <= modal.swarming.swarmingEndMonth
  }

  const isMonthRangeEndpoint = (month: number): boolean => {
    if (modal.swarming.swarmingStartMonth === null || modal.swarming.swarmingEndMonth === null) {
      return false
    }

    return month === modal.swarming.swarmingStartMonth || month === modal.swarming.swarmingEndMonth
  }

  useEffect(() => {
    if (!modal.isSelectingSwarmingRange) {
      return
    }

    window.addEventListener('pointerup', endSwarmingRangeSelection)
    return () => {
      window.removeEventListener('pointerup', endSwarmingRangeSelection)
    }
  }, [modal.isSelectingSwarmingRange, endSwarmingRangeSelection])

  const updateLevelDescription = (levelKey: keyof TaxonDetailsDraft, value: string) => {
    if (!modal.draft) return
    setModal(prev => ({
      ...prev,
      draft: {
        ...prev.draft!,
        [levelKey]: {
          ...prev.draft![levelKey],
          description: value,
        },
      },
    }))
  }

  const updateCriterion = (levelKey: keyof TaxonDetailsDraft, index: number, value: string) => {
    if (!modal.draft) return
    const nextCriteria = [...modal.draft[levelKey].criteria]
    nextCriteria[index] = value
    setModal(prev => ({
      ...prev,
      draft: {
        ...prev.draft!,
        [levelKey]: {
          ...prev.draft![levelKey],
          criteria: nextCriteria,
        },
      },
    }))
  }

  const updateLevelSize = (levelKey: keyof TaxonDetailsDraft, casteKey: 'sizeWorker' | 'sizeQueen' | 'sizeMale', value: string) => {
    if (!modal.draft) return
    if (!validateSizeFormat(value)) {
      alert('Format de taille invalide. Utilisez: "2-3 mm"')
      return
    }
    setModal(prev => ({
      ...prev,
      draft: {
        ...prev.draft!,
        [levelKey]: {
          ...prev.draft![levelKey],
          [casteKey]: value,
        },
      },
    }))
  }

  const addCriterion = (levelKey: keyof TaxonDetailsDraft) => {
    if (!modal.draft) return
    setModal(prev => ({
      ...prev,
      draft: {
        ...prev.draft!,
        [levelKey]: {
          ...prev.draft![levelKey],
          criteria: [...prev.draft![levelKey].criteria, ''],
        },
      },
    }))
  }

  const removeCriterion = (levelKey: keyof TaxonDetailsDraft, index: number) => {
    if (!modal.draft) return
    setModal(prev => ({
      ...prev,
      draft: {
        ...prev.draft!,
        [levelKey]: {
          ...prev.draft![levelKey],
          criteria: prev.draft![levelKey].criteria.filter((_, currentIndex) => currentIndex !== index),
        },
      },
    }))
  }

  const renderLevelTitle = (levelKey: TaxonDetailLevelKey, taxon: Taxon) => {
    if (levelKey === 'subfamily') {
      return <>Sous-famille ({taxon.subfamily})</>
    }

    if (levelKey === 'genus') {
      return <>Genre (<em>{taxon.genus}</em>)</>
    }

    return <>Espèce (<em>{taxon.genus}</em> <em>{taxon.species}</em>)</>
  }

  const renderSwarmingSelector = () => {
    return (
      <div className="mt-3 mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <span>Essaimage :</span>
          {modal.swarming.swarmingStartMonth && modal.swarming.swarmingEndMonth && (
            <>
              <span>
                {MONTH_OPTIONS[modal.swarming.swarmingStartMonth - 1].label} à {MONTH_OPTIONS[modal.swarming.swarmingEndMonth - 1].label}
              </span>
              <button
                className="text-sm underline underline-offset-2"
                type="button"
                onClick={() => setModal(prev => ({
                  ...prev,
                  swarming: { swarmingStartMonth: null, swarmingEndMonth: null },
                }))}
              >
                Réinitialiser
              </button>
            </>
          )}
        </div>
        <div className="grid grid-cols-12 justify-items-center gap-2" role="group" aria-label="Sélection période d'essaimage">
          {MONTH_OPTIONS.map((month) => (
            <button
              key={month.value}
              type="button"
              title={month.label}
              aria-label={month.label}
              aria-pressed={isMonthInSelectedRange(month.value)}
              onPointerDown={() => beginSwarmingRangeSelection(month.value)}
              onPointerEnter={() => continueSwarmingRangeSelection(month.value)}
              onPointerUp={endSwarmingRangeSelection}
              className={`shrink-0 rounded-full border transition ${
                isMonthRangeEndpoint(month.value)
                  ? 'h-6 w-6 border-indigo-700 bg-indigo-600'
                  : isMonthInSelectedRange(month.value)
                    ? 'h-4 w-4 border-indigo-500 bg-indigo-400'
                    : 'h-4 w-4 border-slate-500 bg-slate-300 hover:border-slate-600'
              }`}
            />
          ))}
        </div>
        <div className="grid grid-cols-12 justify-items-center gap-2 text-xs text-slate-500" aria-hidden>
          {MONTH_OPTIONS.map((month) => (
            <span key={`label-${month.value}`} className="w-6 text-center">{month.label.slice(0, 1)}</span>
          ))}
        </div>
      </div>
    )
  }

  const renderLevelEditor = (levelKey: TaxonDetailLevelKey, levelDraft: LevelDetailDraft, taxon: Taxon): React.ReactNode => {
    return (
      <div key={levelKey} className="mb-4 rounded-lg border border-slate-200 p-3">
        <p className="font-medium text-slate-800">
          {renderLevelTitle(levelKey, taxon)}
        </p>
        {levelKey === 'species' && renderSwarmingSelector()}
        <textarea
          className="mt-2 w-full rounded border p-2"
          placeholder="Description"
          rows={2}
          value={levelDraft.description}
          onChange={(e) => updateLevelDescription(levelKey, e.target.value)}
        />

        {(levelKey === 'genus' || levelKey === 'species') && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <input
              className="rounded border p-2"
              placeholder="Ouvrière (ex: 2-3 mm)"
              value={levelDraft.sizeWorker}
              onChange={(e) => updateLevelSize(levelKey, 'sizeWorker', e.target.value)}
            />
            <input
              className="rounded border p-2"
              placeholder="Reine (ex: 4-5 mm)"
              value={levelDraft.sizeQueen}
              onChange={(e) => updateLevelSize(levelKey, 'sizeQueen', e.target.value)}
            />
            <input
              className="rounded border p-2"
              placeholder="Mâle (ex: 2-3 mm)"
              value={levelDraft.sizeMale}
              onChange={(e) => updateLevelSize(levelKey, 'sizeMale', e.target.value)}
            />
          </div>
        )}

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
  }

  const saveDetailsModal = async () => {
    if (!modal.taxon || !modal.draft) return
    if (!validateSwarmingPeriod()) {
      alert('Période d\'essaimage invalide')
      return
    }
    const hasEmptyCriteria = ['subfamily', 'genus', 'species'].some(key => {
      return modal.draft![key as keyof TaxonDetailsDraft].criteria.some(c => !c.trim())
    })
    if (hasEmptyCriteria) {
      alert('Les critères vides doivent être supprimés')
      return
    }
    try {
      await saveTaxonLevelDetails(modal.taxon.id, modal.draft, modal.swarming, modal.distribution)
      closeDetailsModal()
    } catch (error) {
      console.error('Error saving taxon details:', error)
      alert('Erreur lors de l\'enregistrement')
    }
  }

  const handleDeleteTaxon = async (id: string) => {
    if (!window.confirm('Confirmer la suppression de ce taxon ?')) {
      return
    }
    try {
      await deleteTaxon(id)
    } catch (error) {
      console.error('Error deleting taxon:', error)
      alert('Erreur lors de la suppression')
    }
  }

  return (
    <div className="mt-3 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Ajout / modification</h3>
        <form className="grid gap-2 md:grid-cols-6" onSubmit={submitTaxon}>
          <input className="rounded border p-2" placeholder="Sous-famille" value={taxonForm.subfamily} onChange={(e) => handleTaxonChange('subfamily', e.target.value)} required />
          <input className="rounded border p-2" placeholder="Tribu" value={taxonForm.tribe} onChange={(e) => handleTaxonChange('tribe', e.target.value)} />
          <input className="rounded border p-2" placeholder="Genre" value={taxonForm.genus} onChange={(e) => handleTaxonChange('genus', e.target.value)} required />
          <input className="rounded border p-2" placeholder="Sous-genre" value={taxonForm.subgenus} onChange={(e) => handleTaxonChange('subgenus', e.target.value)} />
          <input className="rounded border p-2" placeholder="Groupe d'espèces" value={taxonForm.speciesGroup} onChange={(e) => handleTaxonChange('speciesGroup', e.target.value)} />
          <input className="rounded border p-2" placeholder="Espèce" value={taxonForm.species} onChange={(e) => handleTaxonChange('species', e.target.value)} required />

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

        <div className="mt-4 overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700">
                <th className="sticky top-0 z-10 bg-white p-2">Sous-famille</th>
                <th className="sticky top-0 z-10 bg-white p-2">Tribu</th>
                <th className="sticky top-0 z-10 bg-white p-2">Genre</th>
                <th className="sticky top-0 z-10 bg-white p-2">Sous-genre</th>
                <th className="sticky top-0 z-10 bg-white p-2">Groupe d'espèce</th>
                <th className="sticky top-0 z-10 bg-white p-2">Espèce</th>
                <th className="sticky top-0 z-10 bg-white p-2">Détails</th>
                <th className="sticky top-0 z-10 bg-white p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTaxons.map((taxon) => (
                <tr
                  key={taxon.id}
                  className={`border-b ${selectedTaxonId === taxon.id ? 'border-slate-200 bg-slate-50' : 'border-slate-100'}`}
                >
                  <td className="max-w-[180px] whitespace-nowrap p-2 overflow-hidden text-ellipsis" title={taxon.subfamily}>{taxon.subfamily}</td>
                  <td className="max-w-[160px] whitespace-nowrap p-2 overflow-hidden text-ellipsis" title={taxon.tribe ?? '-'}>{taxon.tribe ?? '-'}</td>
                  <td className="max-w-[160px] whitespace-nowrap p-2 overflow-hidden text-ellipsis" title={taxon.genus}><em>{taxon.genus}</em></td>
                  <td className="max-w-[140px] whitespace-nowrap p-2 overflow-hidden text-ellipsis" title={taxon.subgenus ? `(${taxon.subgenus})` : '-'}>{taxon.subgenus ? `(${taxon.subgenus})` : '-'}</td>
                  <td className="max-w-[180px] whitespace-nowrap p-2 overflow-hidden text-ellipsis" title={taxon.speciesGroup ?? '-'}>{taxon.speciesGroup ?? '-'}</td>
                  <td className="max-w-[180px] whitespace-nowrap p-2 overflow-hidden text-ellipsis" title={taxon.species}><em>{taxon.species}</em></td>
                  <td className="p-2">
                    <button className="rounded bg-indigo-50 px-2 py-1 text-indigo-700" type="button" onClick={() => openDetailsModal(taxon)}>
                      Ouvrir
                    </button>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <AdminIconButton title="Modifier" onClick={() => loadTaxonInForm(taxon)} icon={<EditIcon />} />
                      <AdminIconButton title="Supprimer" tone="danger" onClick={() => { handleDeleteTaxon(taxon.id).catch(console.error) }} icon={<TrashIcon />} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal.taxon && modal.draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-4 shadow-xl" role="dialog" aria-labelledby="modal-title" aria-modal="true">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="modal-title" className="text-base font-semibold text-slate-900">
                Critères et description — <ScientificTaxonName taxon={modal.taxon} />
              </h3>
              <button className="rounded bg-slate-100 px-3 py-1 text-sm" type="button" onClick={closeDetailsModal} aria-label="Fermer la boîte de dialogue">
                Fermer
              </button>
            </div>

            {(['subfamily', 'genus', 'species'] as const).map((levelKey) => renderLevelEditor(levelKey, modal.draft![levelKey], modal.taxon!))}

            {modal.taxon.levelDetails.species && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-700">Aire de répartition</label>
                  <button
                    className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200"
                    type="button"
                    onClick={() => setModal(prev => ({
                      ...prev,
                      distribution: [],
                    }))}
                  >
                    Réinitialiser
                  </button>
                </div>
                <FranceMap
                  selectedDepartments={modal.distribution}
                  onToggleDepartment={(departmentCode) => {
                    setModal(prev => ({
                      ...prev,
                      distribution: prev.distribution.includes(departmentCode)
                        ? prev.distribution.filter((value) => value !== departmentCode)
                        : [...prev.distribution, departmentCode],
                    }))
                  }}
                />
              </div>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <button className="rounded bg-slate-100 px-3 py-2" type="button" onClick={closeDetailsModal}>
                Annuler
              </button>
              <button className="rounded bg-slate-900 px-3 py-2 text-white" type="button" onClick={() => { saveDetailsModal().catch(console.error) }}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
