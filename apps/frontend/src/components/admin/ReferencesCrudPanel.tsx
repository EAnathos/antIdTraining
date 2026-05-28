import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { ReferenceItem, Taxon } from '../../types/models'
import { AdminIconButton, EditIcon, TrashIcon } from './AdminIconButton'

type ReferenceForm = {
  title: string
  authors: string
  description: string
  type: 'WEBSITE' | 'MYRMECOLOGY'
  url: string
  taxonIds: string[]
}

type AuthorsTaxonsDraft = {
  authors: string[]
  taxonIds: string[]
}

type Props = {
  references: ReferenceItem[]
  taxons: Taxon[]
  referenceForm: ReferenceForm
  setReferenceForm: (value: ReferenceForm) => void
  selectedReferenceId: string
  setSelectedReferenceId: (value: string) => void
  createReference: (event: FormEvent) => Promise<void>
  updateReference: (event: FormEvent) => Promise<void>
  deleteReference: (id: string) => Promise<void>
  saveReferenceAuthorsAndTaxons: (
    authors: string[],
    taxonIds: string[],
  ) => Promise<boolean>
  saveReferenceAuthorsAndTaxonsById: (
    referenceId: string,
    authors: string[],
    taxonIds: string[],
  ) => Promise<boolean>
}

