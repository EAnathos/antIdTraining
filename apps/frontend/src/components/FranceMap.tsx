import { FRENCH_REGIONS, type FrenchRegionCode, getRegionLabel } from '../lib/frenchRegions'

type Props = {
  selectedRegions: FrenchRegionCode[]
  onToggleRegion?: (regionCode: FrenchRegionCode) => void
  readonly?: boolean
}

export function FranceMap({ selectedRegions, onToggleRegion = () => {}, readonly = false }: Props) {
  const handleClick = (regionCode: FrenchRegionCode) => {
    if (!readonly) {
      onToggleRegion(regionCode)
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="grid grid-cols-4 gap-2"
        role={readonly ? undefined : 'group'}
        aria-label={readonly ? 'Aire de répartition' : 'Sélectionner les régions'}
      >
        {Object.entries(FRENCH_REGIONS).map(([code, region]) => {
          const regionCode = code as FrenchRegionCode
          const isSelected = selectedRegions.includes(regionCode)

          return (
            <button
              key={regionCode}
              type="button"
              onClick={() => handleClick(regionCode)}
              disabled={readonly}
              title={region.name}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md'
                  : `border-2 ${readonly ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'}`
              } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {region.label}
            </button>
          )
        })}
      </div>

      {selectedRegions.length > 0 && (
        <div className="rounded-lg bg-indigo-50 p-3">
          <p className="text-sm font-medium text-slate-700">
            Régions sélectionnées ({selectedRegions.length}):
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedRegions.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white"
              >
                {getRegionLabel(code)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
