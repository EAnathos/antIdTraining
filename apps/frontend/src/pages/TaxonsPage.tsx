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
  const root: TreeNode = {
    id: 'root',
    name: 'Formicidae',
    depth: 0,
    children: [],
  }

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
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const init = new Set<string>()
    const mark = (node: TreeNode) => {
      if (!node.children?.length) return
      if (node.depth >= 2) init.add(node.id)
      node.children.forEach(mark)
    }
    mark(root)
    return init
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(10)
  const [scale, setScale] = useState(1)
  const dragging = useRef(false)
  const hasDragged = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const activePointers = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  )
  const pinchStartDist = useRef<number | null>(null)
  const pinchStartScale = useRef<number>(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const MARGIN = 16

  const ROW_H = 30
  const COL_W = 150
  const NODE_W = 118
  const NODE_H = 22

  const { nodeList, pathList, svgHeight } = useMemo(() => {
    const visibleLeaves: TreeNode[] = []
    const collectVisible = (node: TreeNode) => {
      if (!node.children?.length || collapsed.has(node.id)) {
        visibleLeaves.push(node)
      } else {
        node.children.forEach(collectVisible)
      }
    }
    collectVisible(root)

    const ym = new Map<TreeNode, number>()
    visibleLeaves.forEach((leaf, i) => ym.set(leaf, i * ROW_H))

    const computeY = (node: TreeNode): number => {
      if (!node.children?.length || collapsed.has(node.id))
        return ym.get(node) ?? 0
      const ys = node.children.map(computeY)
      const avg = ys.reduce((a, b) => a + b, 0) / ys.length
      ym.set(node, avg)
      return avg
    }
    computeY(root)

    const nl: Array<{ node: TreeNode; x: number; y: number }> = []
    const pl: string[] = []

    const walk = (node: TreeNode) => {
      const x = 8 + node.depth * COL_W
      const y = ym.get(node) ?? 0
      nl.push({ node, x, y })
      if (node.children && !collapsed.has(node.id)) {
        for (const c of node.children) {
          const cx = 8 + c.depth * COL_W
          const cy = ym.get(c) ?? 0
          const mx = (x + NODE_W + cx) / 2
          pl.push(
            `M${x + NODE_W},${y + NODE_H / 2} H${mx} V${cy + NODE_H / 2} H${cx}`,
          )
          walk(c)
        }
      }
    }
    walk(root)

    const maxY = nl.reduce((m, { y }) => Math.max(m, y), 0)
    return {
      nodeList: nl,
      pathList: pl,
      svgHeight: Math.max(200, maxY + NODE_H + 30),
    }
  }, [root, collapsed])

  const selectedPath = useMemo(() => {
    if (!selectedId) return []
    const find = (node: TreeNode, target: string): TreeNode[] => {
      if (node.id === target) return [node]
      for (const c of node.children ?? []) {
        const sub = find(c, target)
        if (sub.length) return [node, ...sub]
      }
      return []
    }
    return find(root, selectedId)
  }, [root, selectedId])

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function collapseAll() {
    const next = new Set<string>()
    const mark = (node: TreeNode) => {
      if (!node.children?.length) return
      if (node.depth >= 2) next.add(node.id)
      node.children.forEach(mark)
    }
    mark(root)
    setCollapsed(next)
  }

  function onPointerDown(e: React.PointerEvent) {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointers.current.size === 1) {
      dragging.current = true
      hasDragged.current = false
      lastPos.current = { x: e.clientX, y: e.clientY }
    } else if (activePointers.current.size === 2) {
      dragging.current = false
      const pts = [...activePointers.current.values()]
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      pinchStartDist.current = Math.hypot(dx, dy)
      pinchStartScale.current = scale
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const cw = containerRef.current?.clientWidth ?? 400
    const ch = containerRef.current?.clientHeight ?? 400

    if (activePointers.current.size === 2) {
      const pts = [...activePointers.current.values()]
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      const dist = Math.hypot(dx, dy)
      if (pinchStartDist.current !== null && pinchStartDist.current > 0) {
        const nextScale = Math.max(
          0.2,
          Math.min(
            3,
            pinchStartScale.current * (dist / pinchStartDist.current),
          ),
        )
        setScale(nextScale)
      }
      return
    }

    if (!dragging.current || !lastPos.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true
    const sw = svgWidth * scale
    const sh = svgHeight * scale
    setTx((v) =>
      sw <= cw ? 0 : Math.max(cw - sw - MARGIN, Math.min(MARGIN, v + dx)),
    )
    setTy((v) =>
      sh <= ch ? 0 : Math.max(ch - sh - MARGIN, Math.min(MARGIN, v + dy)),
    )
    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  function onPointerUp(e: React.PointerEvent) {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size === 0) {
      dragging.current = false
      lastPos.current = null
      pinchStartDist.current = null
    } else if (activePointers.current.size === 1) {
      pinchStartDist.current = null
      dragging.current = true
      const remaining = [...activePointers.current.values()][0]
      lastPos.current = { x: remaining.x, y: remaining.y }
    }
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    setScale((s) => Math.max(0.2, Math.min(3, s * factor)))
  }

  const svgWidth = 8 + 7 * COL_W + NODE_W + 20
  const allExpanded = collapsed.size === 0

  // Auto-fit initial scale to container width on mount
  useEffect(() => {
    const cw = containerRef.current?.clientWidth
    if (!cw) return
    const fit = Math.min(1, (cw - MARGIN * 2) / svgWidth)
    if (fit < 1) setScale(parseFloat(fit.toFixed(2)))
  }, [svgWidth])

  // Re-clamp translation whenever scale or tree height changes
  useEffect(() => {
    const cw = containerRef.current?.clientWidth ?? 400
    const ch = containerRef.current?.clientHeight ?? 400
    const sw = svgWidth * scale
    const sh = svgHeight * scale
    setTx((v) =>
      sw <= cw ? 0 : Math.max(cw - sw - MARGIN, Math.min(MARGIN, v)),
    )
    setTy((v) =>
      sh <= ch ? 0 : Math.max(ch - sh - MARGIN, Math.min(MARGIN, v)),
    )
  }, [scale, svgHeight, svgWidth])

  return (
    <div
      className="rounded-lg"
      style={{
        border: '1px solid var(--app-border)',
        background: 'var(--app-surface)',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          padding: '6px 10px',
          borderBottom: '1px solid var(--app-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <p style={{ fontSize: 12, color: 'var(--app-text-soft)', margin: 0 }}>
          Appuyez sur un nœud pour voir le détail — le bouton +/− pour étendre
          ou réduire. Molette ou pincement pour zoomer, glisser pour naviguer.
        </p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            className="ui-action ui-action--secondary"
            onClick={() =>
              setScale((s) => Math.max(0.2, Math.min(3, s / 1.15)))
            }
            aria-label="Dézoomer"
          >
            −
          </button>
          <span
            style={{
              fontSize: 11,
              minWidth: 34,
              textAlign: 'center',
              color: 'var(--app-text-muted)',
            }}
          >
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className="ui-action ui-action--secondary"
            onClick={() =>
              setScale((s) => Math.max(0.2, Math.min(3, s * 1.15)))
            }
            aria-label="Zoomer"
          >
            +
          </button>
          <button
            type="button"
            className="ui-action ui-action--secondary"
            onClick={() => {
              setScale(1)
              setTx(0)
              setTy(10)
            }}
            title="Réinitialiser vue"
          >
            ↺
          </button>
          <button
            type="button"
            className="ui-action ui-action--secondary"
            onClick={allExpanded ? collapseAll : () => setCollapsed(new Set())}
          >
            {allExpanded ? 'Tout réduire' : 'Tout étendre'}
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {selectedPath.length > 0 && (
        <div
          style={{
            padding: '4px 10px',
            borderBottom: '1px solid var(--app-border)',
            fontSize: 12,
            display: 'flex',
            gap: 4,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {selectedPath.map((n, i) => (
            <span
              key={n.id}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {i > 0 && (
                <span style={{ color: 'var(--app-text-soft)' }}>›</span>
              )}
              <span
                style={{
                  color:
                    i === selectedPath.length - 1
                      ? 'var(--app-primary)'
                      : 'var(--app-text-muted)',
                  fontStyle: n.depth >= 3 ? 'italic' : 'normal',
                  fontWeight: i === selectedPath.length - 1 ? 600 : 400,
                }}
              >
                {n.name}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* SVG canvas */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: Math.min(svgHeight + 20, 540),
          overflow: 'clip',
          touchAction: 'none',
          cursor: 'grab',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ display: 'block', overflow: 'visible' }}
        >
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>
            {pathList.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="var(--app-border)"
                strokeWidth={1.5}
              />
            ))}

            {nodeList.map(({ node, x, y }) => {
              const name = node.name || ''
              const isPlaceholder =
                name === '-' || name === '—' || name.trim() === ''
              const hasChildren = (node.children?.length ?? 0) > 0
              const isCollapsed = collapsed.has(node.id)
              const isSelected = node.id === selectedId
              const isRoot = node.depth === 0
              const w = isRoot ? 104 : NODE_W

              const fill = isSelected
                ? 'var(--app-primary)'
                : isRoot
                  ? 'var(--app-primary-soft)'
                  : hasChildren
                    ? 'var(--app-surface-muted)'
                    : 'var(--app-surface-strong)'
              const stroke =
                isSelected || isRoot || hasChildren
                  ? 'var(--app-primary)'
                  : 'var(--app-border)'
              const textFill = isSelected
                ? '#fff'
                : isPlaceholder
                  ? 'var(--app-text-soft)'
                  : 'var(--app-text)'

              return (
                <g key={node.id} transform={`translate(${x},${y})`}>
                  {/* Node body — click opens detail */}
                  <g
                    style={{ cursor: isPlaceholder ? 'default' : 'pointer' }}
                    onClick={(e) => {
                      if (isPlaceholder || hasDragged.current) return
                      e.stopPropagation()
                      setSelectedId(node.id)
                      onNodeClick(node, { x: e.clientX, y: e.clientY })
                    }}
                  >
                    <rect
                      x={0}
                      y={0}
                      width={w}
                      height={NODE_H}
                      rx={4}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    <text
                      x={6}
                      y={NODE_H / 2 + 4}
                      fontSize={11}
                      fontStyle={
                        node.depth >= 3 && !isRoot ? 'italic' : 'normal'
                      }
                      fill={textFill}
                      style={{ userSelect: 'none' }}
                    >
                      {name}
                    </text>
                  </g>
                  {/* Collapse toggle — separate click target */}
                  {hasChildren && (
                    <g
                      role="button"
                      aria-label={
                        isCollapsed ? `Étendre ${name}` : `Réduire ${name}`
                      }
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        if (hasDragged.current) return
                        e.stopPropagation()
                        toggleCollapse(node.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleCollapse(node.id)
                        }
                      }}
                    >
                      <rect
                        x={w - 18}
                        y={2}
                        width={16}
                        height={NODE_H - 4}
                        rx={3}
                        fill={
                          isSelected
                            ? 'rgba(255,255,255,0.2)'
                            : 'var(--app-surface-strong)'
                        }
                        stroke={
                          isSelected
                            ? 'rgba(255,255,255,0.4)'
                            : 'var(--app-border)'
                        }
                        strokeWidth={1}
                      />
                      <text
                        x={w - 10}
                        y={NODE_H / 2 + 4}
                        fontSize={10}
                        fontWeight="bold"
                        textAnchor="middle"
                        fill={isSelected ? '#fff' : 'var(--app-primary)'}
                        style={{ userSelect: 'none' }}
                      >
                        {isCollapsed ? '+' : '−'}
                      </text>
                    </g>
                  )}
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
  const [showExtraColumns, setShowExtraColumns] = useState(false)
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
    (filteredTaxons.length - visibleEndIndex) * rowHeight,
    0,
  )

  return (
    <section className="surface-panel surface-panel--solid p-6">
      <h2 className="text-xl font-semibold text-[color:var(--app-text)]">
        Taxons enregistrés
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="ui-input h-10 min-w-[260px] flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Recherche (sous-famille, genre, espèce...)"
        />
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="relative ml-2 mt-0 inline-flex items-center gap-2 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-3 py-2 text-sm font-medium text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-muted)]"
          >
            <span>
              {showAdvancedOptions ? 'Masquer' : 'Options supplémentaires'}
            </span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--app-primary)] text-xs text-[color:var(--app-text-inverse)]">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {!treeMode && (
            <button
              type="button"
              onClick={() => setShowExtraColumns((v) => !v)}
              title={
                showExtraColumns
                  ? 'Masquer les colonnes secondaires'
                  : "Afficher tribu, sous-genre et groupe d'espèce"
              }
              className="sm:hidden ml-2 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-3 py-2 text-sm font-medium text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-muted)]"
            >
              {showExtraColumns ? '−' : '+'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setTreeMode((v) => !v)}
            title={
              treeMode
                ? 'Basculer en vue tableau'
                : 'Basculer en vue arborescente'
            }
            className="ml-2 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-2 text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-muted)]"
          >
            {treeMode ? <TableIcon /> : <TreeIcon />}
          </button>
        </div>
      </div>

      {showAdvancedOptions && (
        <div className="mt-4 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] p-4">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[color:var(--app-text)]">
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
                        ? 'bg-[color:var(--app-primary)] text-[color:var(--app-text-inverse)]'
                        : 'border border-[color:var(--app-border)] bg-[color:var(--app-surface)] text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-muted)]'
                    }`}
                  >
                    {month.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[color:var(--app-text)]">
                Localisation
              </label>
              <div className="max-w-lg">
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
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[color:var(--app-text)]">
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
                className="ui-action ui-action--secondary"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        </div>
      )}
      <p className="mt-3 text-sm text-[color:var(--app-text-muted)]">
        {filteredTaxons.length} entrée{filteredTaxons.length > 1 ? 's' : ''}{' '}
        trouvée{filteredTaxons.length > 1 ? 's' : ''}
      </p>

      {loadError && (
        <p className="mt-2 text-sm text-[color:var(--app-danger)]">
          {loadError}
        </p>
      )}

      {isLoadingTaxons && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`taxons-skeleton-${index}`}
              className="h-10 animate-pulse rounded-lg bg-[color:var(--app-surface-muted)]"
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
              className="-mx-6 mt-4 max-h-[65vh] overflow-auto rounded-lg border border-[color:var(--app-border)]"
              onScroll={(event) =>
                setTableScrollTop(event.currentTarget.scrollTop)
              }
            >
              <table className="w-full text-left text-sm">
                <thead className="table-head-row">
                  <tr className="table-head-row">
                    <th className="table-head-sticky">Sous-famille</th>
                    <th
                      className={`table-head-sticky taxons-extra-col${showExtraColumns ? '' : ' hidden sm:table-cell'}`}
                    >
                      Tribu
                    </th>
                    <th className="table-head-sticky">Genre</th>
                    <th
                      className={`table-head-sticky taxons-extra-col${showExtraColumns ? '' : ' hidden sm:table-cell'}`}
                    >
                      Sous-genre
                    </th>
                    <th
                      className={`table-head-sticky taxons-extra-col${showExtraColumns ? '' : ' hidden sm:table-cell'}`}
                    >
                      Groupe d'espèce
                    </th>
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
                      <tr
                        key={taxon.id}
                        className="border-b border-[color:var(--app-border)]"
                      >
                        <td
                          className="max-w-[180px] whitespace-nowrap p-2 text-ellipsis overflow-hidden"
                          title={subfamilyVal}
                        >
                          {isClickable(subfamilyVal) ? (
                            <button
                              className="max-w-[180px] whitespace-nowrap overflow-hidden text-ellipsis text-[color:var(--app-primary)] underline underline-offset-2"
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
                            <span className="text-[color:var(--app-text-soft)]">
                              {subfamilyVal}
                            </span>
                          )}
                        </td>
                        <td
                          className={`taxons-extra-col max-w-[160px] whitespace-nowrap p-2 text-ellipsis overflow-hidden${showExtraColumns ? '' : ' hidden sm:table-cell'}`}
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
                              className="max-w-[160px] whitespace-nowrap overflow-hidden text-ellipsis text-[color:var(--app-primary)] underline underline-offset-2"
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
                            <span className="text-[color:var(--app-text-soft)]">
                              {genusVal}
                            </span>
                          )}
                        </td>
                        <td
                          className={`taxons-extra-col max-w-[140px] whitespace-nowrap p-2 text-ellipsis overflow-hidden${showExtraColumns ? '' : ' hidden sm:table-cell'}`}
                          title={subgenusVal}
                        >
                          {subgenus && subgenusDetail ? (
                            isClickable(subgenusVal) ? (
                              <button
                                className="max-w-[140px] whitespace-nowrap overflow-hidden text-ellipsis text-[color:var(--app-primary)] underline underline-offset-2"
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
                              <span className="text-[color:var(--app-text-soft)]">
                                ({subgenusVal})
                              </span>
                            )
                          ) : subgenus ? (
                            `(${subgenus})`
                          ) : (
                            <span className="text-[color:var(--app-text-soft)]">
                              -
                            </span>
                          )}
                        </td>
                        <td
                          className={`taxons-extra-col max-w-[180px] whitespace-nowrap p-2 text-ellipsis overflow-hidden${showExtraColumns ? '' : ' hidden sm:table-cell'}`}
                          title={speciesGroupVal}
                        >
                          {speciesGroup && speciesGroupDetail ? (
                            isClickable(speciesGroupVal) ? (
                              <button
                                className="max-w-[180px] whitespace-nowrap overflow-hidden text-ellipsis text-[color:var(--app-primary)] underline underline-offset-2"
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
                              <span className="text-[color:var(--app-text-soft)]">
                                {speciesGroupVal}
                              </span>
                            )
                          ) : (
                            <span className="text-[color:var(--app-text-soft)]">
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
                              className="max-w-[180px] whitespace-nowrap overflow-hidden text-ellipsis text-[color:var(--app-primary)] underline underline-offset-2"
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
                            <span className="text-[color:var(--app-text-soft)]">
                              {speciesVal}
                            </span>
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
                        className="p-4 text-center text-[color:var(--app-text-soft)]"
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
              className="h-8 animate-pulse rounded-lg bg-[color:var(--app-surface-muted)]"
            />
          ))}
        </div>
      )}
      {!isLoadingTaxons &&
        !isLoadingMoreTaxons &&
        !hasMoreTaxons &&
        taxons.length > 0 && (
          <p className="mt-3 text-center text-xs text-[color:var(--app-text-soft)]">
            Fin de la liste.
          </p>
        )}

      {selectedDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedDetail(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-[color:var(--app-surface)] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[color:var(--app-border)] px-4 py-3">
              <p className="font-medium text-[color:var(--app-text)]">
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
                className="ui-button ui-button--secondary text-sm"
                type="button"
                onClick={() => setSelectedDetail(null)}
              >
                Fermer
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <p className="mt-2 font-medium text-[color:var(--app-text)]">
                Description
              </p>
              <p className="mt-1 text-[color:var(--app-text-muted)]">
                {selectedDetail.detail.description ?? 'Aucune description.'}
              </p>

              <p className="mt-3 font-medium text-[color:var(--app-text)]">
                Caractéristiques
              </p>
              {selectedDetail.detail.criteria.length > 0 ||
              selectedDetail.detail.sizeWorker ||
              selectedDetail.detail.sizeQueen ||
              selectedDetail.detail.sizeMale ? (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[color:var(--app-text-muted)]">
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
                <p className="mt-1 text-[color:var(--app-text-muted)]">
                  Aucun critère renseigné.
                </p>
              )}

              {selectedDetail.level === 'species' && (
                <>
                  <p className="mt-3 font-medium text-[color:var(--app-text)]">
                    Période d'essaimage
                  </p>
                  {selectedDetail.taxon.swarmingStartMonth &&
                  selectedDetail.taxon.swarmingEndMonth ? (
                    (() => {
                      const startMonth = selectedDetail.taxon.swarmingStartMonth
                      const endMonth = selectedDetail.taxon.swarmingEndMonth
                      return (
                        <p className="mt-2 text-[color:var(--app-text-muted)]">
                          {monthLabels[startMonth - 1]} à{' '}
                          {monthLabels[endMonth - 1]}
                        </p>
                      )
                    })()
                  ) : (
                    <p className="mt-2 text-[color:var(--app-text-muted)]">
                      Aucune période d'essaimage renseignée.
                    </p>
                  )}
                </>
              )}

              <p className="mt-3 font-medium text-[color:var(--app-text)]">
                Références liées
              </p>
              {isLoadingReferences && (
                <p className="mt-1 text-[color:var(--app-text-muted)]">
                  Chargement des références…
                </p>
              )}
              {linkedReferences.length > 0 ? (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[color:var(--app-text-muted)]">
                  {linkedReferences.map((reference) => {
                    const href = getReferenceHref(reference)
                    return (
                      <li key={reference.id}>
                        {href ? (
                          <a
                            className="text-[color:var(--app-primary)] underline"
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
                <p className="mt-1 text-[color:var(--app-text-muted)]">
                  Aucune référence liée.
                </p>
              )}

              {selectedDetail.level === 'species' &&
                selectedDetail.taxon.confusions.length > 0 && (
                  <>
                    <p className="mt-3 font-medium text-[color:var(--app-text)]">
                      Confusions possibles
                    </p>
                    <ul className="mt-1 space-y-2 text-[color:var(--app-text-muted)]">
                      {selectedDetail.taxon.confusions.map((confusion) => (
                        <li
                          key={confusion.id}
                          className="rounded-lg border border-[color:var(--app-warning)] bg-[color:var(--app-warning-soft)] px-3 py-2 text-sm text-[color:var(--app-warning)]"
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
                  <p className="mt-3 font-medium text-[color:var(--app-text)]">
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
                          <p className="mt-1 text-[color:var(--app-text-muted)]">
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
        </div>
      )}
    </section>
  )
}
