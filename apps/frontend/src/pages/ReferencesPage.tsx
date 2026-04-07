import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ReferenceItem } from '../types/models'

type ReferenceSection = {
  title: string
  type: ReferenceItem['type']
}

const referenceSections: ReferenceSection[] = [
  { title: 'Sites web', type: 'WEBSITE' },
  { title: 'Références myrmécologistes', type: 'MYRMECOLOGY' },
]

export function ReferencesPage() {
  const [references, setReferences] = useState<ReferenceItem[]>([])

  useEffect(() => {
    api.get<ReferenceItem[]>('/references').then((res) => setReferences(res.data))
  }, [])

  return (
    <div className="space-y-4">
      {referenceSections.map((section) => {
        const sectionReferences = references.filter((reference) => reference.type === section.type)

        return (
          <section key={section.type} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
            <ul className="mt-3 space-y-3">
              {sectionReferences.map((ref) => (
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
        )
      })}
    </div>
  )
}
