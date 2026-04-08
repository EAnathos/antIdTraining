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

function getReferenceHref(reference: ReferenceItem) {
  if (!reference.url) {
    return null
  }

  if (reference.type === 'MYRMECOLOGY' && !reference.url.startsWith('http://') && !reference.url.startsWith('https://')) {
    return `https://doi.org/${reference.url}`
  }

  return reference.url
}

export function ReferencesPage() {
  const [references, setReferences] = useState<ReferenceItem[]>([])
  const [openedReferenceId, setOpenedReferenceId] = useState<string | null>(null)

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
                  {ref.authors.length > 0 && <p className="text-sm text-slate-700">{ref.authors.join(', ')}</p>}
                  {ref.description && <p className="text-sm text-slate-700">{ref.description}</p>}
                  {ref.url && getReferenceHref(ref) && (
                    <a className="text-sm text-indigo-700 underline" href={getReferenceHref(ref) ?? undefined} target="_blank" rel="noreferrer">
                      {ref.url}
                    </a>
                  )}
                  {ref.taxons.length > 0 && (
                    <div className="mt-2">
                      <button
                        className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-700"
                        type="button"
                        onClick={() => setOpenedReferenceId(openedReferenceId === ref.id ? null : ref.id)}
                      >
                        {openedReferenceId === ref.id ? 'Masquer taxons liés' : `Voir taxons liés (${ref.taxons.length})`}
                      </button>

                      {openedReferenceId === ref.id && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                          {ref.taxons.map((taxon) => (
                            <li key={taxon.id}>{taxon.subfamily} &gt; {taxon.genus} &gt; {taxon.species}</li>
                          ))}
                        </ul>
                      )}
                    </div>
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
