import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { api } from '../../lib/api'
import { getResponsiveImageProps } from '../../lib/image'
import { FRENCH_DEPARTMENTS } from '../../lib/frenchDepartments'
import type { Entry } from '../../types/models'
import { AdminIconButton, EditIcon, TrashIcon } from './AdminIconButton'
import { resolveImageUrl } from '../../lib/imageUrl'
import { parseDepartmentInput } from './entriesHelpers'

const departmentOptions = Object.entries(FRENCH_DEPARTMENTS)
  .filter(([code]) => code !== 'IDF')
  .map(([code, info]) => ({ code, name: info.name }))

type SpeciesMetadata = {
  subgenus?: string | null
  speciesGroup?: string | null
}

type EntryCaste = NonNullable<Entry['caste']>

type EntryForm = {
  subfamily: string
  genus: string
  subgenus: string
  species: string
  speciesGroup: string
  department: string
  observedAt: string
  biotope: string
  photoCredit: string
  caste: EntryCaste | ''
}

const emptyEntryForm: EntryForm = {
  subfamily: '',
  genus: '',
  subgenus: '',
  species: '',
  speciesGroup: '',
  department: '',
  observedAt: '',
  biotope: '',
  photoCredit: '',
  caste: '',
}

type Props = {
  entries: Entry[]
  entriesPage: number
  entriesLimit: number
  entriesTotal: number
  entriesPages: number
  setEntriesPage: (value: number) => void
  setEntriesLimit: (value: number) => void
  subfamilies: string[]
  entryForm: EntryForm
  setEntryForm: (value: EntryForm) => void
  selectedEntryId: string
  setSelectedEntryId: (value: string) => void
  setEntryFiles: (value: FileList | null) => void
  createEntry: (event: FormEvent) => Promise<void>
  updateEntry: (event: FormEvent) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  reorderEntryImages: (entryId: string, imageIds: string[]) => Promise<void>
}

