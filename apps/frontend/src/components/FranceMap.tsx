import { getDepartmentLabel, getDepartmentMapData, type FrenchDepartmentCode } from '../lib/frenchDepartments'

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
            const isSelected = selectedSet.has(location.id)
            const departmentName = getDepartmentLabel(location.id)

            return (
              <path
                key={location.id}
                d={location.path}
                className={getDepartmentStyle(isSelected, readonly)}
                strokeWidth="1.25"
                strokeLinejoin="round"
                style={{ cursor: readonly ? 'default' : 'pointer', transition: 'fill 120ms ease, stroke 120ms ease' }}
                tabIndex={readonly ? -1 : 0}
                role={readonly ? undefined : 'button'}
                aria-label={departmentName}
                aria-pressed={isSelected}
                onClick={() => activateDepartment(location.id)}
                onKeyDown={(event) => {
                  if (readonly) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    activateDepartment(location.id)
                  }
                }}
              >
                <title>{departmentName}</title>
              </path>
            )
          })}

          <g pointerEvents="none">
            <text x="18" y="570" className="fill-slate-500 text-[11px] font-medium">
              Cliquez sur un département pour l'ajouter ou le retirer
            </text>
          </g>
        </svg>
      </div>

      {selectedDepartments.length > 0 && (
        <div className="rounded-lg bg-indigo-50 p-3">
          <p className="text-sm font-medium text-slate-700">Départements sélectionnés ({selectedDepartments.length})</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedDepartments.map((code) => (
              <span key={code} className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
                {getDepartmentLabel(code)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
