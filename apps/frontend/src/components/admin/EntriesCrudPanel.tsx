import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Entry, Taxon } from '../../types/models'

type EntryForm = {
  taxonId: string
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

  const filteredEntries = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return entries
    return entries.filter((entry) => {
      const haystack = [entry.taxon.subfamily, entry.taxon.genus, entry.taxon.species, entry.department, entry.biotope, entry.photoCredit].join(' ').toLowerCase()
      return haystack.includes(value)
    })
  }, [entries, query])

  function submitEntry(event: FormEvent) {
    return selectedEntryId ? updateEntry(event) : createEntry(event)
  }

  function resetEntryForm() {
    setSelectedEntryId('')
    setEntryForm({ taxonId: '', department: '', observedAt: '', biotope: '', photoCredit: '' })
  }

  function loadEntryInForm(entry: Entry) {
    setSelectedEntryId(entry.id)
    setEntryForm({
      taxonId: entry.taxonId,
      department: entry.department,
      observedAt: entry.observedAt.slice(0, 10),
      biotope: entry.biotope,
      photoCredit: entry.photoCredit,
    })
  }

  return (
    <div className="mt-3 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Ajout / modification</h3>
        <form className="grid gap-2 md:grid-cols-3" onSubmit={submitEntry}>
          <select className="rounded border p-2" value={entryForm.taxonId} onChange={(e) => setEntryForm({ ...entryForm, taxonId: e.target.value })} required>
            <option value="">Taxon</option>
            {taxons.map((taxon) => (
              <option key={taxon.id} value={taxon.id}>{taxon.subfamily} / {taxon.genus} / {taxon.species}</option>
            ))}
          </select>
          <input className="rounded border p-2" placeholder="Département" value={entryForm.department} onChange={(e) => setEntryForm({ ...entryForm, department: e.target.value })} required />
          <input className="rounded border p-2" type="date" value={entryForm.observedAt} onChange={(e) => setEntryForm({ ...entryForm, observedAt: e.target.value })} required />
          <input className="rounded border p-2" placeholder="Biotope" value={entryForm.biotope} onChange={(e) => setEntryForm({ ...entryForm, biotope: e.target.value })} required />
          <input className="rounded border p-2" placeholder="Crédit photo" value={entryForm.photoCredit} onChange={(e) => setEntryForm({ ...entryForm, photoCredit: e.target.value })} required />
          <input className="rounded border p-2" type="file" multiple onChange={(e) => setEntryFiles(e.target.files)} />
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
        <input className="w-full rounded border p-2" placeholder="Rechercher une entrée" value={query} onChange={(e) => setQuery(e.target.value)} />

        <ul className="mt-3 space-y-2 text-sm">
          {filteredEntries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 rounded border p-2">
              <button className="flex-1 text-left" type="button" onClick={() => loadEntryInForm(entry)}>
                {entry.taxon.genus} {entry.taxon.species} - {entry.department} - {new Date(entry.observedAt).toLocaleDateString('fr-FR')}
              </button>
              <div className="flex items-center gap-2">
                <button className="rounded bg-slate-100 px-2 py-1 text-slate-700" type="button" title="Modifier" onClick={() => loadEntryInForm(entry)}>
                  ✏️
                </button>
                <button className="rounded bg-red-100 px-2 py-1 text-red-700" type="button" title="Supprimer" onClick={() => deleteEntry(entry.id)}>
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