export function EntriesCrudPanel({
  entries,
  entriesPage,
  entriesLimit,
  entriesTotal,
  entriesPages,
  setEntriesPage,
  setEntriesLimit,
  subfamilies,
  entryForm,
  setEntryForm,
  selectedEntryId,
  setSelectedEntryId,
  setEntryFiles,
  createEntry,
  updateEntry,
  deleteEntry,
  reorderEntryImages,
}: Props) {
  const [reordering, setReordering] = useState<Record<string, boolean>>({})
  const [dragging, setDragging] = useState<{
    entryId: string
    index: number
  } | null>(null)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'taxon'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [previewImage, setPreviewImage] = useState<{
    images: string[]
    index: number
    alt: string
  } | null>(null)
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterCaste, setFilterCaste] = useState('')
  const [filterPhotoCredit, setFilterPhotoCredit] = useState('')
  const [generaOptions, setGeneraOptions] = useState<string[]>([])
  const [subgenusOptions, setSubgenusOptions] = useState<string[]>([])
  const [speciesGroupOptions, setSpeciesGroupOptions] = useState<string[]>([])
  const [speciesOptions, setSpeciesOptions] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formContainerRef = useRef<HTMLDivElement | null>(null)

  function patchEntryForm(patch: Partial<EntryForm>) {
    setEntryForm({ ...entryForm, ...patch })
  }

  function renderEntryTaxonLabel(entry: Entry) {
    if (entry.taxonLevel === 'SPECIES' && entry.genus && entry.species) {
      return (
        <>
          <em>{entry.genus}</em> <em>{entry.species}</em>
        </>
      )
    }

    if (entry.taxonLevel === 'GENUS' && entry.genus) {
      return <em>{entry.genus}</em>
    }

    return entry.subfamily
  }

  function openPreview(images: string[], index: number, alt: string) {
    if (!images.length) return
    setPreviewImage({ images, index, alt })
  }

  function showPreviousPreviewImage() {
    setPreviewImage((current) => {
      if (!current || current.images.length <= 1) return current
      return {
        ...current,
        index:
          (current.index - 1 + current.images.length) % current.images.length,
      }
    })
  }

  function showNextPreviewImage() {
    setPreviewImage((current) => {
      if (!current || current.images.length <= 1) return current
      return {
        ...current,
        index: (current.index + 1) % current.images.length,
      }
    })
  }

  async function handleSpeciesSelectChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    const genus = entryForm.genus
    const baseForm = { ...entryForm, species: value }
    setEntryForm(baseForm)

    if (!value || !genus) return

    try {
      const { data } = await api.get<SpeciesMetadata>(
        '/taxons/species-metadata',
        {
          params: { genus, species: value },
        },
      )

      setEntryForm({
        ...baseForm,
        subgenus: data.subgenus ?? '',
        speciesGroup: data.speciesGroup ?? '',
      })
    } catch {
      // ignore errors — suggestions are optional
    }
  }

  useEffect(() => {
    let cancelled = false

    if (!entryForm.subfamily) {
      setGeneraOptions([])
      return () => {
        cancelled = true
      }
    }

    void api
      .get<string[]>('/taxons/genera', {
        params: {
          subfamily: entryForm.subfamily,
        },
      })
      .then(({ data }) => {
        if (!cancelled) {
          setGeneraOptions(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeneraOptions([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [entryForm.subfamily])

  useEffect(() => {
    let cancelled = false
    if (!entryForm.genus) {
      setSpeciesOptions([])
      setSubgenusOptions([])
      setSpeciesGroupOptions([])
      return () => {
        cancelled = true
      }
    }

    void Promise.all([
      api.get<string[]>('/taxons/species', {
        params: { genus: entryForm.genus },
      }),
      api.get<string[]>('/taxons/subgenera', {
        params: { genus: entryForm.genus },
      }),
      api.get<string[]>('/taxons/species-groups', {
        params: { genus: entryForm.genus },
      }),
    ])
      .then(([speciesRes, subgenusRes, groupRes]) => {
        if (!cancelled) {
          setSpeciesOptions(speciesRes.data)
          setSubgenusOptions(subgenusRes.data)
          setSpeciesGroupOptions(groupRes.data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSpeciesOptions([])
          setSubgenusOptions([])
          setSpeciesGroupOptions([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [entryForm.genus])

  async function handleDeleteEntry(id: string) {
    if (!window.confirm('Confirmer la suppression de cette entrée ?')) {
      return
    }
    await deleteEntry(id)
  }

  const filteredEntries = useMemo(() => {
    let result = [...entries]

    // Search filter
    const searchValue = query.trim().toLowerCase()
    if (searchValue) {
      result = result.filter((entry) => {
        const haystack = [
          entry.subfamily,
          entry.genus ?? '',
          entry.species ?? '',
          entry.taxonValue,
          entry.department,
          entry.biotope,
          entry.photoCredit,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(searchValue)
      })
    }

    // Department filter
    if (filterDepartment) {
      result = result.filter((entry) =>
        entry.department.includes(filterDepartment),
      )
    }

    // Caste filter
    if (filterCaste) {
      result = result.filter((entry) => entry.caste === filterCaste)
    }

    // Photo credit filter
    if (filterPhotoCredit) {
      result = result.filter((entry) =>
        entry.photoCredit
          .toLowerCase()
          .includes(filterPhotoCredit.toLowerCase()),
      )
    }

    return result
  }, [entries, query, filterDepartment, filterCaste, filterPhotoCredit])

  const sortedEntries = useMemo(() => {
    const list = [...filteredEntries]
    list.sort((a, b) => {
      if (sortBy === 'date') {
        const da = new Date(a.observedAt).getTime()
        const db = new Date(b.observedAt).getTime()
        return sortOrder === 'asc' ? da - db : db - da
      }

      // taxon sort: subfamily, genus, species
      const ka =
        `${a.subfamily}\u0000${a.genus ?? ''}\u0000${a.species ?? ''}`.toLowerCase()
      const kb =
        `${b.subfamily}\u0000${b.genus ?? ''}\u0000${b.species ?? ''}`.toLowerCase()
      if (ka < kb) return sortOrder === 'asc' ? -1 : 1
      if (ka > kb) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [filteredEntries, sortBy, sortOrder])

  function submitEntry(event: FormEvent) {
    setIsSubmitting(true)
    const promise = selectedEntryId ? updateEntry(event) : createEntry(event)
    return promise.finally(() => setIsSubmitting(false))
  }

  function resetEntryForm() {
    setSelectedEntryId('')
    setEntryForm(emptyEntryForm)
  }

  function loadEntryInForm(entry: Entry) {
    setSelectedEntryId(entry.id)
    setEntryForm({
      subfamily: entry.subfamily,
      genus: entry.genus ?? '',
      subgenus: entry.subgenus ?? '',
      species: entry.species ?? '',
      speciesGroup: entry.speciesGroup ?? '',
      department: entry.department,
      observedAt: entry.observedAt.slice(0, 10),
      biotope: entry.biotope,
      photoCredit: entry.photoCredit,
      caste: entry.caste ?? '',
    })
    setEntryFiles(null)
    formContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="mt-3 space-y-4">
      <div
        ref={formContainerRef}
        className="surface-panel surface-panel--solid p-3 sm:p-4"
      >
        <h3 className="mb-3 text-sm font-semibold text-[color:var(--app-text)]">
          Ajout / modification
        </h3>
        <form className="space-y-4" onSubmit={submitEntry}>
          <div className="surface-panel surface-panel--solid p-3 sm:p-4">
            <h4 className="mb-3 text-sm font-semibold text-[color:var(--app-text)]">
              Sélection du taxon
            </h4>
            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="ui-select w-full"
                value={entryForm.subfamily}
                onChange={(e) =>
                  patchEntryForm({
                    subfamily: e.target.value,
                    genus: '',
                    species: '',
                    subgenus: '',
                    speciesGroup: '',
                  })
                }
                required
              >
                <option value="">Sous-famille</option>
                {subfamilies.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                className="ui-select w-full"
                value={entryForm.genus}
                onChange={(e) =>
                  patchEntryForm({
                    genus: e.target.value,
                    species: '',
                    subgenus: '',
                    speciesGroup: '',
                  })
                }
                disabled={!entryForm.subfamily}
              >
                <option value="">Genre (optionnel)</option>
                {generaOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                className="ui-select w-full"
                value={entryForm.subgenus}
                onChange={(e) =>
                  patchEntryForm({ subgenus: e.target.value, species: '' })
                }
                disabled={!entryForm.genus}
              >
                <option value="">Sous-genre (optionnel)</option>
                {subgenusOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                className="ui-select w-full"
                value={entryForm.speciesGroup}
                onChange={(e) =>
                  patchEntryForm({ speciesGroup: e.target.value, species: '' })
                }
                disabled={!entryForm.genus}
              >
                <option value="">Groupe d'espèce (optionnel)</option>
                {speciesGroupOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                className="ui-select w-full"
                value={entryForm.species}
                onChange={handleSpeciesSelectChange}
                disabled={!entryForm.genus}
              >
                <option value="">Espèce (optionnel)</option>
                {speciesOptions.map((value) => (
                  <option key={`${entryForm.genus}-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                className="ui-select w-full"
                value={entryForm.caste}
                onChange={(e) =>
                  patchEntryForm({ caste: e.target.value as EntryCaste | '' })
                }
                required
              >
                <option value="">Choisir la caste</option>
                <option value="WORKER">Ouvrière</option>
                <option value="QUEEN">Reine</option>
                <option value="MALE">Mâle</option>
              </select>
            </div>
          </div>

          <div className="surface-panel surface-panel--solid p-3 sm:p-4">
            <h4 className="mb-3 text-sm font-semibold text-[color:var(--app-text)]">
              Détails de l'observation
            </h4>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="ui-select w-full"
                list="department-suggestions"
                placeholder="Département (ex: 53 - Mayenne, 2A, 974)"
                value={entryForm.department}
                onChange={(e) => patchEntryForm({ department: e.target.value })}
                onBlur={(e) =>
                  patchEntryForm({
                    department: parseDepartmentInput(e.target.value),
                  })
                }
                required
              />
              <datalist id="department-suggestions">
                {departmentOptions.map((department) => (
                  <option
                    key={department.code}
                    value={`${department.code} - ${department.name}`}
                  />
                ))}
              </datalist>
              <input
                className="ui-select w-full"
                type="date"
                value={entryForm.observedAt}
                onChange={(e) => patchEntryForm({ observedAt: e.target.value })}
                required
              />
              <input
                className="ui-select w-full"
                placeholder="Biotope"
                value={entryForm.biotope}
                onChange={(e) => patchEntryForm({ biotope: e.target.value })}
                required
              />
              <input
                className="ui-select w-full"
                placeholder="Crédit photo"
                value={entryForm.photoCredit}
                onChange={(e) =>
                  patchEntryForm({ photoCredit: e.target.value })
                }
                required
              />
              <div className="space-y-1">
                <input
                  className="ui-select w-full"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setEntryFiles(e.target.files)}
                />
                <p className="text-xs text-[color:var(--app-text-soft)]">
                  Images: 8 Mo max par fichier (jusqu’à 3).
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              className="ui-action ui-action--primary w-full disabled:cursor-not-allowed sm:w-auto"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {selectedEntryId ? 'Modifier entrée' : 'Créer entrée'}
            </button>
            {selectedEntryId && (
              <button
                className="ui-action ui-action--secondary sm:w-auto"
                type="button"
                onClick={resetEntryForm}
                disabled={isSubmitting}
              >
                Annuler la modification
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="surface-panel surface-panel--solid p-3 sm:p-4">
        <h3 className="mb-3 text-sm font-semibold text-[color:var(--app-text)]">
          Recherche / liste
        </h3>
        <div className="space-y-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="ui-input min-w-0 flex-1 p-2"
              placeholder="Rechercher une entrée"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <label className="text-sm text-[color:var(--app-text-muted)] sm:whitespace-nowrap">
              Trier
              <select
                className="ui-select ml-2 py-1"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'taxon')}
              >
                <option value="date">Date</option>
                <option value="taxon">Taxon</option>
              </select>
            </label>

            <button
              title="Inverser l'ordre"
              className="ui-action ui-action--secondary"
              onClick={() =>
                setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc'))
              }
              type="button"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              className="ui-select w-full py-1 text-sm sm:w-auto"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="">Tous les depts</option>
              {Array.from(new Set(entries.map((e) => e.department)))
                .sort()
                .map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
            </select>

            <select
              className="ui-select w-full py-1 text-sm sm:w-auto"
              value={filterCaste}
              onChange={(e) => setFilterCaste(e.target.value)}
            >
              <option value="">Toutes les castes</option>
              <option value="WORKER">Ouvrière</option>
              <option value="QUEEN">Reine</option>
              <option value="MALE">Mâle</option>
            </select>

            <input
              className="ui-input w-full py-1 text-sm sm:w-auto"
              placeholder="Crédit photo"
              value={filterPhotoCredit}
              onChange={(e) => setFilterPhotoCredit(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-2 mt-3 flex flex-col gap-3 text-sm text-[color:var(--app-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            <strong>{sortedEntries.length}</strong> entrée
            {sortedEntries.length !== 1 ? 's' : ''} affichée
            {sortedEntries.length !== 1 ? 's' : ''} sur{' '}
            <strong>{entriesTotal}</strong>
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex items-center gap-2 sm:whitespace-nowrap">
              <span>Par page</span>
              <select
                className="ui-select py-1"
                value={entriesLimit}
                onChange={(e) => {
                  setEntriesPage(1)
                  setEntriesLimit(Number.parseInt(e.target.value, 10))
                }}
              >
                {[25, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1 self-start sm:self-auto">
              <button
                type="button"
                className="ui-action ui-action--secondary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={entriesPage <= 1}
                onClick={() => setEntriesPage(Math.max(1, entriesPage - 1))}
              >
                Préc.
              </button>
              <span className="px-1 text-xs sm:text-sm">
                {entriesPage} / {Math.max(1, entriesPages)}
              </span>
              <button
                type="button"
                className="ui-action ui-action--secondary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={entriesPage >= entriesPages}
                onClick={() =>
                  setEntriesPage(Math.min(entriesPages, entriesPage + 1))
                }
              >
                Suiv.
              </button>
            </div>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          {sortedEntries.map((entry) => (
            <li
              key={entry.id}
              className={`rounded-lg border p-2 sm:p-3 ${selectedEntryId === entry.id ? 'border-[color:var(--app-primary)] bg-[color:var(--app-primary-soft)]' : 'border-[color:var(--app-border)] bg-[color:var(--app-surface)]'}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <button
                  className="flex-1 text-left"
                  type="button"
                  onClick={() => loadEntryInForm(entry)}
                >
                  {renderEntryTaxonLabel(entry)} - {entry.department} -{' '}
                  {new Date(entry.observedAt).toLocaleDateString('fr-FR')}
                  <span className="mt-1 block text-xs text-[color:var(--app-text-muted)]">
                    Biotope: {entry.biotope}
                  </span>
                  <span className="block text-xs text-[color:var(--app-text-muted)]">
                    Crédit photo: {entry.photoCredit}
                  </span>
                </button>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <AdminIconButton
                    title="Modifier"
                    onClick={() => loadEntryInForm(entry)}
                    icon={<EditIcon />}
                  />
                  <AdminIconButton
                    title="Supprimer"
                    tone="danger"
                    onClick={() => void handleDeleteEntry(entry.id)}
                    icon={<TrashIcon />}
                  />
                </div>
              </div>

              {entry.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.images.map((image, idx) => (
                    <div
                      key={image.id}
                      className={`flex items-center gap-2 ${dragging && dragging.entryId === entry.id && dragging.index === idx ? 'opacity-50' : ''} ${reordering[entry.id] ? 'pointer-events-none opacity-70' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(idx))
                        e.dataTransfer.effectAllowed = 'move'
                        setDragging({ entryId: entry.id, index: idx })
                      }}
                      onDragEnd={() => setDragging(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault()
                        const from = Number(
                          e.dataTransfer.getData('text/plain'),
                        )
                        const to = idx
                        if (Number.isNaN(from) || from === to) {
                          setDragging(null)
                          return
                        }

                        setReordering((s) => ({ ...s, [entry.id]: true }))
                        try {
                          const ids = entry.images.map((i) => i.id)
                          const moved = ids.splice(from, 1)[0]
                          ids.splice(to, 0, moved)
                          await reorderEntryImages(entry.id, ids)
                        } finally {
                          setReordering((s) => ({ ...s, [entry.id]: false }))
                          setDragging(null)
                        }
                      }}
                    >
                      <img
                        src={resolveImageUrl(image.imageUrl)}
                        alt={entry.taxonValue}
                        className={`h-16 w-16 rounded border object-cover ${reordering[entry.id] ? 'cursor-wait' : 'cursor-grab'}`}
                        loading="lazy"
                        decoding="async"
                        width={64}
                        height={64}
                        onClick={() =>
                          openPreview(
                            entry.images.map((entryImage) =>
                              resolveImageUrl(entryImage.imageUrl),
                            ),
                            entry.images.findIndex(
                              (entryImage) => entryImage.id === image.id,
                            ),
                            entry.taxonValue,
                          )
                        }
                      />
                      {reordering[entry.id] && idx === 0 && (
                        <span className="text-xs text-[color:var(--app-text-soft)]">
                          Réordonnancement…
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute -right-2 -top-2 rounded-sm bg-[color:var(--app-surface)] px-2 py-1 text-xs font-semibold text-[color:var(--app-text)] shadow"
              onClick={() => setPreviewImage(null)}
            >
              Fermer
            </button>

            <button
              type="button"
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-sm bg-[color:var(--app-surface)] p-1.5 text-[color:var(--app-text)] shadow disabled:cursor-not-allowed disabled:opacity-40 sm:-left-14 sm:px-3 sm:py-2 sm:text-lg"
              onClick={showPreviousPreviewImage}
              disabled={previewImage.images.length <= 1}
              aria-label="Image précédente"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm bg-[color:var(--app-surface)] p-1.5 text-[color:var(--app-text)] shadow disabled:cursor-not-allowed disabled:opacity-40 sm:-right-14 sm:px-3 sm:py-2 sm:text-lg"
              onClick={showNextPreviewImage}
              disabled={previewImage.images.length <= 1}
              aria-label="Image suivante"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            <img
              {...getResponsiveImageProps(
                previewImage.images[previewImage.index],
                {
                  sizes: '(max-width: 768px) 90vw, 50vw',
                },
              )}
              alt={previewImage.alt}
              className="max-h-[85vh] max-w-[90vw] rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface)] object-contain"
              decoding="async"
            />

            <p className="mt-2 text-center text-xs text-[color:var(--app-text-inverse)]">
              Image {previewImage.index + 1}/{previewImage.images.length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
