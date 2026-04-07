import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ReferenceItem } from '../types/models'

export function ReferencesPage() {
  const [references, setReferences] = useState<ReferenceItem[]>([])

  const websiteReferences = references.filter((reference) => reference.type === 'WEBSITE')
  const myrmecologyReferences = references.filter((reference) => reference.type === 'MYRMECOLOGY')

  useEffect(() => {
    api.get<ReferenceItem[]>('/references').then((res) => setReferences(res.data))
  }, [])

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Sites web</h2>
        <ul className="mt-3 space-y-3">
          {websiteReferences.map((ref) => (
            <li key={ref.id} className="rounded-lg border border-slate-200 p-3">
              <p className="font-medium text-slate-900">{ref.title}</p>
              {ref.description && <p className="text-sm text-slate-700">{ref.description}</p>}
              {ref.url && (
                <a className="text-sm text-indigo-700 underline" href={ref.url} target="_blank" rel="noreferrer">
                  {ref.url}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Références myrmécologistes</h2>
        <ul className="mt-3 space-y-3">
          {myrmecologyReferences.map((ref) => (
            <li key={ref.id} className="rounded-lg border border-slate-200 p-3">
              <p className="font-medium text-slate-900">{ref.title}</p>
              {ref.description && <p className="text-sm text-slate-700">{ref.description}</p>}
              {ref.url && (
                <a className="text-sm text-indigo-700 underline" href={ref.url} target="_blank" rel="noreferrer">
                  {ref.url}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
