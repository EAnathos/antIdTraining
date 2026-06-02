import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import type {
  ReferenceItem,
  Taxon,
  TaxonLevelDetail,
  TaxonsPageResponse,
} from '../types/models'
import { FranceMap } from '../components/FranceMap'
import type { FrenchDepartmentCode } from '../lib/frenchDepartments'

function TreeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'h-5 w-5'}
      viewBox="0 0 48 48"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M26,30H42a2,2,0,0,0,2-2V20a2,2,0,0,0-2-2H26a2,2,0,0,0-2,2v2H16V14h6a2,2,0,0,0,2-2V4a2,2,0,0,0-2-2H6A2,2,0,0,0,4,4v8a2,2,0,0,0,2,2h6V40a2,2,0,0,0,2,2H24v2a2,2,0,0,0,2,2H42a2,2,0,0,0,2-2V36a2,2,0,0,0-2-2H26a2,2,0,0,0-2,2v2H16V26h8v2A2,2,0,0,0,26,30Zm2-8H40v4H28ZM8,6H20v4H8ZM28,38H40v4H28Z" />
    </svg>
  )
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'h-5 w-5'}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 10V20M3 15L21 15M3 10H21M6.2 20H17.8C18.9201 20 19.4802 20 19.908 19.782C20.2843 19.5903 20.5903 19.2843 20.782 18.908C21 18.4802 21 17.9201 21 16.8V7.2C21 6.0799 21 5.51984 20.782 5.09202C20.5903 4.71569 20.2843 4.40973 19.908 4.21799C19.4802 4 18.9201 4 17.8 4H6.2C5.0799 4 4.51984 4 4.09202 4.21799C3.71569 4.40973 3.40973 4.71569 3.21799 5.09202C3 5.51984 3 6.07989 3 7.2V16.8C3 17.9201 3 18.4802 3.21799 18.908C3.40973 19.2843 3.71569 19.5903 4.09202 19.782C4.51984 20 5.07989 20 6.2 20Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Simple SVG tree view helper (no external lib) -------------------------------------------------
type TreeNode = {
  id: string
  name: string
  depth: number
  children?: TreeNode[]
  taxon?: Taxon
}

function buildTreeFromTaxons(taxons: Taxon[]): TreeNode {
  const root: TreeNode = { id: 'root', name: 'root', depth: 0, children: [] }

  // Build a nested hierarchy: subfamily -> tribe -> genus -> subgenus -> speciesGroup -> species
  for (const t of taxons) {
    const sub = t.subfamily || '—'
    const tribe = t.tribe || '—'
    const genus = t.genus || '—'
    const subgenus = t.subgenus || '—'
    const speciesGroup = t.speciesGroup || '—'

    // find or create subfamily node
    let subNode = root.children!.find((n) => n.name === sub)
    if (!subNode) {
      subNode = { id: `sub:${sub}`, name: sub, depth: 1, children: [] }
      root.children!.push(subNode)
    }

    // tribe
    let tribeNode = subNode.children!.find((n) => n.name === tribe)
    if (!tribeNode) {
      tribeNode = {
        id: `tribe:${sub}:${tribe}`,
        name: tribe,
        depth: 2,
        children: [],
      }
      subNode.children!.push(tribeNode)
    }

    // genus
    let genusNode = tribeNode.children!.find((n) => n.name === genus)
    if (!genusNode) {
      genusNode = {
        id: `gen:${sub}:${tribe}:${genus}`,
        name: genus,
        depth: 3,
        children: [],
      }
      tribeNode.children!.push(genusNode)
    }

    // subgenus
    let subgenusNode = genusNode.children!.find((n) => n.name === subgenus)
    if (!subgenusNode) {
      subgenusNode = {
        id: `subgen:${sub}:${tribe}:${genus}:${subgenus}`,
        name: subgenus,
        depth: 4,
        children: [],
      }
      genusNode.children!.push(subgenusNode)
    }

    // species group
    let sgNode = subgenusNode.children!.find((n) => n.name === speciesGroup)
    if (!sgNode) {
      sgNode = {
        id: `sg:${sub}:${tribe}:${genus}:${subgenus}:${speciesGroup}`,
        name: speciesGroup,
        depth: 5,
        children: [],
      }
      subgenusNode.children!.push(sgNode)
    }

    // species leaf
    const speciesLabel = t.species || ''
    const speciesNode: TreeNode = {
      id: `sp:${t.id}`,
      name: speciesLabel,
      depth: 6,
      taxon: t,
    }
    sgNode.children = sgNode.children || []
    sgNode.children.push(speciesNode)
  }

  return root
}

