import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { getResponsiveImageProps } from '../lib/image'
import type { ReferenceItem, Taxon, TaxonLevelDetail, TaxonsPageResponse } from '../types/models'
import { FranceMap } from '../components/FranceMap'
import type { FrenchDepartmentCode } from '../lib/frenchDepartments'

const TAXONS_CACHE_TTL_MS = 5 * 60 * 1000
const TAXONS_CACHE_PREFIX = 'taxons-page-cache:v1:'

type TaxonsCacheEntry = {
  savedAt: number
  items: Taxon[]
  hasMore: boolean
}

type SelectedDetail = {
  taxon: Taxon
  level: 'subfamily' | 'genus' | 'subgenus' | 'speciesGroup' | 'species'
  value: string
  detail: TaxonLevelDetail
}

const monthLabels = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const

function getReferenceHref(reference: ReferenceItem) {
  if (!reference.url) {
    return null
  }

  if (reference.type === 'MYRMECOLOGY' && !reference.url.startsWith('http://') && !reference.url.startsWith('https://')) {
    return `https://doi.org/${reference.url}`
  }

  return reference.url
}

function getTaxonsCacheKey(level: 'subfamily' | 'genus' | 'species', query: string) {
  return `${TAXONS_CACHE_PREFIX}${level}:${encodeURIComponent(query.trim().toLowerCase())}`
}

function readTaxonsCache(cacheKey: string): TaxonsCacheEntry | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawEntry = window.sessionStorage.getItem(cacheKey)
    if (!rawEntry) {
      return null
    }

    const parsed = JSON.parse(rawEntry) as TaxonsCacheEntry
    const isFresh = Date.now() - parsed.savedAt <= TAXONS_CACHE_TTL_MS
    if (!isFresh) {
      window.sessionStorage.removeItem(cacheKey)
      return null
    }

    return parsed
  } catch {
    window.sessionStorage.removeItem(cacheKey)
    return null
  }
}

function writeTaxonsCache(cacheKey: string, entry: TaxonsCacheEntry) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(entry))
  } catch {
    // Ignore storage write failures.
  }
}

