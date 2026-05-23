import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { api, backendOrigin } from '../../lib/api'
import { getResponsiveImageProps } from '../../lib/image'
import type { Entry } from '../../types/models'
import { AdminIconButton, EditIcon, TrashIcon } from './AdminIconButton'

const departmentOptions = [
  { code: '01', name: 'Ain' },
  { code: '02', name: 'Aisne' },
  { code: '03', name: 'Allier' },
  { code: '04', name: 'Alpes-de-Haute-Provence' },
  { code: '05', name: 'Hautes-Alpes' },
  { code: '06', name: 'Alpes-Maritimes' },
  { code: '07', name: 'Ardèche' },
  { code: '08', name: 'Ardennes' },
  { code: '09', name: 'Ariège' },
  { code: '10', name: 'Aube' },
  { code: '11', name: 'Aude' },
  { code: '12', name: 'Aveyron' },
  { code: '13', name: 'Bouches-du-Rhône' },
  { code: '14', name: 'Calvados' },
  { code: '15', name: 'Cantal' },
  { code: '16', name: 'Charente' },
  { code: '17', name: 'Charente-Maritime' },
  { code: '18', name: 'Cher' },
  { code: '19', name: 'Corrèze' },
  { code: '2A', name: 'Corse-du-Sud' },
  { code: '2B', name: 'Haute-Corse' },
  { code: '21', name: "Côte-d'Or" },
  { code: '22', name: "Côtes-d'Armor" },
  { code: '23', name: 'Creuse' },
  { code: '24', name: 'Dordogne' },
  { code: '25', name: 'Doubs' },
  { code: '26', name: 'Drôme' },
  { code: '27', name: 'Eure' },
  { code: '28', name: 'Eure-et-Loir' },
  { code: '29', name: 'Finistère' },
  { code: '30', name: 'Gard' },
  { code: '31', name: 'Haute-Garonne' },
  { code: '32', name: 'Gers' },
  { code: '33', name: 'Gironde' },
  { code: '34', name: 'Hérault' },
  { code: '35', name: 'Ille-et-Vilaine' },
  { code: '36', name: 'Indre' },
  { code: '37', name: 'Indre-et-Loire' },
  { code: '38', name: 'Isère' },
  { code: '39', name: 'Jura' },
  { code: '40', name: 'Landes' },
  { code: '41', name: 'Loir-et-Cher' },
  { code: '42', name: 'Loire' },
  { code: '43', name: 'Haute-Loire' },
  { code: '44', name: 'Loire-Atlantique' },
  { code: '45', name: 'Loiret' },
  { code: '46', name: 'Lot' },
  { code: '47', name: 'Lot-et-Garonne' },
  { code: '48', name: 'Lozère' },
  { code: '49', name: 'Maine-et-Loire' },
  { code: '50', name: 'Manche' },
  { code: '51', name: 'Marne' },
  { code: '52', name: 'Haute-Marne' },
  { code: '53', name: 'Mayenne' },
  { code: '54', name: 'Meurthe-et-Moselle' },
  { code: '55', name: 'Meuse' },
  { code: '56', name: 'Morbihan' },
  { code: '57', name: 'Moselle' },
  { code: '58', name: 'Nièvre' },
  { code: '59', name: 'Nord' },
  { code: '60', name: 'Oise' },
  { code: '61', name: 'Orne' },
  { code: '62', name: 'Pas-de-Calais' },
  { code: '63', name: 'Puy-de-Dôme' },
  { code: '64', name: 'Pyrénées-Atlantiques' },
  { code: '65', name: 'Hautes-Pyrénées' },
  { code: '66', name: 'Pyrénées-Orientales' },
  { code: '67', name: 'Bas-Rhin' },
  { code: '68', name: 'Haut-Rhin' },
  { code: '69', name: 'Rhône' },
  { code: '70', name: 'Haute-Saône' },
  { code: '71', name: 'Saône-et-Loire' },
  { code: '72', name: 'Sarthe' },
  { code: '73', name: 'Savoie' },
  { code: '74', name: 'Haute-Savoie' },
  { code: '75', name: 'Paris' },
  { code: '76', name: 'Seine-Maritime' },
  { code: '77', name: 'Seine-et-Marne' },
  { code: '78', name: 'Yvelines' },
  { code: '79', name: 'Deux-Sèvres' },
  { code: '80', name: 'Somme' },
  { code: '81', name: 'Tarn' },
  { code: '82', name: 'Tarn-et-Garonne' },
  { code: '83', name: 'Var' },
  { code: '84', name: 'Vaucluse' },
  { code: '85', name: 'Vendée' },
  { code: '86', name: 'Vienne' },
  { code: '87', name: 'Haute-Vienne' },
  { code: '88', name: 'Vosges' },
  { code: '89', name: 'Yonne' },
  { code: '90', name: 'Territoire de Belfort' },
  { code: '91', name: 'Essonne' },
  { code: '92', name: 'Hauts-de-Seine' },
  { code: '93', name: 'Seine-Saint-Denis' },
  { code: '94', name: 'Val-de-Marne' },
  { code: '95', name: "Val-d'Oise" },
  { code: '971', name: 'Guadeloupe' },
  { code: '972', name: 'Martinique' },
  { code: '973', name: 'Guyane' },
  { code: '974', name: 'La Réunion' },
  { code: '976', name: 'Mayotte' },
]