function TreeView({
  root,
  onNodeClick,
}: {
  root: TreeNode
  onNodeClick: (node: TreeNode, coords?: { x: number; y: number }) => void
}) {
  // flatten leaves to compute layout
  const leaves: TreeNode[] = []
  function collectLeaves(node: TreeNode) {
    if (!node.children || node.children.length === 0) {
      leaves.push(node)
      return
    }
    for (const c of node.children) collectLeaves(c)
  }
  collectLeaves(root)

  const rowHeight = 36
  const maxDepth = 6
  const depthX = (d: number) => 40 + (d - 1) * 160
  const width = Math.max(800, (maxDepth + 1) * 160)
  const height = Math.max(200, (leaves.length + 1) * rowHeight)

  // assign y positions to leaves and compute internal nodes position as average
  const yMap = new Map<TreeNode, number>()
  let index = 0
  for (const leaf of leaves) {
    yMap.set(leaf, 30 + index * rowHeight)
    index += 1
  }

  function computeInternalY(node: TreeNode): number {
    if (!node.children || node.children.length === 0) return yMap.get(node) ?? 0
    const ys = node.children.map((c) => computeInternalY(c))
    const avg = ys.reduce((a, b) => a + b, 0) / ys.length
    yMap.set(node, avg)
    return avg
  }
  computeInternalY(root)

  // build lines and nodes list
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  const nodes: Array<{ node: TreeNode; x: number; y: number }> = []

  function walk(node: TreeNode) {
    const x = depthX(node.depth)
    const y = yMap.get(node) ?? 0
    nodes.push({ node, x, y })
    if (node.children) {
      for (const c of node.children) {
        const cx = depthX(c.depth)
        const cy = yMap.get(c) ?? 0
        lines.push({ x1: x + 60, y1: y, x2: cx - 10, y2: cy })
        walk(c)
      }
    }
  }
  walk(root)

  // Pan & zoom simple implementation
  const [tx, setTx] = useState(20)
  const [ty, setTy] = useState(20)
  const [scale, setScale] = useState(1)
  const dragging = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  function clampScale(nextScale: number) {
    return Math.max(0.4, Math.min(3, nextScale))
  }

  function zoomBy(factor: number) {
    setScale((current) => clampScale(current * factor))
  }

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true
    ;(e.target as Element).setPointerCapture(e.pointerId)
    last.current = { x: e.clientX, y: e.clientY }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !last.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    setTx((v) => v + dx)
    setTy((v) => v + dy)
    last.current = { x: e.clientX, y: e.clientY }
  }
  function onPointerUp(_e: React.PointerEvent) {
    dragging.current = false
    last.current = null
  }
  // wheel/pinch handlers intentionally removed — zoom only via buttons

  return (
    <div
      className="rounded-lg p-3"
      style={{
        border: '1px solid var(--app-border)',
        background: 'var(--app-surface)',
        color: 'var(--app-text)',
      }}
    >
      <div
        style={{
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          alignItems: 'center',
          fontSize: 13,
          color: 'var(--app-text-soft)',
        }}
      >
        <div>
          Vue arborescente — cliquez sur un taxon pour voir le détail. Utilisez
          la molette pour zoomer et glisser pour vous déplacer.
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => zoomBy(0.85)}
            aria-label="Dézoomer l’arbre"
            style={{
              border: '1px solid var(--app-border)',
              background: 'var(--app-surface-strong)',
              color: 'var(--app-text)',
              padding: '6px 8px',
              fontSize: 12,
              borderRadius: 6,
            }}
          >
            −
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1.15)}
            aria-label="Zoomer l’arbre"
            style={{
              border: '1px solid var(--app-border)',
              background: 'var(--app-surface-strong)',
              color: 'var(--app-text)',
              padding: '6px 8px',
              fontSize: 12,
              borderRadius: 6,
            }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setScale(1)}
            aria-label="Réinitialiser le zoom"
            style={{
              border: '1px solid var(--app-border)',
              background: 'var(--app-surface-strong)',
              color: 'var(--app-text)',
              padding: '6px 8px',
              fontSize: 12,
              borderRadius: 6,
            }}
          >
            ↺
          </button>
        </div>
      </div>

      <div
        style={{ width: '100%', overflow: 'hidden', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg width={Math.min(width, 1400)} height={height}>
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>
            {lines.map((l, i) => (
              <line
                key={i}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="var(--app-border)"
                strokeWidth={2}
              />
            ))}

            {nodes.map(({ node, x, y }) => {
              const name = node.name || ''
              const isPlaceholder =
                name === '-' || name === '—' || name.trim() === ''
              const clickable = !isPlaceholder

              return (
                <g
                  key={node.id}
                  transform={`translate(${x},${y})`}
                  style={{ cursor: clickable ? 'pointer' : 'default' }}
                  onClick={(e: React.MouseEvent) => {
                    if (!clickable) return
                    e.stopPropagation()
                    onNodeClick(node, { x: e.clientX, y: e.clientY })
                  }}
                >
                  <circle
                    r={node.taxon ? 8 : 6}
                    fill={
                      clickable ? 'var(--app-primary)' : 'var(--app-text-soft)'
                    }
                  />
                  <text
                    x={12}
                    y={6}
                    fontSize={12}
                    style={{
                      fill: clickable
                        ? 'var(--app-text)'
                        : 'var(--app-text-soft)',
                      fontWeight: 600,
                    }}
                  >
                    {name}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>
    </div>
  )
}

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
  anchor?: { x: number; y: number }
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

  if (
    reference.type === 'MYRMECOLOGY' &&
    !reference.url.startsWith('http://') &&
    !reference.url.startsWith('https://')
  ) {
    return `https://doi.org/${reference.url}`
  }

  return reference.url
}

function getTaxonsCacheKey(query: string) {
  return `${TAXONS_CACHE_PREFIX}${encodeURIComponent(query.trim().toLowerCase())}`
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
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(
    null,
  )
  const [isLoadingTaxons, setIsLoadingTaxons] = useState(true)
  const [isLoadingReferences, setIsLoadingReferences] = useState(true)
  const [isLoadingMoreTaxons, setIsLoadingMoreTaxons] = useState(false)
  const [hasMoreTaxons, setHasMoreTaxons] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [selectedDepartments, setSelectedDepartments] = useState<
    FrenchDepartmentCode[]
  >([])
  const [selectedSwarmingMonths, setSelectedSwarmingMonths] = useState<
    number[]
  >([])
  const [selectedInvasiveFilter, setSelectedInvasiveFilter] = useState<
    'all' | 'invasive' | 'non-invasive'
  >('all')
  const [treeMode, setTreeMode] = useState(false)
  const requestIdRef = useRef(0)
  const tableContainerRef = useRef<HTMLDivElement | null>(null)
  const [tableScrollTop, setTableScrollTop] = useState(0)
  const [tableViewportHeight, setTableViewportHeight] = useState(560)

  const rowHeight = 45
  const overscan = 10

  const loadAllTaxons = useCallback(async () => {
    const currentRequestId = requestIdRef.current + 1
    requestIdRef.current = currentRequestId
    const cacheKey = getTaxonsCacheKey(debouncedQuery)

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
      const firstPage = await api.get<TaxonsPageResponse>('/taxons', {
        params: { q: debouncedQuery, offset: 0 },
      })
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

        const nextPage = await api.get<TaxonsPageResponse>('/taxons', {
          params: { q: debouncedQuery, offset },
        })
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
  }, [debouncedQuery])

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
  }, [loadAllTaxons])

  async function openSelectedDetail(
    taxon: Taxon,
    level: 'subfamily' | 'genus' | 'subgenus' | 'speciesGroup' | 'species',
    value: string,
    detail: TaxonLevelDetail,
    coords?: { x: number; y: number },
  ) {
    setSelectedDetail({ taxon, level, value, detail, anchor: coords })
  }

  useEffect(() => {
    void loadAllTaxons()
  }, [loadAllTaxons])

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

    return references.filter((reference) =>
      reference.taxons.some((taxon) => taxon.id === selectedDetail.taxon.id),
    )
  }, [references, selectedDetail])

  const filteredTaxons = useMemo(() => {
    let filtered = taxons

    if (selectedDepartments.length > 0) {
      filtered = filtered.filter((taxon) => {
        const distribution = (taxon.distribution?.departments ??
          []) as unknown[]
        const codes = distribution.filter(
          (c) => typeof c === 'string',
        ) as FrenchDepartmentCode[]
        return codes.some((code) => selectedDepartments.includes(code))
      })
    }

    if (selectedSwarmingMonths.length > 0) {
      filtered = filtered.filter((taxon) => {
        if (
          taxon.swarmingStartMonth === null ||
          taxon.swarmingEndMonth === null
        )
          return false
        const start = taxon.swarmingStartMonth
        const end = taxon.swarmingEndMonth
        return selectedSwarmingMonths.some((month) =>
          start <= end
            ? month >= start && month <= end
            : month >= start || month <= end,
        )
      })
    }

    if (selectedInvasiveFilter === 'invasive') {
      filtered = filtered.filter((taxon) => taxon.invasive === true)
    } else if (selectedInvasiveFilter === 'non-invasive') {
      filtered = filtered.filter((taxon) => taxon.invasive === false)
    }

    return filtered
  }, [
    taxons,
    selectedDepartments,
    selectedSwarmingMonths,
    selectedInvasiveFilter,
  ])
  const activeFiltersCount =
    selectedDepartments.length +
    selectedSwarmingMonths.length +
    (selectedInvasiveFilter === 'all' ? 0 : 1)
  const visibleStartIndex = Math.max(
    Math.floor(tableScrollTop / rowHeight) - overscan,
    0,
  )
  const visibleEndIndex = Math.min(
    filteredTaxons.length,
    Math.ceil((tableScrollTop + tableViewportHeight) / rowHeight) + overscan,
  )
  const visibleTaxons = filteredTaxons.slice(visibleStartIndex, visibleEndIndex)
  const topSpacerHeight = visibleStartIndex * rowHeight
  const bottomSpacerHeight = Math.max(
    (taxons.length - visibleEndIndex) * rowHeight,
    0,
  )

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Taxons enregistrés
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="h-10 min-w-[260px] flex-1 rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700 placeholder:text-slate-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Recherche (sous-famille, genre, espèce...)"
        />
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="relative ml-2 mt-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <span>
              {showAdvancedOptions ? 'Masquer' : 'Options supplémentaires'}
            </span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-white text-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTreeMode((v) => !v)}
            title={
              treeMode
                ? 'Basculer en vue tableau'
                : 'Basculer en vue arborescente'
            }
            className="ml-2 rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
          >
            {treeMode ? <TableIcon /> : <TreeIcon />}
          </button>
        </div>
      </div>

      {showAdvancedOptions && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Période d'essaimage
              </label>
              <div className="flex flex-wrap gap-2">
                {monthLabels.map((month, index) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => {
                      const monthNum = index + 1
                      setSelectedSwarmingMonths((prev) =>
                        prev.includes(monthNum)
                          ? prev.filter((m) => m !== monthNum)
                          : [...prev, monthNum],
                      )
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      selectedSwarmingMonths.includes(index + 1)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {month.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Localisation
              </label>
              <FranceMap
                selectedDepartments={selectedDepartments}
                onToggleDepartment={(code) => {
                  setSelectedDepartments((prev) =>
                    prev.includes(code)
                      ? prev.filter((d) => d !== code)
                      : [...prev, code],
                  )
                }}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Invasivité
              </label>
              <div className="flex gap-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="invasive"
                    checked={selectedInvasiveFilter === 'all'}
                    onChange={() => setSelectedInvasiveFilter('all')}
                  />
                  <span>Toutes</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="invasive"
                    checked={selectedInvasiveFilter === 'invasive'}
                    onChange={() => setSelectedInvasiveFilter('invasive')}
                  />
                  <span>Invasives</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="invasive"
                    checked={selectedInvasiveFilter === 'non-invasive'}
                    onChange={() => setSelectedInvasiveFilter('non-invasive')}
                  />
                  <span>Non invasives</span>
                </label>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSwarmingMonths([])
                  setSelectedDepartments([])
                  setSelectedInvasiveFilter('all')
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        </div>
      )}
      <p className="mt-3 text-sm text-slate-600">
        {filteredTaxons.length} entrée{filteredTaxons.length > 1 ? 's' : ''}{' '}
        trouvée{filteredTaxons.length > 1 ? 's' : ''}
      </p>

      {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}

      {isLoadingTaxons && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`taxons-skeleton-${index}`}
              className="h-10 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      )}

      {!isLoadingTaxons && (
        <>
          {treeMode ? (
            <div className="mt-4">
              <TreeView
                root={buildTreeFromTaxons(filteredTaxons)}
                onNodeClick={(node, coords) => {
                  // find representative taxon for the node or its descendants
                  function findTaxon(n: TreeNode | undefined): Taxon | null {
                    if (!n) return null
                    if (n.taxon) return n.taxon
                    if (!n.children) return null
                    for (const c of n.children) {
                      const r = findTaxon(c)
                      if (r) return r
                    }
                    return null
                  }

                  const rep = node.taxon ?? findTaxon(node)
                  if (!rep) return

                  if (node.depth === 1) {
                    openSelectedDetail(
                      rep,
                      'subfamily',
                      node.name,
                      rep.levelDetails.subfamily,
                      coords,
                    )
                  } else if (node.depth === 2) {
                    // Tribe: map to subfamily detail (no tribe-level detail available)
                    openSelectedDetail(
                      rep,
                      'subfamily',
                      node.name,
                      rep.levelDetails.subfamily,
                      coords,
                    )
                  } else if (node.depth === 3) {
                    openSelectedDetail(
                      rep,
                      'genus',
                      node.name,
                      rep.levelDetails.genus,
                      coords,
                    )
                  } else if (node.depth === 4) {
                    openSelectedDetail(
                      rep,
                      'subgenus',
                      node.name,
                      rep.levelDetails.subgenus ?? {
                        description: null,
                        sizeWorker: null,
                        sizeQueen: null,
                        sizeMale: null,
                        criteria: [],
                      },
                      coords,
                    )
                  } else if (node.depth === 5) {
                    openSelectedDetail(
                      rep,
                      'speciesGroup',
                      node.name,
                      rep.levelDetails.speciesGroup ?? {
                        description: null,
                        sizeWorker: null,
                        sizeQueen: null,
                        sizeMale: null,
                        criteria: [],
                      },
                      coords,
                    )
                  } else {
                    openSelectedDetail(
                      rep,
                      'species',
                      rep.species,
                      rep.levelDetails.species,
                      coords,
                    )
                  }
                }}
              />
            </div>
          ) : (
            <div
              ref={tableContainerRef}
              className="mt-4 max-h-[65vh] -mx-6 overflow-auto rounded-lg border border-slate-200"
              onScroll={(event) =>
                setTableScrollTop(event.currentTarget.scrollTop)
              }
            >
              <table className="w-full text-left text-sm">
                <thead className="table-head-row">
                  <tr className="table-head-row">
                    <th className="table-head-sticky">Sous-famille</th>
                    <th className="table-head-sticky">Tribu</th>
                    <th className="table-head-sticky">Genre</th>
                    <th className="table-head-sticky">Sous-genre</th>
                    <th className="table-head-sticky">Groupe d'espèce</th>
                    <th className="table-head-sticky">Espèce</th>
                  </tr>
                </thead>
                <tbody>
                  {topSpacerHeight > 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ height: `${topSpacerHeight}px` }}
                      />
                    </tr>
                  )}
                  {visibleTaxons.map((taxon) => {
                    const subgenus = taxon.subgenus
                    const speciesGroup = taxon.speciesGroup
                    const subgenusDetail = taxon.levelDetails.subgenus
                    const speciesGroupDetail = taxon.levelDetails.speciesGroup

                    const subfamilyVal = taxon.subfamily || '-'
                    const tribeVal = taxon.tribe || '-'
                    const genusVal = taxon.genus || '-'
                    const subgenusVal = subgenus || '-'
                    const speciesGroupVal = speciesGroup || '-'
                    const speciesVal = taxon.species || '-'

                    const isClickable = (v: string) =>
                      v && v !== '-' && v !== '—'

                    return (
                      <tr key={taxon.id} className="border-b border-slate-100">
                        <td
                          className="max-w-[180px] whitespace-nowrap p-2 text-ellipsis overflow-hidden"
                          title={subfamilyVal}
                        >
                          {isClickable(subfamilyVal) ? (
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
                              {subfamilyVal}
                            </button>
                          ) : (
                            <span className="text-slate-500">
                              {subfamilyVal}
                            </span>
                          )}
                        </td>
                        <td
                          className="max-w-[160px] whitespace-nowrap p-2 text-ellipsis overflow-hidden"
                          title={tribeVal}
                        >
                          {tribeVal}
                        </td>
                        <td
                          className="max-w-[160px] whitespace-nowrap p-2 text-ellipsis overflow-hidden"
                          title={genusVal}
                        >
                          {isClickable(genusVal) ? (
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
                              <em>{genusVal}</em>
                            </button>
                          ) : (
                            <span className="text-slate-500">{genusVal}</span>
                          )}
                        </td>
                        <td
                          className="max-w-[140px] whitespace-nowrap p-2 text-ellipsis overflow-hidden"
                          title={subgenusVal}
                        >
                          {subgenus && subgenusDetail ? (
                            isClickable(subgenusVal) ? (
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
                                ({subgenusVal})
                              </button>
                            ) : (
                              <span className="text-slate-500">
                                ({subgenusVal})
                              </span>
                            )
                          ) : subgenus ? (
                            `(${subgenus})`
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td
                          className="max-w-[180px] whitespace-nowrap p-2 text-ellipsis overflow-hidden"
                          title={speciesGroupVal}
                        >
                          {speciesGroup && speciesGroupDetail ? (
                            isClickable(speciesGroupVal) ? (
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
                                {speciesGroupVal}
                              </button>
                            ) : (
                              <span className="text-slate-500">
                                {speciesGroupVal}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500">
                              {speciesGroupVal}
                            </span>
                          )}
                        </td>
                        <td
                          className="max-w-[180px] whitespace-nowrap p-2 text-ellipsis overflow-hidden"
                          title={speciesVal}
                        >
                          {isClickable(speciesVal) ? (
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
                              <em>{speciesVal}</em>
                            </button>
                          ) : (
                            <span className="text-slate-500">{speciesVal}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {bottomSpacerHeight > 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ height: `${bottomSpacerHeight}px` }}
                      />
                    </tr>
                  )}
                  {taxons.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-4 text-center text-slate-500"
                      >
                        Aucun taxon trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {isLoadingMoreTaxons && (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`taxons-loading-more-${index}`}
              className="h-8 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      )}
      {!isLoadingTaxons &&
        !isLoadingMoreTaxons &&
        !hasMoreTaxons &&
        taxons.length > 0 && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Fin de la liste.
          </p>
        )}

      {selectedDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelectedDetail(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-4 shadow-xl"
            style={
              selectedDetail.anchor && typeof window !== 'undefined'
                ? (() => {
                    const vh = window.innerHeight
                    const top = Math.min(
                      Math.max(selectedDetail.anchor.y, 12),
                      vh - 12,
                    )
                    return {
                      position: 'absolute',
                      left: '50%',
                      top: `${top}px`,
                      transform: 'translateX(-50%) translateY(-10%)',
                      maxWidth: 'min(90vw, 40rem)',
                    } as React.CSSProperties
                  })()
                : undefined
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-slate-900">
                {selectedDetail.level === 'subfamily'
                  ? 'Sous-famille'
                  : selectedDetail.level === 'genus'
                    ? 'Genre'
                    : selectedDetail.level === 'subgenus'
                      ? 'Sous-genre'
                      : selectedDetail.level === 'speciesGroup'
                        ? `Groupe d'espèces`
                        : 'Espèce'}{' '}
                :{' '}
                {selectedDetail.level === 'subfamily' ? (
                  selectedDetail.value
                ) : (
                  <em>{selectedDetail.value}</em>
                )}
              </p>
              <button
                className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-700"
                type="button"
                onClick={() => setSelectedDetail(null)}
              >
                Fermer
              </button>
            </div>

            <p className="mt-2 font-medium text-slate-900">Description</p>
            <p className="mt-1 text-slate-700">
              {selectedDetail.detail.description ?? 'Aucune description.'}
            </p>

            <p className="mt-3 font-medium text-slate-900">Caractéristiques</p>
            {selectedDetail.detail.criteria.length > 0 ||
            selectedDetail.detail.sizeWorker ||
            selectedDetail.detail.sizeQueen ||
            selectedDetail.detail.sizeMale ? (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                {(selectedDetail.detail.sizeWorker ||
                  selectedDetail.detail.sizeQueen ||
                  selectedDetail.detail.sizeMale) && (
                  <li>
                    Tailles :{' '}
                    {[
                      selectedDetail.detail.sizeWorker
                        ? `Ouvrière ${selectedDetail.detail.sizeWorker}`
                        : null,
                      selectedDetail.detail.sizeQueen
                        ? `Reine ${selectedDetail.detail.sizeQueen}`
                        : null,
                      selectedDetail.detail.sizeMale
                        ? `Mâle ${selectedDetail.detail.sizeMale}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' / ')}
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
                <p className="mt-3 font-medium text-slate-900">
                  Période d'essaimage
                </p>
                {selectedDetail.taxon.swarmingStartMonth &&
                selectedDetail.taxon.swarmingEndMonth ? (
                  (() => {
                    const startMonth = selectedDetail.taxon.swarmingStartMonth
                    const endMonth = selectedDetail.taxon.swarmingEndMonth
                    return (
                      <p className="mt-2 text-slate-700">
                        {monthLabels[startMonth - 1]} à{' '}
                        {monthLabels[endMonth - 1]}
                      </p>
                    )
                  })()
                ) : (
                  <p className="mt-2 text-slate-700">
                    Aucune période d'essaimage renseignée.
                  </p>
                )}
              </>
            )}

            <p className="mt-3 font-medium text-slate-900">Références liées</p>
            {isLoadingReferences && (
              <p className="mt-1 text-slate-700">Chargement des références…</p>
            )}
            {linkedReferences.length > 0 ? (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                {linkedReferences.map((reference) => {
                  const href = getReferenceHref(reference)
                  return (
                    <li key={reference.id}>
                      {href ? (
                        <a
                          className="text-indigo-700 underline"
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                        >
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

            {selectedDetail.taxon.confusions.length > 0 && (
              <>
                <p className="mt-3 font-medium text-slate-900">
                  Confusions possibles
                </p>
                <ul className="mt-1 space-y-2 text-slate-700">
                  {selectedDetail.taxon.confusions.map((confusion) => (
                    <li
                      key={confusion.id}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                    >
                      <p className="font-semibold">
                        Avec <em>{confusion.confusedTaxon.genus}</em>{' '}
                        <em>{confusion.confusedTaxon.species}</em>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {confusion.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {selectedDetail.level === 'species' && (
              <>
                <p className="mt-3 font-medium text-slate-900">
                  Aire de répartition
                </p>
                <div className="mt-1">
                  {(() => {
                    const raw = (selectedDetail.taxon.distribution
                      ?.departments ?? []) as unknown[]
                    const codes = raw.filter(
                      (c) => typeof c === 'string',
                    ) as FrenchDepartmentCode[]

                    if (codes.length === 0) {
                      return (
                        <p className="mt-1 text-slate-700">
                          Aucune aire de répartition renseignée.
                        </p>
                      )
                    }

                    return <FranceMap selectedDepartments={codes} readonly />
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
