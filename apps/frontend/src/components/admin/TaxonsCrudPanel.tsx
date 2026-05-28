import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Taxon } from '../../types/models'
import { AdminIconButton, EditIcon, TrashIcon } from './AdminIconButton'
import { FranceMap } from '../FranceMap'
import {
  ALL_FRENCH_DEPARTMENT_CODES,
  type FrenchDepartmentCode,
} from '../../lib/frenchDepartments'
import { TaxonLevelEditor } from './TaxonLevelEditor'

type TaxonForm = {
  subfamily: string
  tribe: string
  genus: string
  subgenus: string
  speciesGroup: string
  species: string
  distribution: FrenchDepartmentCode[]
}

type TaxonFormKey = Exclude<keyof TaxonForm, 'distribution'>

type ModalState = {
  taxon: Taxon | null
  draft: TaxonDetailsDraft | null
  invasive: boolean
  swarming: SwarmingPeriodDraft
  distribution: FrenchDepartmentCode[]
  confusions: ConfusionDraft[]
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

type ConfusionDraft = {
  confusedTaxonLabel: string
  detail: string
}

type TaxonDetailsDraft = {
  subfamily: LevelDetailDraft
  genus: LevelDetailDraft
  subgenus: LevelDetailDraft
  speciesGroup: LevelDetailDraft
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
    invasive: boolean,
    swarmingPeriod: SwarmingPeriodDraft,
    distribution: FrenchDepartmentCode[],
    confusions: { confusedTaxonId: string; detail: string }[],
  ) => Promise<void>
}

const INITIAL_MODAL_STATE: ModalState = {
  taxon: null,
  draft: null,
  invasive: false,
  swarming: { swarmingStartMonth: null, swarmingEndMonth: null },
  distribution: [],
  confusions: [],
  isSelectingSwarmingRange: false,
  selectionAnchorMonth: null,
}

const EMPTY_TAXON_FORM: TaxonForm = {
  subfamily: '',
  tribe: '',
  genus: '',
  subgenus: '',
  speciesGroup: '',
  species: '',
  distribution: [],
}

function normalizeDistribution(
  departments: unknown[] | undefined,
): FrenchDepartmentCode[] {
  return (departments ?? []).filter(
    (department): department is FrenchDepartmentCode =>
      typeof department === 'string',
  )
}

function buildLevelDetailDraft(
  detail?: {
    description?: string | null
    sizeWorker?: string | null
    sizeQueen?: string | null
    sizeMale?: string | null
    criteria?: { label: string }[] | null
  } | null,
): LevelDetailDraft {
  return {
    description: detail?.description ?? '',
    sizeWorker: detail?.sizeWorker ?? '',
    sizeQueen: detail?.sizeQueen ?? '',
    sizeMale: detail?.sizeMale ?? '',
    criteria: detail?.criteria?.map((criterion) => criterion.label) ?? [],
  }
}

function buildTaxonDetailsDraft(taxon: Taxon): TaxonDetailsDraft {
  const levelDetails = taxon.levelDetails

  return {
    subfamily: buildLevelDetailDraft(levelDetails.subfamily),
    genus: buildLevelDetailDraft(levelDetails.genus),
    subgenus: buildLevelDetailDraft(levelDetails.subgenus),
    speciesGroup: buildLevelDetailDraft(levelDetails.speciesGroup),
    species: buildLevelDetailDraft(levelDetails.species),
  }
}

