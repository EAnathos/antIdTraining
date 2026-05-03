import { FRENCH_REGIONS, type FrenchRegionCode, getRegionLabel } from '../lib/frenchRegions'

type Props = {
  selectedRegions: FrenchRegionCode[]
  onToggleRegion?: (regionCode: FrenchRegionCode) => void
  readonly?: boolean
}

type RegionShape = {
  code: FrenchRegionCode
  points: string
  labelX: number
  labelY: number
  labelDx?: number
  labelDy?: number
}

const REGION_SHAPES: RegionShape[] = [
  { code: 'BRE', points: '40,140 120,90 150,150 120,215 50,185', labelX: 87, labelY: 156 },
  { code: 'NOR', points: '120,85 240,65 285,115 250,170 150,150', labelX: 213, labelY: 120 },
  { code: 'HDF', points: '250,50 370,70 350,140 285,115 240,65', labelX: 303, labelY: 99 },
  { code: 'IDF', points: '230,155 295,145 315,200 260,235 215,195', labelX: 262, labelY: 196 },
  { code: 'PDL', points: '120,150 210,140 230,205 180,260 105,240 95,190', labelX: 163, labelY: 205 },
  { code: 'CVL', points: '210,140 295,145 320,210 255,275 180,260 230,205', labelX: 259, labelY: 220 },
  { code: 'NAQ', points: '55,215 180,260 175,395 90,455 35,350', labelX: 102, labelY: 329 },
  { code: 'BFC', points: '295,145 365,140 390,220 340,285 320,210', labelX: 347, labelY: 215 },
  { code: 'GES', points: '365,140 465,125 490,220 430,300 390,220', labelX: 428, labelY: 208 },
  { code: 'ARA', points: '320,210 430,300 390,460 300,420 255,275', labelX: 347, labelY: 341 },
  { code: 'OCC', points: '175,395 300,420 315,540 150,565 85,455', labelX: 219, labelY: 489 },
  { code: 'PAC', points: '390,460 475,485 455,600 355,595 330,530', labelX: 394, labelY: 542 },
  { code: 'COR', points: '495,560 535,545 555,595 520,630 485,605', labelX: 520, labelY: 591, labelDx: 0, labelDy: 0 },
]

function getRegionStyle(isSelected: boolean, readonly: boolean) {
  if (isSelected) {
    return 'fill-indigo-600 stroke-indigo-700'
  }

  return readonly ? 'fill-slate-100 stroke-slate-300' : 'fill-white stroke-slate-300 hover:fill-indigo-50 hover:stroke-indigo-400'
}

export function FranceMap({ selectedRegions, onToggleRegion = () => {}, readonly = false }: Props) {
  const selectedSet = new Set(selectedRegions)

  const activateRegion = (regionCode: FrenchRegionCode) => {
    if (!readonly) {
      onToggleRegion(regionCode)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 shadow-sm">
        <svg
          viewBox="0 0 600 700"
          className="h-auto w-full"
          role={readonly ? 'img' : 'group'}
          aria-label={readonly ? 'Aire de répartition' : 'Carte interactive de la France'}
        >
          <defs>
            <filter id="map-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.12" />
            </filter>
          </defs>

          <path
            d="M82 122 156 76 257 60 357 79 452 118 503 193 478 295 419 343 405 455 342 532 221 582 132 545 75 470 46 361 58 259 88 180 Z"
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="4"
            filter="url(#map-shadow)"
          />

          {REGION_SHAPES.map((region) => {
            const isSelected = selectedSet.has(region.code)
            const regionName = FRENCH_REGIONS[region.code]?.name ?? getRegionLabel(region.code)
            return (
              <g key={region.code}>
                <polygon
                  points={region.points}
                  className={getRegionStyle(isSelected, readonly)}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  style={{ cursor: readonly ? 'default' : 'pointer', transition: 'fill 120ms ease, stroke 120ms ease' }}
                  tabIndex={readonly ? -1 : 0}
                  role={readonly ? undefined : 'button'}
                  aria-label={regionName}
                  aria-pressed={isSelected}
                  onClick={() => activateRegion(region.code)}
                  onKeyDown={(event) => {
                    if (readonly) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      activateRegion(region.code)
                    }
                  }}
                />
                <text
                  x={region.labelX + (region.labelDx ?? 0)}
                  y={region.labelY + (region.labelDy ?? 0)}
                  textAnchor="middle"
                  className={`${isSelected ? 'fill-white' : 'fill-slate-700'} select-none text-[18px] font-semibold`}
                  pointerEvents="none"
                >
                  {region.code}
                </text>
              </g>
            )
          })}

          <g pointerEvents="none">
            <text x="74" y="640" className="fill-slate-500 text-[12px] font-medium">Cliquez sur les régions pour indiquer la présence</text>
          </g>
        </svg>
      </div>

      {selectedRegions.length > 0 && (
        <div className="rounded-lg bg-indigo-50 p-3">
          <p className="text-sm font-medium text-slate-700">
            Régions sélectionnées ({selectedRegions.length})
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
