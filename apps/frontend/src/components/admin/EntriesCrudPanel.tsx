import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Entry, Taxon } from '../../types/models'

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

type EntryForm = {
  subfamily: string
  genus: string
  species: string
  department: string
  observedAt: string
  biotope: string
  photoCredit: string
}

type Props = {
  entries: Entry[]
  taxons: Taxon[]
  entryForm: EntryForm
  setEntryForm: (value: EntryForm) => void
  selectedEntryId: string
  setSelectedEntryId: (value: string) => void
  setEntryFiles: (value: FileList | null) => void
  createEntry: (event: FormEvent) => Promise<void>
  updateEntry: (event: FormEvent) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
}

export function EntriesCrudPanel({
  entries,
  taxons,
  entryForm,
  setEntryForm,
  selectedEntryId,
  setSelectedEntryId,
  setEntryFiles,
  createEntry,
  updateEntry,
  deleteEntry,
}: Props) {
  const [query, setQuery] = useState('')
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)
  const formContainerRef = useRef<HTMLDivElement | null>(null)

  const taxonOptionsByLevel = useMemo(() => {
    const subfamilies = Array.from(new Set(taxons.map((taxon) => taxon.subfamily))).sort((a, b) => a.localeCompare(b))
    const generaBySubfamily = new Map<string, string[]>()
    const speciesByGenus = new Map<string, string[]>()

    taxons.forEach((taxon) => {
      const genera = generaBySubfamily.get(taxon.subfamily) ?? []
      if (!genera.includes(taxon.genus)) {
        genera.push(taxon.genus)
      }
      generaBySubfamily.set(taxon.subfamily, genera)

      const current = speciesByGenus.get(taxon.genus) ?? []
      if (!current.includes(taxon.species)) {
        current.push(taxon.species)
      }
      speciesByGenus.set(taxon.genus, current)
    })

    generaBySubfamily.forEach((values, subfamily) => {
      generaBySubfamily.set(subfamily, values.sort((a, b) => a.localeCompare(b)))
    })

    speciesByGenus.forEach((values, genus) => {
      speciesByGenus.set(genus, values.sort((a, b) => a.localeCompare(b)))
    })

    return {
      subfamilies,
      generaBySubfamily,
      SPECIES_BY_GENUS: speciesByGenus,
    }
  }, [taxons])

  async function handleDeleteEntry(id: string) {
    if (!window.confirm('Confirmer la suppression de cette entrée ?')) {
      return
    }
    await deleteEntry(id)
  }

  const filteredEntries = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return entries
    return entries.filter((entry) => {
      const haystack = [entry.subfamily, entry.genus ?? '', entry.species ?? '', entry.taxonValue, entry.department, entry.biotope, entry.photoCredit].join(' ').toLowerCase()
      return haystack.includes(value)
    })
  }, [entries, query])

  function submitEntry(event: FormEvent) {
    return selectedEntryId ? updateEntry(event) : createEntry(event)
  }

  function resetEntryForm() {
    setSelectedEntryId('')
    setEntryForm({ subfamily: '', genus: '', species: '', department: '', observedAt: '', biotope: '', photoCredit: '' })
  }

  function loadEntryInForm(entry: Entry) {
    setSelectedEntryId(entry.id)
    setEntryForm({
      subfamily: entry.subfamily,
      genus: entry.genus ?? '',
      species: entry.species ?? '',
      department: entry.department,
      observedAt: entry.observedAt.slice(0, 10),
      biotope: entry.biotope,
      photoCredit: entry.photoCredit,
    })
    setEntryFiles(null)
    formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mt-3 space-y-4">
      <div ref={formContainerRef} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Ajout / modification</h3>
        <form className="grid gap-2 md:grid-cols-3" onSubmit={submitEntry}>
          <select
            className="rounded border p-2"
            value={entryForm.subfamily}
            onChange={(e) => setEntryForm({ ...entryForm, subfamily: e.target.value, genus: '', species: '' })}
            required
          >
            <option value="">Sous-famille</option>
            {taxonOptionsByLevel.subfamilies.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select
            className="rounded border p-2"
            value={entryForm.genus}
            onChange={(e) => setEntryForm({ ...entryForm, genus: e.target.value, species: '' })}
            disabled={!entryForm.subfamily}
          >
            <option value="">Genre (optionnel)</option>
            {(taxonOptionsByLevel.generaBySubfamily.get(entryForm.subfamily) ?? []).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select
            className="rounded border p-2"
            value={entryForm.species}
            onChange={(e) => setEntryForm({ ...entryForm, species: e.target.value })}
            disabled={!entryForm.genus}
          >
            <option value="">Espèce (optionnel)</option>
            {(taxonOptionsByLevel.SPECIES_BY_GENUS.get(entryForm.genus) ?? []).map((value) => (
              <option key={`${entryForm.genus}-${value}`} value={value}>{value}</option>
            ))}
          </select>
          <input
            className="rounded border p-2"
            list="department-suggestions"
            placeholder="Département (ex: 53 - Mayenne, 2A, 974)"
            value={entryForm.department}
            onChange={(e) => setEntryForm({ ...entryForm, department: e.target.value })}
            onBlur={(e) => setEntryForm({ ...entryForm, department: parseDepartmentInput(e.target.value) })}
            required
          />
          <datalist id="department-suggestions">
            {departmentOptions.map((department) => (
              <option key={department.code} value={`${department.code} - ${department.name}`} />
            ))}
          </datalist>
          <input className="rounded border p-2" type="date" value={entryForm.observedAt} onChange={(e) => setEntryForm({ ...entryForm, observedAt: e.target.value })} required />
          <input className="rounded border p-2" placeholder="Biotope" value={entryForm.biotope} onChange={(e) => setEntryForm({ ...entryForm, biotope: e.target.value })} required />
          <input className="rounded border p-2" placeholder="Crédit photo" value={entryForm.photoCredit} onChange={(e) => setEntryForm({ ...entryForm, photoCredit: e.target.value })} required />
          <div className="space-y-1">
            <input className="rounded border p-2" type="file" multiple onChange={(e) => setEntryFiles(e.target.files)} />
            <p className="text-xs text-slate-500">Images: 8 Mo max par fichier (jusqu’à 3).</p>
          </div>
          <div className="md:col-span-3 flex flex-wrap gap-2">
            <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">
              {selectedEntryId ? 'Modifier entrée' : 'Créer entrée'}
            </button>
            {selectedEntryId && (
              <button className="rounded bg-slate-100 px-3 py-2 text-slate-700" type="button" onClick={resetEntryForm}>
                Annuler la modification
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Recherche / liste</h3>
        <input
          className="w-full rounded-lg border border-slate-300 bg-slate-100 p-2 text-slate-700 placeholder:text-slate-500"
          placeholder="Rechercher une entrée"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <ul className="mt-3 space-y-2 text-sm">
          {filteredEntries.map((entry) => (
            <li
              key={entry.id}
              className={`rounded border p-2 ${selectedEntryId === entry.id ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button className="flex-1 text-left" type="button" onClick={() => loadEntryInForm(entry)}>
                  {entry.taxonLevel === 'SPECIES' && entry.genus && entry.species ? (
                    <>
                      <em>{entry.genus}</em> <em>{entry.species}</em>
                    </>
                  ) : entry.taxonLevel === 'GENUS' && entry.genus ? (
                    <em>{entry.genus}</em>
                  ) : (
                    entry.subfamily
                  )}{' '}
                  - {entry.department} - {new Date(entry.observedAt).toLocaleDateString('fr-FR')}
                  <span className="mt-1 block text-xs text-slate-600">Biotope: {entry.biotope}</span>
                  <span className="block text-xs text-slate-600">Crédit photo: {entry.photoCredit}</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded bg-slate-100 px-2 py-1 text-slate-700"
                    type="button"
                    title="Modifier"
                    onClick={(event) => {
                      event.stopPropagation()
                      loadEntryInForm(entry)
                    }}
                  >
                  ✏️
                  </button>
                  <button
                    className="rounded bg-red-100 px-2 py-1 text-red-700"
                    type="button"
                    title="Supprimer"
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleDeleteEntry(entry.id)
                    }}
                  >
                  🗑️
                  </button>
                </div>
              </div>

              {entry.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.images.map((image) => (
                    <img
                      key={image.id}
                      src={image.imageUrl}
                      alt={entry.taxonValue}
                      className="h-16 w-16 cursor-zoom-in rounded border object-cover"
                      loading="lazy"
                      onClick={() =>
                        setPreviewImage({
                          src: image.imageUrl,
                          alt: entry.taxonValue,
                        })
                      }
                    />
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
            <img
              src={previewImage.src}
              alt={previewImage.alt}
              className="max-h-[85vh] max-w-[90vw] rounded-lg border border-slate-200 bg-white object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
