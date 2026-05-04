import { useLayoutEffect, useRef, useState } from 'react'
import { getDepartmentLabel, getDepartmentMapData, type FrenchDepartmentCode, IDF_CODE, IDF_DEPARTMENTS } from '../lib/frenchDepartments'

type Props = {
  selectedDepartments: FrenchDepartmentCode[]
  onToggleDepartment?: (departmentCode: FrenchDepartmentCode) => void
  readonly?: boolean
}

const MAP_DATA = getDepartmentMapData()

function getDepartmentStyle(isSelected: boolean, readonly: boolean) {
  if (isSelected) {
    return 'fill-indigo-600 stroke-indigo-800'
  }

  return readonly ? 'fill-slate-100 stroke-slate-300' : 'fill-white stroke-slate-300 hover:fill-indigo-50 hover:stroke-indigo-500'
}

export function FranceMap({ selectedDepartments, onToggleDepartment = () => {}, readonly = false }: Props) {
  const selectedSet = new Set(selectedDepartments)
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({})
  const [labelPositions, setLabelPositions] = useState<Record<string, { x: number; y: number }>>({})

  useLayoutEffect(() => {
    const nextPositions: Record<string, { x: number; y: number }> = {}

    for (const location of MAP_DATA.locations as Array<{ id: string; name: string; path?: string }>) {
      if (IDF_DEPARTMENTS.includes(location.id)) {
        continue
      }

      const node = pathRefs.current[location.id]
      if (!node) {
        continue
      }

      try {
        const bbox = node.getBBox()
        nextPositions[location.id] = {
          x: bbox.x + bbox.width / 2,
          y: bbox.y + bbox.height / 2,
        }
      } catch {
        // Ignore SVG measurement errors.
      }
    }

    setLabelPositions(nextPositions)
  }, [])

  const activateDepartment = (departmentCode: FrenchDepartmentCode) => {
    if (!readonly) {
      onToggleDepartment(departmentCode)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 shadow-sm">
        <svg
          viewBox={MAP_DATA.viewBox}
          className="h-auto w-full"
          role={readonly ? 'img' : 'group'}
          aria-label={readonly ? 'Aire de répartition' : 'Carte interactive de la France'}
        >
          {MAP_DATA.locations.map((location: { id: string; name: string; path?: string }) => {
            const isSelected =
              selectedSet.has(location.id) || (selectedSet.has(IDF_CODE) && IDF_DEPARTMENTS.includes(location.id))
            const departmentName = getDepartmentLabel(location.id)

            const handleClick = () => {
              if (IDF_DEPARTMENTS.includes(location.id)) {
                activateDepartment(IDF_CODE)
              } else {
                activateDepartment(location.id)
              }
            }

            return (
              <g key={location.id}>
                <path
                  ref={(node) => {
                    pathRefs.current[location.id] = node
                  }}
                  d={location.path}
                  className={getDepartmentStyle(isSelected, readonly)}
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                  style={{ cursor: readonly ? 'default' : 'pointer', transition: 'fill 120ms ease, stroke 120ms ease' }}
                  tabIndex={readonly ? -1 : 0}
                  role={readonly ? undefined : 'button'}
                  aria-label={departmentName}
                  aria-pressed={isSelected}
                  onClick={handleClick}
                  onKeyDown={(event) => {
                    if (readonly) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleClick()
                    }
                  }}
                >
                  <title>{departmentName}</title>
                </path>
                {!IDF_DEPARTMENTS.includes(location.id) && labelPositions[location.id] && (
                  <text
                    x={labelPositions[location.id].x}
                    y={labelPositions[location.id].y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-slate-700 text-[10px] font-semibold"
                    style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}
                  >
                    {location.id}
                  </text>
                )}
              </g>
            )
          })}

          {!readonly && (
            <g pointerEvents="none">
              <text x="18" y="570" className="fill-slate-500 text-[11px] font-medium">
                Cliquez sur un département pour l'ajouter ou le retirer
              </text>
            </g>
          )}
        </svg>
      </div>

    </div>
  )
}