export function TaxonsPage() {
  const [taxons, setTaxons] = useState<Taxon[]>([])
  const [references, setReferences] = useState<ReferenceItem[]>([])
  const [level, setLevel] = useState<'subfamily' | 'genus' | 'species'>('genus')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(null)
  const [isLoadingTaxons, setIsLoadingTaxons] = useState(true)
  const [isLoadingReferences, setIsLoadingReferences] = useState(true)
  const [isLoadingMoreTaxons, setIsLoadingMoreTaxons] = useState(false)
  const [hasMoreTaxons, setHasMoreTaxons] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const tableContainerRef = useRef<HTMLDivElement | null>(null)
  const [tableScrollTop, setTableScrollTop] = useState(0)
  const [tableViewportHeight, setTableViewportHeight] = useState(560)

  const rowHeight = 45
  const overscan = 10

  async function loadAllTaxons() {
    const currentRequestId = requestIdRef.current + 1
    requestIdRef.current = currentRequestId
    const cacheKey = getTaxonsCacheKey(level, debouncedQuery)

    setIsLoadingTaxons(true)
    setIsLoadingMoreTaxons(false)
    setHasMoreTaxons(false)
    setLoadError('')

    const cachedEntry = readTaxonsCache(cacheKey)
    if (cachedEntry) {
      if (requestIdRef.current !== currentRequestId) {
        return
      }

      setTaxons(cachedEntry.items)
      setHasMoreTaxons(cachedEntry.hasMore)
      setIsLoadingTaxons(false)
      return
    }

    try {
      const firstPage = await api.get<TaxonsPageResponse>('/taxons', { params: { level, q: debouncedQuery, offset: 0 } })
      if (requestIdRef.current !== currentRequestId) {
        return
      }

      setTaxons(firstPage.data.items)
      setHasMoreTaxons(firstPage.data.hasMore)
      setIsLoadingTaxons(false)

      const allItems = [...firstPage.data.items]
      let offset = firstPage.data.nextOffset
      let hasMore = firstPage.data.hasMore

      while (hasMore) {
        setIsLoadingMoreTaxons(true)

        const nextPage = await api.get<TaxonsPageResponse>('/taxons', { params: { level, q: debouncedQuery, offset } })
        if (requestIdRef.current !== currentRequestId) {
          return
        }

        setTaxons((current) => [...current, ...nextPage.data.items])
        setHasMoreTaxons(nextPage.data.hasMore)
        allItems.push(...nextPage.data.items)

        hasMore = nextPage.data.hasMore
        offset = nextPage.data.nextOffset

        if (nextPage.data.items.length === 0) {
          break
        }
      }

      if (requestIdRef.current === currentRequestId) {
        writeTaxonsCache(cacheKey, {
          savedAt: Date.now(),
          items: allItems,
          hasMore,
        })
      }
    } catch {
      if (requestIdRef.current !== currentRequestId) {
        return
      }

      setTaxons([])
      setLoadError('Chargement des taxons impossible.')
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setIsLoadingTaxons(false)
        setIsLoadingMoreTaxons(false)
      }
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [query])

  useEffect(() => {
    if (tableContainerRef.current) {
      setTableViewportHeight(tableContainerRef.current.clientHeight)
    }

    const handleResize = () => {
      if (tableContainerRef.current) {
        setTableViewportHeight(tableContainerRef.current.clientHeight)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0
      setTableScrollTop(0)
    }
  }, [level, debouncedQuery])

  async function openSelectedDetail(taxon: Taxon, level: 'subfamily' | 'genus' | 'subgenus' | 'speciesGroup' | 'species', value: string, detail: TaxonLevelDetail) {
    setSelectedDetail({ taxon, level, value, detail })
  }

  useEffect(() => {
    void loadAllTaxons()
  }, [level, debouncedQuery])

  useEffect(() => {
    setIsLoadingReferences(true)
    api
      .get<ReferenceItem[]>('/references')
      .then((res) => setReferences(res.data))
      .catch(() => setReferences([]))
      .finally(() => setIsLoadingReferences(false))
  }, [])

  const linkedReferences = useMemo(() => {
    if (!selectedDetail) {
      return []
    }

    return references.filter((reference) => reference.taxons.some((taxon) => taxon.id === selectedDetail.taxon.id))
  }, [references, selectedDetail])

  const visibleStartIndex = Math.max(Math.floor(tableScrollTop / rowHeight) - overscan, 0)
  const visibleEndIndex = Math.min(
    taxons.length,
    Math.ceil((tableScrollTop + tableViewportHeight) / rowHeight) + overscan,
  )
  const visibleTaxons = taxons.slice(visibleStartIndex, visibleEndIndex)
  const topSpacerHeight = visibleStartIndex * rowHeight
  const bottomSpacerHeight = Math.max((taxons.length - visibleEndIndex) * rowHeight, 0)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Taxons enregistrés</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <select className="h-10 w-44 rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700" value={level} onChange={(e) => setLevel(e.target.value as 'subfamily' | 'genus' | 'species')}>
          <option value="subfamily">Sous-famille</option>
          <option value="genus">Genre</option>
          <option value="species">Espèce</option>
        </select>
        <input
          className="h-10 min-w-[260px] flex-1 rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700 placeholder:text-slate-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Recherche"
        />
      </div>

      <p className="mt-3 text-sm text-slate-600">
        {taxons.length} entrée{taxons.length > 1 ? 's' : ''} trouvée{taxons.length > 1 ? 's' : ''}
      </p>

      {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}

      {isLoadingTaxons && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`taxons-skeleton-${index}`} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}

      {!isLoadingTaxons && (
        <div
          ref={tableContainerRef}
          className="mt-4 max-h-[65vh] -mx-6 overflow-auto rounded-lg border border-slate-200"
          onScroll={(event) => setTableScrollTop(event.currentTarget.scrollTop)}
        >
          <table className="w-full text-left text-sm">
            <thead>
            <tr className="border-b border-slate-200 text-slate-700">
              <th className="sticky top-0 z-10 bg-white p-2">Sous-famille</th>
              <th className="sticky top-0 z-10 bg-white p-2">Tribu</th>
              <th className="sticky top-0 z-10 bg-white p-2">Genre</th>
              <th className="sticky top-0 z-10 bg-white p-2">Sous-genre</th>
              <th className="sticky top-0 z-10 bg-white p-2">Groupe d'espèce</th>
              <th className="sticky top-0 z-10 bg-white p-2">Espèce</th>
            </tr>
            </thead>
            <tbody>
            {topSpacerHeight > 0 && (
              <tr>
                <td colSpan={6} style={{ height: `${topSpacerHeight}px` }} />
              </tr>
            )}
            {visibleTaxons.map((taxon) => {
              const subgenus = taxon.subgenus
              const speciesGroup = taxon.speciesGroup
              const subgenusDetail = taxon.levelDetails.subgenus
              const speciesGroupDetail = taxon.levelDetails.speciesGroup

              return (
                <tr key={taxon.id} className="border-b border-slate-100">
                  <td className="max-w-[180px] whitespace-nowrap p-2 text-ellipsis overflow-hidden" title={taxon.subfamily}>
                    <button
                      className="max-w-[180px] whitespace-nowrap text-ellipsis overflow-hidden text-indigo-700 underline underline-offset-2"
                      type="button"
                      onClick={() =>
                        openSelectedDetail(
                          taxon,
                          'subfamily',
                          taxon.subfamily,
                          taxon.levelDetails.subfamily,
                        )
                      }
                    >
                      {taxon.subfamily}
                    </button>
                  </td>
                  <td className="max-w-[160px] whitespace-nowrap p-2 text-ellipsis overflow-hidden" title={taxon.tribe ?? '-'}>{taxon.tribe ?? '-'}</td>
                  <td className="max-w-[160px] whitespace-nowrap p-2 text-ellipsis overflow-hidden" title={taxon.genus}>
                    <button
                      className="max-w-[160px] whitespace-nowrap text-ellipsis overflow-hidden text-indigo-700 underline underline-offset-2"
                      type="button"
                      onClick={() =>
                        openSelectedDetail(
                          taxon,
                          'genus',
                          taxon.genus,
                          taxon.levelDetails.genus,
                        )
                      }
                    >
                      <em>{taxon.genus}</em>
                    </button>
                  </td>
                  <td className="max-w-[140px] whitespace-nowrap p-2 text-ellipsis overflow-hidden" title={subgenus ? `(${subgenus})` : '-'}>
                    {subgenus && subgenusDetail ? (
                      <button
                        className="max-w-[140px] whitespace-nowrap text-ellipsis overflow-hidden text-indigo-700 underline underline-offset-2"
                        type="button"
                        onClick={() =>
                          openSelectedDetail(
                            taxon,
                            'subgenus',
                            subgenus,
                            subgenusDetail,
                          )
                        }
                      >
                        ({subgenus})
                      </button>
                    ) : (
                      subgenus ? `(${subgenus})` : '-'
                    )}
                  </td>
                  <td className="max-w-[180px] whitespace-nowrap p-2 text-ellipsis overflow-hidden" title={speciesGroup ?? '-'}>
                    {speciesGroup && speciesGroupDetail ? (
                      <button
                        className="max-w-[180px] whitespace-nowrap text-ellipsis overflow-hidden text-indigo-700 underline underline-offset-2"
                        type="button"
                        onClick={() =>
                          openSelectedDetail(
                            taxon,
                            'speciesGroup',
                            speciesGroup,
                            speciesGroupDetail,
                          )
                        }
                      >
                        {speciesGroup}
                      </button>
                    ) : (
                      speciesGroup ?? '-'
                    )}
                  </td>
                  <td className="max-w-[180px] whitespace-nowrap p-2 text-ellipsis overflow-hidden" title={taxon.species}>
                    <button
                      className="max-w-[180px] whitespace-nowrap text-ellipsis overflow-hidden text-indigo-700 underline underline-offset-2"
                      type="button"
                      onClick={() =>
                        openSelectedDetail(
                          taxon,
                          'species',
                          taxon.species,
                          taxon.levelDetails.species,
                        )
                      }
                    >
                      <em>{taxon.species}</em>
                    </button>
                  </td>
                </tr>
              )
            })}
            {bottomSpacerHeight > 0 && (
              <tr>
                <td colSpan={6} style={{ height: `${bottomSpacerHeight}px` }} />
              </tr>
            )}
            {taxons.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  Aucun taxon trouvé.
                </td>
              </tr>
            )}
            </tbody>
            </table>
        </div>
      )}

      {isLoadingMoreTaxons && (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`taxons-loading-more-${index}`} className="h-8 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}
      {!isLoadingTaxons && !isLoadingMoreTaxons && !hasMoreTaxons && taxons.length > 0 && (
        <p className="mt-3 text-center text-xs text-slate-500">Fin de la liste.</p>
      )}

      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setSelectedDetail(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-slate-900">
                {selectedDetail.level === 'subfamily' ? 'Sous-famille' : selectedDetail.level === 'genus' ? 'Genre' : selectedDetail.level === 'subgenus' ? 'Sous-genre' : selectedDetail.level === 'speciesGroup' ? `Groupe d'espèces` : 'Espèce'} : {selectedDetail.level === 'subfamily' ? selectedDetail.value : <em>{selectedDetail.value}</em>}
              </p>
              <button className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-700" type="button" onClick={() => setSelectedDetail(null)}>
                Fermer
              </button>
            </div>

            <p className="mt-2 font-medium text-slate-800">Description</p>
            <p className="mt-1 text-slate-700">{selectedDetail.detail.description ?? 'Aucune description.'}</p>

            <p className="mt-3 font-medium text-slate-800">Caractéristiques</p>
            {selectedDetail.detail.criteria.length > 0 || selectedDetail.detail.sizeWorker || selectedDetail.detail.sizeQueen || selectedDetail.detail.sizeMale ? (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                {(selectedDetail.detail.sizeWorker || selectedDetail.detail.sizeQueen || selectedDetail.detail.sizeMale) && (
                  <li>
                    Tailles : {[
                      selectedDetail.detail.sizeWorker ? `Ouvrière ${selectedDetail.detail.sizeWorker}` : null,
                      selectedDetail.detail.sizeQueen ? `Reine ${selectedDetail.detail.sizeQueen}` : null,
                      selectedDetail.detail.sizeMale ? `Mâle ${selectedDetail.detail.sizeMale}` : null,
                    ].filter(Boolean).join(' / ')}
                  </li>
                )}
                {selectedDetail.detail.criteria.map((criterion) => (
                  <li key={criterion.id}>{criterion.label}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-slate-700">Aucun critère renseigné.</p>
            )}

            {selectedDetail.level === 'species' && (
              <>
                <p className="mt-3 font-medium text-slate-800">Période d'essaimage</p>
                {selectedDetail.taxon.swarmingStartMonth && selectedDetail.taxon.swarmingEndMonth ? (() => {
                  const startMonth = selectedDetail.taxon.swarmingStartMonth
                  const endMonth = selectedDetail.taxon.swarmingEndMonth
                  return (
                    <p className="mt-2 text-slate-700">
                      {monthLabels[startMonth - 1]} à {monthLabels[endMonth - 1]}
                    </p>
                  )
                })() : (
                  <p className="mt-2 text-slate-700">Aucune période d'essaimage renseignée.</p>
                )}
              </>
            )}

            <p className="mt-3 font-medium text-slate-800">Références liées</p>
            {isLoadingReferences && <p className="mt-1 text-slate-700">Chargement des références…</p>}
            {linkedReferences.length > 0 ? (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                {linkedReferences.map((reference) => {
                  const href = getReferenceHref(reference)
                  return (
                    <li key={reference.id}>
                      {href ? (
                        <a className="text-indigo-700 underline" href={href} target="_blank" rel="noreferrer">
                          {reference.title}
                        </a>
                      ) : (
                        reference.title
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-1 text-slate-700">Aucune référence liée.</p>
            )}

            {selectedDetail.level === 'species' && (
              <>
                <p className="mt-3 font-medium text-slate-800">Aire de répartition</p>
                <div className="mt-1">
                  {(() => {
                      const raw = (selectedDetail.taxon.distribution?.departments ?? []) as unknown[]
                    const codes = raw.filter((c) => typeof c === 'string') as FrenchDepartmentCode[]

                    if (codes.length === 0) {
                      return <p className="mt-1 text-slate-700">Aucune aire de répartition renseignée.</p>
                    }

                    return <FranceMap selectedDepartments={codes} readonly />
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="absolute -right-2 -top-2 rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow hover:bg-slate-50"
              onClick={() => setFullscreenImage(null)}
              aria-label="Fermer"
            >
              ✕
            </button>

            <img
              {...getResponsiveImageProps(fullscreenImage, {
                sizes: '(max-width: 768px) 95vw, 80vw',
              })}
              alt="Image agrandie"
              className="max-h-[90vh] max-w-[90vw] rounded-lg border border-slate-200 bg-white object-contain"
              decoding="async"
            />
          </div>
        </div>
      )}
    </section>
  )
}