function normalizeDepartment(value: string) {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, '')
  if (!cleaned) return ''
  if (cleaned === '2A' || cleaned === '2B') return cleaned
  if (/^\d{1,3}$/.test(cleaned)) {
    if (cleaned.length <= 2) return cleaned.padStart(2, '0')
    return cleaned
  }
  return value.trim()
}

function parseDepartmentInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const matchCodeWithLabel = trimmed.match(/^(\d{1,3}|2A|2B)\s*[-–—]/i)
  if (matchCodeWithLabel) {
    return normalizeDepartment(matchCodeWithLabel[1])
  }

  if (/^(\d{1,3}|2A|2B)$/i.test(trimmed)) {
    return normalizeDepartment(trimmed)
  }

  return trimmed
}

function resolveImageUrl(imageUrl: string) {
  if (!imageUrl) {
    return imageUrl
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  return `${backendOrigin}${imageUrl}`
}

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
  const [dragging, setDragging] = useState<{ entryId: string; index: number } | null>(null)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'taxon'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [previewImage, setPreviewImage] = useState<{ images: string[]; index: number; alt: string } | null>(null)
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
        index: (current.index - 1 + current.images.length) % current.images.length,
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
      const { data } = await api.get<SpeciesMetadata>('/taxons/species-metadata', {
        params: { genus, species: value },
      })

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
      api.get<string[]>('/taxons/species', { params: { genus: entryForm.genus } }),
      api.get<string[]>('/taxons/subgenera', { params: { genus: entryForm.genus } }),
      api.get<string[]>('/taxons/species-groups', { params: { genus: entryForm.genus } }),
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
        const haystack = [entry.subfamily, entry.genus ?? '', entry.species ?? '', entry.taxonValue, entry.department, entry.biotope, entry.photoCredit].join(' ').toLowerCase()
        return haystack.includes(searchValue)
      })
    }
    
    // Department filter
    if (filterDepartment) {
      result = result.filter((entry) => entry.department.includes(filterDepartment))
    }
    
    // Caste filter
    if (filterCaste) {
      result = result.filter((entry) => entry.caste === filterCaste)
    }
    
    // Photo credit filter
    if (filterPhotoCredit) {
      result = result.filter((entry) => entry.photoCredit.toLowerCase().includes(filterPhotoCredit.toLowerCase()))
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
      const ka = `${a.subfamily}\u0000${a.genus ?? ''}\u0000${a.species ?? ''}`.toLowerCase()
      const kb = `${b.subfamily}\u0000${b.genus ?? ''}\u0000${b.species ?? ''}`.toLowerCase()
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
    formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mt-3 space-y-4">
      <div ref={formContainerRef} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Ajout / modification</h3>
        <form className="space-y-4" onSubmit={submitEntry}>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Sélection du taxon</h4>
            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="rounded border p-2"
                value={entryForm.subfamily}
                onChange={(e) => patchEntryForm({ subfamily: e.target.value, genus: '', species: '', subgenus: '' })}
                required
              >
                <option value="">Sous-famille</option>
                {subfamilies.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={entryForm.genus}
                onChange={(e) => patchEntryForm({ genus: e.target.value, species: '', subgenus: '' })}
                disabled={!entryForm.subfamily}
              >
                <option value="">Genre (optionnel)</option>
                {generaOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={entryForm.subgenus}
                onChange={(e) => patchEntryForm({ subgenus: e.target.value })}
                disabled={!entryForm.genus}
              >
                <option value="">Sous-genre (optionnel)</option>
                {subgenusOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={entryForm.speciesGroup}
                onChange={(e) => patchEntryForm({ speciesGroup: e.target.value })}
                disabled={!entryForm.genus}
              >
                <option value="">Groupe d'espèce (optionnel)</option>
                {speciesGroupOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={entryForm.species}
                onChange={handleSpeciesSelectChange}
                disabled={!entryForm.genus}
              >
                <option value="">Espèce (optionnel)</option>
                {speciesOptions.map((value) => (
                  <option key={`${entryForm.genus}-${value}`} value={value}>{value}</option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={entryForm.caste}
                onChange={(e) => patchEntryForm({ caste: e.target.value as EntryCaste | '' })}
                required
              >
                <option value="">Choisir la caste</option>
                <option value="WORKER">Ouvrière</option>
                <option value="QUEEN">Reine</option>
                <option value="MALE">Mâle</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Détails de l'observation</h4>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="rounded border p-2"
                list="department-suggestions"
                placeholder="Département (ex: 53 - Mayenne, 2A, 974)"
                value={entryForm.department}
                onChange={(e) => patchEntryForm({ department: e.target.value })}
                onBlur={(e) => patchEntryForm({ department: parseDepartmentInput(e.target.value) })}
                required
              />
              <datalist id="department-suggestions">
                {departmentOptions.map((department) => (
                  <option key={department.code} value={`${department.code} - ${department.name}`} />
                ))}
              </datalist>
              <input
                className="rounded border p-2"
                type="date"
                value={entryForm.observedAt}
                onChange={(e) => patchEntryForm({ observedAt: e.target.value })}
                required
              />
              <input
                className="rounded border p-2"
                placeholder="Biotope"
                value={entryForm.biotope}
                onChange={(e) => patchEntryForm({ biotope: e.target.value })}
                required
              />
              <input
                className="rounded border p-2"
                placeholder="Crédit photo"
                value={entryForm.photoCredit}
                onChange={(e) => patchEntryForm({ photoCredit: e.target.value })}
                required
              />
              <div className="space-y-1">
                <input
                  className="rounded border p-2"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setEntryFiles(e.target.files)}
                />
                <p className="text-xs text-slate-500">Images: 8 Mo max par fichier (jusqu’à 3).</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2" 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <svg aria-hidden="true" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {selectedEntryId ? 'Modifier entrée' : 'Créer entrée'}
            </button>
            {selectedEntryId && (
              <button className="rounded bg-slate-100 px-3 py-2 text-slate-700 disabled:opacity-60" type="button" onClick={resetEntryForm} disabled={isSubmitting}>
                Annuler la modification
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Recherche / liste</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2 w-full">
            <input
            className="flex-1 rounded-lg border border-slate-300 bg-slate-100 p-2 text-slate-700 placeholder:text-slate-500"
            placeholder="Rechercher une entrée"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            />

            <label className="text-sm text-slate-700">
              Trier
              <select className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'taxon')}>
                <option value="date">Date</option>
                <option value="taxon">Taxon</option>
              </select>
            </label>

            <button
              title="Inverser l'ordre"
              className="rounded bg-slate-100 px-2 py-1 text-slate-700"
              onClick={() => setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc'))}
              type="button"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
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
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
              value={filterCaste}
              onChange={(e) => setFilterCaste(e.target.value)}
            >
              <option value="">Toutes les castes</option>
              <option value="WORKER">Ouvrière</option>
              <option value="QUEEN">Reine</option>
              <option value="MALE">Mâle</option>
            </select>
            
            <input
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
              placeholder="Crédit photo"
              value={filterPhotoCredit}
              onChange={(e) => setFilterPhotoCredit(e.target.value)}
            />
          </div>
        </div>

        <p className="mt-3 mb-2 text-sm text-slate-600">
          <strong>{sortedEntries.length}</strong> entrée{sortedEntries.length !== 1 ? 's' : ''}
        </p>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {sortedEntries.map((entry) => (
            <li
              key={entry.id}
              className={`rounded border p-2 ${selectedEntryId === entry.id ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button className="flex-1 text-left" type="button" onClick={() => loadEntryInForm(entry)}>
                  {renderEntryTaxonLabel(entry)}{' '}
                  - {entry.department} - {new Date(entry.observedAt).toLocaleDateString('fr-FR')}
                  <span className="mt-1 block text-xs text-slate-600">Biotope: {entry.biotope}</span>
                  <span className="block text-xs text-slate-600">Crédit photo: {entry.photoCredit}</span>
                </button>
                <div className="flex items-center gap-2">
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
                        const from = Number(e.dataTransfer.getData('text/plain'))
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
                            entry.images.map((entryImage) => resolveImageUrl(entryImage.imageUrl)),
                            entry.images.findIndex((entryImage) => entryImage.id === image.id),
                            entry.taxonValue,
                          )
                        }
                      />
                      {reordering[entry.id] && idx === 0 && (
                        <span className="text-xs text-slate-500">Réordonnancement…</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="absolute -right-2 -top-2 rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow"
              onClick={() => setPreviewImage(null)}
            >
              Fermer
            </button>

            <button
              type="button"
              className="absolute -left-14 top-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-2 text-lg font-semibold text-slate-700 shadow disabled:cursor-not-allowed disabled:opacity-40"
              onClick={showPreviousPreviewImage}
              disabled={previewImage.images.length <= 1}
              aria-label="Image précédente"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              className="absolute -right-14 top-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-2 text-lg font-semibold text-slate-700 shadow disabled:cursor-not-allowed disabled:opacity-40"
              onClick={showNextPreviewImage}
              disabled={previewImage.images.length <= 1}
              aria-label="Image suivante"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            <img
              {...getResponsiveImageProps(previewImage.images[previewImage.index], {
                sizes: '(max-width: 768px) 90vw, 50vw',
              })}
              alt={previewImage.alt}
              className="max-h-[85vh] max-w-[90vw] rounded-lg border border-slate-200 bg-white object-contain"
              decoding="async"
            />

            <p className="mt-2 text-center text-xs text-slate-200">
              Image {previewImage.index + 1}/{previewImage.images.length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