export function ReferencesCrudPanel({
  references,
  taxons,
  referenceForm,
  setReferenceForm,
  selectedReferenceId,
  setSelectedReferenceId,
  createReference,
  updateReference,
  deleteReference,
  saveReferenceAuthorsAndTaxons,
  saveReferenceAuthorsAndTaxonsById,
}: Props) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<
    'ALL' | 'WEBSITE' | 'MYRMECOLOGY'
  >('ALL')
  const [authorsTaxonsModalOpen, setAuthorsTaxonsModalOpen] = useState(false)
  const [authorsTaxonsDraft, setAuthorsTaxonsDraft] =
    useState<AuthorsTaxonsDraft | null>(null)
  const [authorsTaxonsModalReferenceId, setAuthorsTaxonsModalReferenceId] =
    useState<string | null>(null)
  const [selectedSubfamily, setSelectedSubfamily] = useState('')
  const [selectedGenus, setSelectedGenus] = useState('')
  const [selectedSpeciesGroup, setSelectedSpeciesGroup] = useState('')
  const [taxonQuery, setTaxonQuery] = useState('')

  const filteredReferences = useMemo(() => {
    const value = query.trim().toLowerCase()
    return references.filter((reference) => {
      if (typeFilter !== 'ALL' && reference.type !== typeFilter) {
        return false
      }

      if (!value) {
        return true
      }

      const haystack = [
        reference.title,
        reference.authors.join(' '),
        reference.description ?? '',
        reference.type,
        reference.url ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(value)
    })
  }, [query, references, typeFilter])

  const filteredTaxons = useMemo(() => {
    const value = taxonQuery.trim().toLowerCase()
    if (!value) return taxons
    return taxons.filter((taxon) => {
      const haystack = [
        taxon.subfamily,
        taxon.tribe ?? '',
        taxon.genus,
        taxon.subgenus ?? '',
        taxon.speciesGroup ?? '',
        taxon.species,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(value)
    })
  }, [taxonQuery, taxons])

  const subfamilyOptions = useMemo(
    () =>
      [...new Set(taxons.map((taxon) => taxon.subfamily))].sort((a, b) =>
        a.localeCompare(b, 'fr'),
      ),
    [taxons],
  )
  const genusOptions = useMemo(
    () =>
      [...new Set(taxons.map((taxon) => taxon.genus))].sort((a, b) =>
        a.localeCompare(b, 'fr'),
      ),
    [taxons],
  )
  const speciesGroupOptions = useMemo(
    () =>
      [
        ...new Set(
          taxons
            .map((taxon) => taxon.speciesGroup)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr')),
    [taxons],
  )

  function normalizeAuthors(values: string[]) {
    return values.map((value) => value.trim()).filter(Boolean)
  }

  function submitReference(event: FormEvent) {
    return selectedReferenceId ? updateReference(event) : createReference(event)
  }

  function resetReferenceForm() {
    setAuthorsTaxonsModalOpen(false)
    setAuthorsTaxonsDraft(null)
    setAuthorsTaxonsModalReferenceId(null)
    setSelectedReferenceId('')
    setReferenceForm({
      title: '',
      authors: '',
      description: '',
      type: 'WEBSITE',
      url: '',
      taxonIds: [],
    })
  }

  function loadReferenceInForm(reference: ReferenceItem) {
    setSelectedReferenceId(reference.id)
    setReferenceForm({
      title: reference.title,
      authors: reference.authors.join('\n'),
      description: reference.description ?? '',
      type: reference.type,
      url: reference.url ?? '',
      taxonIds: reference.taxons.map((taxon) => taxon.id),
    })
  }

  function openAuthorsTaxonsModal(reference?: ReferenceItem) {
    const draftFromReference = reference
      ? {
          authors: [...reference.authors],
          taxonIds: reference.taxons.map((taxon) => taxon.id),
        }
      : null

    if (referenceForm.type !== 'MYRMECOLOGY' && !reference) {
      return
    }

    if (reference && reference.type !== 'MYRMECOLOGY') {
      return
    }

    setAuthorsTaxonsDraft(
      draftFromReference ?? {
        authors: normalizeAuthors(referenceForm.authors.split(/\n/)),
        taxonIds: [...referenceForm.taxonIds],
      },
    )
    setAuthorsTaxonsModalReferenceId(reference?.id ?? null)
    setAuthorsTaxonsModalOpen(true)
  }

  function closeAuthorsTaxonsModal() {
    setAuthorsTaxonsModalOpen(false)
    setAuthorsTaxonsDraft(null)
    setAuthorsTaxonsModalReferenceId(null)
  }

  async function validateAuthorsTaxonsModal() {
    if (!authorsTaxonsDraft) {
      closeAuthorsTaxonsModal()
      return
    }

    const normalizedAuthors = normalizeAuthors(authorsTaxonsDraft.authors)
    const success = authorsTaxonsModalReferenceId
      ? await saveReferenceAuthorsAndTaxonsById(
          authorsTaxonsModalReferenceId,
          normalizedAuthors,
          authorsTaxonsDraft.taxonIds,
        )
      : await saveReferenceAuthorsAndTaxons(
          normalizedAuthors,
          authorsTaxonsDraft.taxonIds,
        )
    if (!success) {
      return
    }

    if (!authorsTaxonsModalReferenceId) {
      setReferenceForm({
        ...referenceForm,
        authors: normalizedAuthors.join('\n'),
        taxonIds: authorsTaxonsDraft.taxonIds,
      })
    }
    closeAuthorsTaxonsModal()
  }

  function toggleTaxonSelection(taxonId: string) {
    if (!authorsTaxonsDraft) return

    const alreadySelected = authorsTaxonsDraft.taxonIds.includes(taxonId)
    setAuthorsTaxonsDraft({
      ...authorsTaxonsDraft,
      taxonIds: alreadySelected
        ? authorsTaxonsDraft.taxonIds.filter((id) => id !== taxonId)
        : [...authorsTaxonsDraft.taxonIds, taxonId],
    })
  }

  function addTaxonsByPredicate(predicate: (taxon: Taxon) => boolean) {
    if (!authorsTaxonsDraft) return

    const groupIds = taxons.filter(predicate).map((taxon) => taxon.id)
    if (groupIds.length === 0) return

    setAuthorsTaxonsDraft({
      ...authorsTaxonsDraft,
      taxonIds: Array.from(
        new Set([...authorsTaxonsDraft.taxonIds, ...groupIds]),
      ),
    })
  }

  async function handleDeleteReference(id: string) {
    if (!window.confirm('Confirmer la suppression de cette référence ?')) {
      return
    }
    await deleteReference(id)
  }

  return (
    <div className="mt-3 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Ajout / modification
        </h3>
        <form className="grid gap-2 md:grid-cols-4" onSubmit={submitReference}>
          <input
            className="rounded border p-2"
            placeholder="Titre"
            value={referenceForm.title}
            onChange={(e) =>
              setReferenceForm({ ...referenceForm, title: e.target.value })
            }
            required
          />
          <input
            className="rounded border p-2 md:col-span-2"
            placeholder="Description"
            value={referenceForm.description}
            onChange={(e) =>
              setReferenceForm({
                ...referenceForm,
                description: e.target.value,
              })
            }
          />
          <select
            className="rounded border p-2"
            value={referenceForm.type}
            onChange={(e) => {
              const nextType = e.target.value as 'WEBSITE' | 'MYRMECOLOGY'
              if (nextType === 'WEBSITE') {
                setReferenceForm({
                  ...referenceForm,
                  type: nextType,
                  authors: '',
                  taxonIds: [],
                })
                setAuthorsTaxonsModalOpen(false)
                setAuthorsTaxonsDraft(null)
                return
              }

              setReferenceForm({ ...referenceForm, type: nextType })
            }}
          >
            <option value="WEBSITE">Site internet</option>
            <option value="MYRMECOLOGY">Référence myrmécologique</option>
          </select>
          <input
            className="rounded border p-2"
            placeholder={referenceForm.type === 'MYRMECOLOGY' ? 'DOI' : 'URL'}
            value={referenceForm.url}
            onChange={(e) =>
              setReferenceForm({ ...referenceForm, url: e.target.value })
            }
          />
          <div className="md:col-span-4 flex flex-wrap gap-2">
            <button
              className="rounded bg-slate-900 px-3 py-2 text-white"
              type="submit"
            >
              {selectedReferenceId ? 'Modifier référence' : 'Créer référence'}
            </button>
            {selectedReferenceId && (
              <button
                className="rounded bg-slate-100 px-3 py-2 text-slate-700"
                type="button"
                onClick={resetReferenceForm}
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
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700"
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'ALL' | 'WEBSITE' | 'MYRMECOLOGY')
            }
          >
            <option value="ALL">Tous les types</option>
            <option value="WEBSITE">Site internet</option>
            <option value="MYRMECOLOGY">Référence myrmécologique</option>
          </select>
          <input
            className="h-10 min-w-[260px] flex-1 rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700 placeholder:text-slate-500"
            placeholder="Rechercher une référence"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <ul className="mt-3 space-y-2 text-sm">
          {filteredReferences.map((reference) => (
            <li
              key={reference.id}
              className={`flex items-center justify-between gap-3 rounded border p-2 ${selectedReferenceId === reference.id ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white'}`}
            >
              <button
                className="flex-1 text-left"
                type="button"
                onClick={() => loadReferenceInForm(reference)}
              >
                {reference.type === 'WEBSITE'
                  ? reference.description
                    ? `${reference.title} — ${reference.description}`
                    : reference.title
                  : `${reference.title} — ${reference.authors.length > 0 ? `${reference.authors.length} auteur(s)` : 'sans auteur'} — ${reference.taxons.length} taxon(s)`}
              </button>
              <div className="flex items-center gap-2">
                {reference.type === 'MYRMECOLOGY' && (
                  <button
                    className="rounded bg-indigo-50 px-2 py-1 text-indigo-700"
                    type="button"
                    onClick={() => openAuthorsTaxonsModal(reference)}
                  >
                    Ouvrir
                  </button>
                )}
                <AdminIconButton
                  title="Modifier"
                  onClick={() => loadReferenceInForm(reference)}
                  icon={<EditIcon />}
                />
                <AdminIconButton
                  title="Supprimer"
                  tone="danger"
                  onClick={() => void handleDeleteReference(reference.id)}
                  icon={<TrashIcon />}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {authorsTaxonsModalOpen && authorsTaxonsDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeAuthorsTaxonsModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Auteurs et taxons liés — Référence myrmécologique
              </h3>
              <button
                className="rounded bg-slate-100 px-3 py-1 text-sm"
                type="button"
                onClick={closeAuthorsTaxonsModal}
              >
                Fermer
              </button>
            </div>

            <div className="space-y-3 rounded border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-700">Auteurs</p>
              <div className="space-y-2">
                {authorsTaxonsDraft.authors.map((author, index) => (
                  <div
                    key={`${index}-${author}`}
                    className="flex items-center gap-2"
                  >
                    <input
                      className="w-full rounded border p-2"
                      placeholder="Nom de l'auteur"
                      value={author}
                      onChange={(e) => {
                        const nextAuthors = [...authorsTaxonsDraft.authors]
                        nextAuthors[index] = e.target.value
                        setAuthorsTaxonsDraft({
                          ...authorsTaxonsDraft,
                          authors: nextAuthors,
                        })
                      }}
                    />
                    <button
                      className="rounded bg-slate-100 px-3 py-2 text-slate-700"
                      type="button"
                      onClick={() =>
                        setAuthorsTaxonsDraft({
                          ...authorsTaxonsDraft,
                          authors: authorsTaxonsDraft.authors.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        })
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="rounded bg-slate-100 px-3 py-2 text-slate-700"
                type="button"
                onClick={() =>
                  setAuthorsTaxonsDraft({
                    ...authorsTaxonsDraft,
                    authors: [...authorsTaxonsDraft.authors, ''],
                  })
                }
              >
                + Ajouter un auteur
              </button>
            </div>

            <div className="mt-4 space-y-2 rounded border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-700">
                Taxons concernés ({authorsTaxonsDraft.taxonIds.length})
              </p>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="flex gap-2">
                  <select
                    className="w-full rounded border p-2"
                    value={selectedSubfamily}
                    onChange={(e) => setSelectedSubfamily(e.target.value)}
                  >
                    <option value="">Sous-famille...</option>
                    {subfamilyOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded bg-slate-100 px-3 py-2 text-slate-700"
                    onClick={() =>
                      addTaxonsByPredicate(
                        (taxon) => taxon.subfamily === selectedSubfamily,
                      )
                    }
                    disabled={!selectedSubfamily}
                  >
                    Tout
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    className="w-full rounded border p-2"
                    value={selectedGenus}
                    onChange={(e) => setSelectedGenus(e.target.value)}
                  >
                    <option value="">Genre...</option>
                    {genusOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded bg-slate-100 px-3 py-2 text-slate-700"
                    onClick={() =>
                      addTaxonsByPredicate(
                        (taxon) => taxon.genus === selectedGenus,
                      )
                    }
                    disabled={!selectedGenus}
                  >
                    Tout
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    className="w-full rounded border p-2"
                    value={selectedSpeciesGroup}
                    onChange={(e) => setSelectedSpeciesGroup(e.target.value)}
                  >
                    <option value="">Groupe d'espèces...</option>
                    {speciesGroupOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded bg-slate-100 px-3 py-2 text-slate-700"
                    onClick={() =>
                      addTaxonsByPredicate(
                        (taxon) => taxon.speciesGroup === selectedSpeciesGroup,
                      )
                    }
                    disabled={!selectedSpeciesGroup}
                  >
                    Tout
                  </button>
                </div>
              </div>
              <input
                className="w-full rounded border p-2"
                placeholder="Filtrer les taxons"
                value={taxonQuery}
                onChange={(e) => setTaxonQuery(e.target.value)}
              />
              <div className="max-h-56 space-y-1 overflow-auto rounded border border-slate-200 p-2">
                {filteredTaxons.map((taxon) => {
                  const label = `${taxon.subfamily} > ${taxon.genus} > ${taxon.species}`
                  return (
                    <label
                      key={taxon.id}
                      className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={authorsTaxonsDraft.taxonIds.includes(taxon.id)}
                        onChange={() => toggleTaxonSelection(taxon.id)}
                      />
                      <span>{label}</span>
                    </label>
                  )
                })}
              </div>

              <div className="flex justify-between gap-2">
                <button
                  className="rounded bg-slate-100 px-3 py-2 text-slate-700"
                  type="button"
                  onClick={() =>
                    setAuthorsTaxonsDraft({
                      ...authorsTaxonsDraft,
                      taxonIds: [],
                    })
                  }
                >
                  Vider taxons
                </button>
                <div className="flex gap-2">
                  <button
                    className="rounded bg-slate-100 px-3 py-2 text-slate-700"
                    type="button"
                    onClick={closeAuthorsTaxonsModal}
                  >
                    Annuler
                  </button>
                  <button
                    className="rounded bg-slate-900 px-3 py-2 text-white"
                    type="button"
                    onClick={() => void validateAuthorsTaxonsModal()}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
