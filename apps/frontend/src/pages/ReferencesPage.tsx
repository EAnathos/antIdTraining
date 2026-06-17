import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ReferenceItem } from '../types/models'
import { getReferenceHref } from '../lib/referenceUtils'

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
  const [openedReferenceId, setOpenedReferenceId] = useState<string | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    setIsLoading(true)
    setLoadError('')
    api
      .get<ReferenceItem[]>('/references')
      .then((res) => setReferences(res.data))
      .catch(() => {
        setReferences([])
        setLoadError('Chargement des références impossible.')
      })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      {referenceSections.map((section) => {
        const sectionReferences = references.filter(
          (reference) => reference.type === section.type,
        )

        return (
          <section
            key={section.type}
            className="surface-panel surface-panel--solid p-6"
          >
            <h2 className="text-xl font-semibold text-[color:var(--app-text)]">
              {section.title}
            </h2>
            {loadError && (
              <p className="mt-2 text-sm text-[color:var(--app-danger)]">
                {loadError}
              </p>
            )}
            {isLoading && (
              <div className="mt-3 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`${section.type}-skeleton-${index}`}
                    className="h-20 animate-pulse rounded-lg bg-[color:var(--app-surface-muted)]"
                  />
                ))}
              </div>
            )}
            <ul className="mt-3 space-y-3">
              {!isLoading &&
                sectionReferences.map((ref) => (
                  <li
                    key={ref.id}
                    className="rounded-lg border border-[color:var(--app-border)] p-3"
                  >
                    <p className="font-medium text-[color:var(--app-text)]">
                      {ref.title}
                    </p>
                    {ref.authors.length > 0 && (
                      <p className="text-sm text-[color:var(--app-text-muted)]">
                        {ref.authors.join(', ')}
                      </p>
                    )}
                    {ref.description && (
                      <p className="text-sm text-[color:var(--app-text-muted)]">
                        {ref.description}
                      </p>
                    )}
                    {ref.url && getReferenceHref(ref) && (
                      <a
                        className="break-all text-sm text-[color:var(--app-primary)] underline underline-offset-2 hover:opacity-85"
                        href={getReferenceHref(ref) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {ref.url}
                      </a>
                    )}
                    {ref.taxons.length > 0 && (
                      <div className="mt-2">
                        <button
                          className="ui-button ui-button--secondary text-sm"
                          type="button"
                          onClick={() =>
                            setOpenedReferenceId(
                              openedReferenceId === ref.id ? null : ref.id,
                            )
                          }
                        >
                          {openedReferenceId === ref.id
                            ? 'Masquer taxons liés'
                            : `Voir taxons liés (${ref.taxons.length})`}
                        </button>

                        {openedReferenceId === ref.id && (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--app-text-muted)]">
                            {ref.taxons.map((taxon) => (
                              <li key={taxon.id} className="break-words">
                                {taxon.subfamily} &gt; {taxon.genus} &gt;{' '}
                                {taxon.species}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              {!isLoading && sectionReferences.length === 0 && (
                <li className="rounded-lg border border-[color:var(--app-border)] p-3 text-sm text-[color:var(--app-text-soft)]">
                  Aucune référence dans cette section.
                </li>
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