function buildTaxonLabel(
  taxon: Pick<Taxon, 'subfamily' | 'genus' | 'species'>,
) {
  return [taxon.subfamily, taxon.genus, taxon.species]
    .filter(Boolean)
    .join(' · ')
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
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalState>(INITIAL_MODAL_STATE)

  const taxonOptions = useMemo(
    () =>
      [...taxons]
        .map((taxon) => ({ taxon, label: buildTaxonLabel(taxon) }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    [taxons],
  )

  const handleTaxonChange = useCallback(
    (field: TaxonFormKey, value: string) => {
      setTaxonForm({ ...taxonForm, [field]: value })
    },
    [taxonForm, setTaxonForm],
  )

  const validateTaxonForm = (): boolean => {
    if (
      !taxonForm.subfamily.trim() ||
      !taxonForm.genus.trim() ||
      !taxonForm.species.trim()
    ) {
      return false
    }
    return true
  }

  const validateSwarmingPeriod = (): boolean => {
    const { swarmingStartMonth, swarmingEndMonth } = modal.swarming
    if (swarmingStartMonth === null || swarmingEndMonth === null) return true
    return swarmingStartMonth <= swarmingEndMonth
  }

  const filteredTaxons = useMemo(() => {
    const value = query.trim().toLowerCase()

    if (!value) return taxons

    return taxons.filter((taxon) => {
      const haystack = [taxon.subfamily, taxon.genus, taxon.species]
        .join(' ')
        .toLowerCase()
      return haystack.includes(value)
    })
  }, [query, taxons])

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
    setTaxonForm(EMPTY_TAXON_FORM)
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
      distribution: normalizeDistribution(taxon.distribution?.departments),
    })
  }

  const openDetailsModal = (taxon: Taxon) => {
    const distribution = normalizeDistribution(taxon.distribution?.departments)
    setModal({
      taxon,
      draft: buildTaxonDetailsDraft(taxon),
      swarming: {
        swarmingStartMonth: taxon.swarmingStartMonth,
        swarmingEndMonth: taxon.swarmingEndMonth,
      },
      invasive: taxon.invasive,
      distribution,
      confusions: (taxon.confusions ?? []).map((confusion) => ({
        confusedTaxonLabel: buildTaxonLabel(confusion.confusedTaxon),
        detail: confusion.detail,
      })),
      isSelectingSwarmingRange: false,
      selectionAnchorMonth: null,
    })
  }

  const closeDetailsModal = () => {
    setModal(INITIAL_MODAL_STATE)
  }

  const updateModalInvasive = (value: boolean) => {
    setModal((prev) => ({
      ...prev,
      invasive: value,
    }))
  }

  const updateSwarmingRange = (anchorMonth: number, currentMonth: number) => {
    setModal((prev) => ({
      ...prev,
      swarming: {
        swarmingStartMonth: Math.min(anchorMonth, currentMonth),
        swarmingEndMonth: Math.max(anchorMonth, currentMonth),
      },
    }))
  }

  const beginSwarmingRangeSelection = (month: number) => {
    setModal((prev) => ({
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
    if (
      !modal.isSelectingSwarmingRange ||
      modal.selectionAnchorMonth === null
    ) {
      return
    }
    updateSwarmingRange(modal.selectionAnchorMonth, month)
  }

  const endSwarmingRangeSelection = useCallback(() => {
    setModal((prev) => ({
      ...prev,
      isSelectingSwarmingRange: false,
      selectionAnchorMonth: null,
    }))
  }, [])

  const isMonthInSelectedRange = (month: number): boolean => {
    if (
      modal.swarming.swarmingStartMonth === null ||
      modal.swarming.swarmingEndMonth === null
    ) {
      return false
    }
    return (
      month >= modal.swarming.swarmingStartMonth &&
      month <= modal.swarming.swarmingEndMonth
    )
  }

  const isMonthRangeEndpoint = (month: number): boolean => {
    if (
      modal.swarming.swarmingStartMonth === null ||
      modal.swarming.swarmingEndMonth === null
    ) {
      return false
    }

    return (
      month === modal.swarming.swarmingStartMonth ||
      month === modal.swarming.swarmingEndMonth
    )
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

  const updateLevelDescription = (
    levelKey: keyof TaxonDetailsDraft,
    value: string,
  ) => {
    if (!modal.draft) return
    setModal((prev) => ({
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

  const updateCriterion = (
    levelKey: keyof TaxonDetailsDraft,
    index: number,
    value: string,
  ) => {
    if (!modal.draft) return
    const nextCriteria = [...modal.draft[levelKey].criteria]
    nextCriteria[index] = value
    setModal((prev) => ({
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

  const updateLevelSize = (
    levelKey: keyof TaxonDetailsDraft,
    casteKey: 'sizeWorker' | 'sizeQueen' | 'sizeMale',
    value: string,
  ) => {
    if (!modal.draft) return
    setModal((prev) => ({
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
    setModal((prev) => ({
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

  const removeCriterion = (
    levelKey: keyof TaxonDetailsDraft,
    index: number,
  ) => {
    if (!modal.draft) return
    setModal((prev) => ({
      ...prev,
      draft: {
        ...prev.draft!,
        [levelKey]: {
          ...prev.draft![levelKey],
          criteria: prev.draft![levelKey].criteria.filter(
            (_, currentIndex) => currentIndex !== index,
          ),
        },
      },
    }))
  }

  const moveCriterion = (
    levelKey: keyof TaxonDetailsDraft,
    index: number,
    direction: -1 | 1,
  ) => {
    if (!modal.draft) return

    const targetIndex = index + direction
    const criteria = modal.draft[levelKey].criteria
    if (targetIndex < 0 || targetIndex >= criteria.length) {
      return
    }

    const nextCriteria = [...criteria]
    ;[nextCriteria[index], nextCriteria[targetIndex]] = [
      nextCriteria[targetIndex],
      nextCriteria[index],
    ]

    setModal((prev) => ({
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

  const addConfusion = () => {
    setModal((prev) => ({
      ...prev,
      confusions: [...prev.confusions, { confusedTaxonLabel: '', detail: '' }],
    }))
  }

  const updateConfusion = (
    index: number,
    field: keyof ConfusionDraft,
    value: string,
  ) => {
    setModal((prev) => ({
      ...prev,
      confusions: prev.confusions.map((confusion, currentIndex) =>
        currentIndex === index ? { ...confusion, [field]: value } : confusion,
      ),
    }))
  }

  const removeConfusion = (index: number) => {
    setModal((prev) => ({
      ...prev,
      confusions: prev.confusions.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    }))
  }

  const resolveConfusions = () => {
    if (!modal.taxon) {
      return [] as { confusedTaxonId: string; detail: string }[]
    }

    const currentTaxonId = modal.taxon.id
    const resolved = modal.confusions
      .map((confusion) => {
        const matchedTaxon = taxonOptions.find(
          (option) => option.label === confusion.confusedTaxonLabel.trim(),
        )?.taxon
        return {
          confusedTaxonId: matchedTaxon?.id ?? '',
          detail: confusion.detail.trim(),
        }
      })
      .filter(
        (confusion) =>
          confusion.confusedTaxonId &&
          confusion.confusedTaxonId !== currentTaxonId &&
          confusion.detail,
      )

    return Array.from(
      new Map(
        resolved.map((confusion) => [confusion.confusedTaxonId, confusion]),
      ).values(),
    )
  }

  const saveDetailsModal = async () => {
    if (!modal.taxon || !modal.draft) return
    if (!validateSwarmingPeriod()) {
      alert("Période d'essaimage invalide")
      return
    }
    const hasEmptyCriteria = [
      'subfamily',
      'genus',
      'subgenus',
      'speciesGroup',
      'species',
    ].some((key) => {
      return modal.draft![key as keyof TaxonDetailsDraft].criteria.some(
        (c) => !c.trim(),
      )
    })
    if (hasEmptyCriteria) {
      alert('Les critères vides doivent être supprimés')
      return
    }

    const unresolvedConfusions = modal.confusions.filter((confusion) => {
      const label = confusion.confusedTaxonLabel.trim()
      if (!label || !confusion.detail.trim()) {
        return false
      }

      return !taxonOptions.some(
        (option) =>
          option.label === label && option.taxon.id !== modal.taxon?.id,
      )
    })

    if (unresolvedConfusions.length > 0) {
      alert(
        'Veuillez sélectionner un taxon existant pour chaque confusion et remplir le détail.',
      )
      return
    }

    try {
      await saveTaxonLevelDetails(
        modal.taxon.id,
        modal.draft,
        modal.invasive,
        modal.swarming,
        modal.distribution,
        resolveConfusions(),
      )
      closeDetailsModal()
    } catch (error) {
      console.error('Error saving taxon details:', error)
      alert("Erreur lors de l'enregistrement")
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
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Ajout / modification
        </h3>
        <form className="grid gap-2 md:grid-cols-6" onSubmit={submitTaxon}>
          <input
            className="rounded border p-2"
            placeholder="Sous-famille"
            value={taxonForm.subfamily}
            onChange={(e) => handleTaxonChange('subfamily', e.target.value)}
            required
          />
          <input
            className="rounded border p-2"
            placeholder="Tribu"
            value={taxonForm.tribe}
            onChange={(e) => handleTaxonChange('tribe', e.target.value)}
          />
          <input
            className="rounded border p-2"
            placeholder="Genre"
            value={taxonForm.genus}
            onChange={(e) => handleTaxonChange('genus', e.target.value)}
            required
          />
          <input
            className="rounded border p-2"
            placeholder="Sous-genre"
            value={taxonForm.subgenus}
            onChange={(e) => handleTaxonChange('subgenus', e.target.value)}
          />
          <input
            className="rounded border p-2"
            placeholder="Groupe d'espèces"
            value={taxonForm.speciesGroup}
            onChange={(e) => handleTaxonChange('speciesGroup', e.target.value)}
          />
          <input
            className="rounded border p-2"
            placeholder="Espèce"
            value={taxonForm.species}
            onChange={(e) => handleTaxonChange('species', e.target.value)}
            required
          />

          <div className="md:col-span-6 flex flex-wrap gap-2">
            <button
              className="rounded bg-slate-900 px-3 py-2 text-white"
              type="submit"
            >
              {selectedTaxonId ? 'Modifier taxon' : 'Créer taxon'}
            </button>
            {selectedTaxonId && (
              <button
                className="rounded bg-slate-100 px-3 py-2 text-slate-700"
                type="button"
                onClick={resetTaxonForm}
              >
                Annuler la modification
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Recherche / liste
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="h-10 min-w-[260px] flex-1 rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700 placeholder:text-slate-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Recherche (sous-famille, genre, espèce...)"
          />
        </div>

        <p className="mt-3 text-sm text-slate-600">
          {filteredTaxons.length} entrée{filteredTaxons.length > 1 ? 's' : ''}{' '}
          trouvée{filteredTaxons.length > 1 ? 's' : ''}
        </p>

        <div className="mt-4 max-h-[65vh] overflow-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-full table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700">
                <th className="sticky top-0 z-10 bg-white p-2">Sous-famille</th>
                <th className="sticky top-0 z-10 bg-white p-2">Tribu</th>
                <th className="sticky top-0 z-10 bg-white p-2">Genre</th>
                <th className="sticky top-0 z-10 bg-white p-2">Sous-genre</th>
                <th className="sticky top-0 z-10 bg-white p-2">
                  Groupe d'espèce
                </th>
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
                  <td
                    className="max-w-[180px] whitespace-nowrap p-2 overflow-hidden text-ellipsis"
                    title={taxon.subfamily}
                  >
                    {taxon.subfamily}
                  </td>
                  <td
                    className="max-w-[160px] whitespace-nowrap p-2 overflow-hidden text-ellipsis"
                    title={taxon.tribe ?? '-'}
                  >
                    {taxon.tribe ?? '-'}
                  </td>
                  <td
                    className="max-w-[160px] whitespace-nowrap p-2 overflow-hidden text-ellipsis"
                    title={taxon.genus}
                  >
                    <em>{taxon.genus}</em>
                  </td>
                  <td
                    className="max-w-[140px] whitespace-nowrap p-2 overflow-hidden text-ellipsis"
                    title={taxon.subgenus ? `(${taxon.subgenus})` : '-'}
                  >
                    {taxon.subgenus ? `(${taxon.subgenus})` : '-'}
                  </td>
                  <td
                    className="max-w-[180px] whitespace-nowrap p-2 overflow-hidden text-ellipsis"
                    title={taxon.speciesGroup ?? '-'}
                  >
                    {taxon.speciesGroup ?? '-'}
                  </td>
                  <td
                    className="max-w-[180px] whitespace-nowrap p-2 overflow-hidden text-ellipsis"
                    title={taxon.species}
                  >
                    <em>{taxon.species}</em>
                  </td>
                  <td className="p-2">
                    <button
                      className="rounded bg-indigo-50 px-2 py-1 text-indigo-700"
                      type="button"
                      onClick={() => openDetailsModal(taxon)}
                    >
                      Ouvrir
                    </button>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <AdminIconButton
                        title="Modifier"
                        onClick={() => loadTaxonInForm(taxon)}
                        icon={<EditIcon />}
                      />
                      <AdminIconButton
                        title="Supprimer"
                        tone="danger"
                        onClick={() => void handleDeleteTaxon(taxon.id)}
                        icon={<TrashIcon />}
                      />
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
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-4 shadow-xl"
            role="dialog"
            aria-labelledby="modal-title"
            aria-modal="true"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3
                id="modal-title"
                className="text-base font-semibold text-slate-900"
              >
                Critères et description — <em>{modal.taxon.genus}</em>{' '}
                <em>{modal.taxon.species}</em>
              </h3>
              <button
                className="rounded bg-slate-100 px-3 py-1 text-sm"
                type="button"
                onClick={closeDetailsModal}
                aria-label="Fermer la boîte de dialogue"
              >
                Fermer
              </button>
            </div>

            {(() => {
              const levelKeys: TaxonDetailLevelKey[] = ['subfamily', 'genus']
              if (modal.taxon.subgenus) {
                levelKeys.push('subgenus')
              }
              if (modal.taxon.speciesGroup) {
                levelKeys.push('speciesGroup')
              }
              levelKeys.push('species')

              return levelKeys.map((levelKey) => (
                <TaxonLevelEditor
                  key={levelKey}
                  levelKey={levelKey}
                  levelDraft={modal.draft![levelKey]}
                  taxon={modal.taxon!}
                  swarming={modal.swarming}
                  isMonthInSelectedRange={isMonthInSelectedRange}
                  isMonthRangeEndpoint={isMonthRangeEndpoint}
                  onBeginSwarmingRangeSelection={beginSwarmingRangeSelection}
                  onContinueSwarmingRangeSelection={
                    continueSwarmingRangeSelection
                  }
                  onEndSwarmingRangeSelection={endSwarmingRangeSelection}
                  onUpdateDescription={updateLevelDescription}
                  onUpdateSize={updateLevelSize}
                  onUpdateCriterion={updateCriterion}
                  onMoveCriterion={moveCriterion}
                  onRemoveCriterion={removeCriterion}
                  onAddCriterion={addCriterion}
                />
              ))
            })()}

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={modal.invasive}
                  onChange={(event) =>
                    updateModalInvasive(event.target.checked)
                  }
                />
                Espèce invasive
              </label>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Confusions possibles
                  </h4>
                  <p className="text-xs text-slate-600">
                    Indique les taxons proches et explique comment les
                    distinguer.
                  </p>
                </div>
                <button
                  className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200"
                  type="button"
                  onClick={addConfusion}
                >
                  + Ajouter une confusion
                </button>
              </div>

              <datalist id="taxon-confusion-options">
                {taxonOptions
                  .filter((option) => option.taxon.id !== modal.taxon?.id)
                  .map((option) => (
                    <option key={option.taxon.id} value={option.label} />
                  ))}
              </datalist>

              {modal.confusions.length > 0 ? (
                <div className="space-y-3">
                  {modal.confusions.map((confusion, index) => (
                    <div
                      key={`confusion-${index}`}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                            Taxon à confondre
                            <input
                              className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm"
                              list="taxon-confusion-options"
                              placeholder="Rechercher un taxon"
                              value={confusion.confusedTaxonLabel}
                              onChange={(event) =>
                                updateConfusion(
                                  index,
                                  'confusedTaxonLabel',
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <p className="mt-1 text-[11px] text-slate-500">
                            L’autocomplétion propose les taxons existants.
                          </p>
                        </div>
                        <button
                          className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700"
                          type="button"
                          onClick={() => removeConfusion(index)}
                        >
                          Supprimer
                        </button>
                      </div>
                      <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Pourquoi la confusion et comment éviter l’erreur ?
                        <textarea
                          className="mt-1 min-h-24 w-full rounded border border-slate-300 bg-white p-2 text-sm"
                          placeholder="Ex. couleur similaire, pilosité, taille… et le détail qui permet de les distinguer"
                          value={confusion.detail}
                          onChange={(event) =>
                            updateConfusion(index, 'detail', event.target.value)
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Aucune confusion renseignée pour le moment.
                </p>
              )}
            </div>

            {modal.taxon.levelDetails.species && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="block text-sm font-medium text-slate-700">
                    Aire de répartition
                  </label>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button
                      className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200"
                      type="button"
                      onClick={() =>
                        setModal((prev) => ({
                          ...prev,
                          distribution: [],
                        }))
                      }
                    >
                      Réinitialiser
                    </button>
                    <button
                      className="rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
                      type="button"
                      onClick={() =>
                        setModal((prev) => ({
                          ...prev,
                          distribution: [...ALL_FRENCH_DEPARTMENT_CODES],
                        }))
                      }
                    >
                      Toute la France
                    </button>
                  </div>
                </div>
                <FranceMap
                  selectedDepartments={modal.distribution}
                  onToggleDepartment={(departmentCode) => {
                    setModal((prev) => ({
                      ...prev,
                      distribution: prev.distribution.includes(departmentCode)
                        ? prev.distribution.filter(
                            (value) => value !== departmentCode,
                          )
                        : [...prev.distribution, departmentCode],
                    }))
                  }}
                />
              </div>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <button
                className="rounded bg-slate-100 px-3 py-2"
                type="button"
                onClick={closeDetailsModal}
              >
                Annuler
              </button>
              <button
                className="rounded bg-slate-900 px-3 py-2 text-white"
                type="button"
                onClick={() => void saveDetailsModal()}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
