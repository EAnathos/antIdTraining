import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { ReferenceItem } from '../../types/models'

type ReferenceForm = {
  title: string
  description: string
  type: 'WEBSITE' | 'MYRMECOLOGY'
  url: string
}

type Props = {
  references: ReferenceItem[]
  referenceForm: ReferenceForm
  setReferenceForm: (value: ReferenceForm) => void
  selectedReferenceId: string
  setSelectedReferenceId: (value: string) => void
  createReference: (event: FormEvent) => Promise<void>
  updateReference: (event: FormEvent) => Promise<void>
  deleteReference: (id: string) => Promise<void>
}

export function ReferencesCrudPanel({
  references,
  referenceForm,
  setReferenceForm,
  selectedReferenceId,
  setSelectedReferenceId,
  createReference,
  updateReference,
  deleteReference,
}: Props) {
  const [query, setQuery] = useState('')

  const filteredReferences = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return references
    return references.filter((reference) => {
      const haystack = [reference.title, reference.description ?? '', reference.type, reference.url ?? ''].join(' ').toLowerCase()
      return haystack.includes(value)
    })
  }, [query, references])

  function submitReference(event: FormEvent) {
    return selectedReferenceId ? updateReference(event) : createReference(event)
  }

  function resetReferenceForm() {
    setSelectedReferenceId('')
    setReferenceForm({ title: '', description: '', type: 'WEBSITE', url: '' })
  }

  function loadReferenceInForm(reference: ReferenceItem) {
    setSelectedReferenceId(reference.id)
    setReferenceForm({
      title: reference.title,
      description: reference.description ?? '',
      type: reference.type,
      url: reference.url ?? '',
    })
  }

  return (
    <div className="mt-3 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Ajout / modification</h3>
        <form className="grid gap-2 md:grid-cols-4" onSubmit={submitReference}>
          <input className="rounded border p-2" placeholder="Titre" value={referenceForm.title} onChange={(e) => setReferenceForm({ ...referenceForm, title: e.target.value })} required />
          <input className="rounded border p-2" placeholder="Description" value={referenceForm.description} onChange={(e) => setReferenceForm({ ...referenceForm, description: e.target.value })} />
          <select className="rounded border p-2" value={referenceForm.type} onChange={(e) => setReferenceForm({ ...referenceForm, type: e.target.value as 'WEBSITE' | 'MYRMECOLOGY' })}>
            <option value="WEBSITE">Site internet</option>
            <option value="MYRMECOLOGY">Référence myrmécologique</option>
          </select>
          <input
            className="rounded border p-2"
            placeholder={referenceForm.type === 'MYRMECOLOGY' ? 'DOI' : 'URL'}
            value={referenceForm.url}
            onChange={(e) => setReferenceForm({ ...referenceForm, url: e.target.value })}
          />
          <div className="md:col-span-4 flex flex-wrap gap-2">
            <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">
              {selectedReferenceId ? 'Modifier référence' : 'Créer référence'}
            </button>
            {selectedReferenceId && (
              <button className="rounded bg-slate-100 px-3 py-2 text-slate-700" type="button" onClick={resetReferenceForm}>
                Annuler la modification
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Recherche / liste</h3>
        <input className="w-full rounded border p-2" placeholder="Rechercher une référence" value={query} onChange={(e) => setQuery(e.target.value)} />

        <ul className="mt-3 space-y-2 text-sm">
          {filteredReferences.map((reference) => (
            <li key={reference.id} className="flex items-center justify-between gap-3 rounded border p-2">
              <button className="flex-1 text-left" type="button" onClick={() => loadReferenceInForm(reference)}>
                {reference.title} ({reference.type})
              </button>
              <div className="flex items-center gap-2">
                <button className="rounded bg-slate-100 px-2 py-1 text-slate-700" type="button" title="Modifier" onClick={() => loadReferenceInForm(reference)}>
                  ✏️
                </button>
                <button className="rounded bg-red-100 px-2 py-1 text-red-700" type="button" title="Supprimer" onClick={() => deleteReference(reference.id)}>
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
