import {
  AdminIconButton,
  ArrowDownIcon,
  ArrowUpIcon,
  TrashIcon,
} from './AdminIconButton'
import type { Taxon } from '../../types/models'

type LevelDetailDraft = {
  description: string
  sizeWorker: string
  sizeQueen: string
  sizeMale: string
  criteria: string[]
}

type TaxonDetailsDraft = {
  subfamily: LevelDetailDraft
  genus: LevelDetailDraft
  subgenus: LevelDetailDraft
  speciesGroup: LevelDetailDraft
  species: LevelDetailDraft
}

type SwarmingPeriodDraft = {
  swarmingStartMonth: number | null
  swarmingEndMonth: number | null
}

type TaxonDetailLevelKey = keyof TaxonDetailsDraft

type Props = {
  levelKey: TaxonDetailLevelKey
  levelDraft: LevelDetailDraft
  taxon: Taxon
  swarming: SwarmingPeriodDraft
  isMonthInSelectedRange: (month: number) => boolean
  isMonthRangeEndpoint: (month: number) => boolean
  onBeginSwarmingRangeSelection: (month: number) => void
  onContinueSwarmingRangeSelection: (month: number) => void
  onEndSwarmingRangeSelection: () => void
  onUpdateDescription: (levelKey: TaxonDetailLevelKey, value: string) => void
  onUpdateSize: (
    levelKey: TaxonDetailLevelKey,
    casteKey: 'sizeWorker' | 'sizeQueen' | 'sizeMale',
    value: string,
  ) => void
  onUpdateCriterion: (
    levelKey: TaxonDetailLevelKey,
    index: number,
    value: string,
  ) => void
  onMoveCriterion: (
    levelKey: TaxonDetailLevelKey,
    index: number,
    direction: -1 | 1,
  ) => void
  onRemoveCriterion: (levelKey: TaxonDetailLevelKey, index: number) => void
  onAddCriterion: (levelKey: TaxonDetailLevelKey) => void
}

const MONTH_OPTIONS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
] as const

function renderLevelTitle(levelKey: TaxonDetailLevelKey, taxon: Taxon) {
  if (levelKey === 'subfamily') {
    return <>Sous-famille ({taxon.subfamily})</>
  }

  if (levelKey === 'genus') {
    return (
      <>
        Genre (<em>{taxon.genus}</em>)
      </>
    )
  }

  if (levelKey === 'subgenus') {
    return <>Sous-genre ({taxon.subgenus ? <em>{taxon.subgenus}</em> : '-'})</>
  }

  if (levelKey === 'speciesGroup') {
    return (
      <>
        Groupe d'espèce (
        {taxon.speciesGroup ? <em>{taxon.speciesGroup}</em> : '-'})
      </>
    )
  }

  return (
    <>
      Espèce (<em>{taxon.genus}</em> <em>{taxon.species}</em>)
    </>
  )
}

export function TaxonLevelEditor({
  levelKey,
  levelDraft,
  taxon,
  swarming,
  isMonthInSelectedRange,
  isMonthRangeEndpoint,
  onBeginSwarmingRangeSelection,
  onContinueSwarmingRangeSelection,
  onEndSwarmingRangeSelection,
  onUpdateDescription,
  onUpdateSize,
  onUpdateCriterion,
  onMoveCriterion,
  onRemoveCriterion,
  onAddCriterion,
}: Props) {
  const isAutoCalculatedSize = levelKey !== 'species'
  const showAutoCalculatedSizeHint =
    levelKey === 'subfamily' || levelKey === 'genus'
  const canAutoSelectSwarming = levelKey === 'species'

  return (
    <div className="mb-4 rounded-lg border border-[color:var(--app-border)] p-3">
      <p className="font-medium text-[color:var(--app-text)]">
        {renderLevelTitle(levelKey, taxon)}
      </p>

      {canAutoSelectSwarming && (
        <div className="mt-3 mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--app-text)]">
            <span>Essaimage :</span>
            {swarming.swarmingStartMonth && swarming.swarmingEndMonth && (
              <>
                <span>
                  {MONTH_OPTIONS[swarming.swarmingStartMonth - 1].label} à{' '}
                  {MONTH_OPTIONS[swarming.swarmingEndMonth - 1].label}
                </span>
                <button
                  className="text-sm underline underline-offset-2"
                  type="button"
                  onClick={() => onEndSwarmingRangeSelection()}
                >
                  Réinitialiser
                </button>
              </>
            )}
          </div>
          <div
            className="grid grid-cols-12 justify-items-center gap-2"
            role="group"
            aria-label="Sélection période d'essaimage"
          >
            {MONTH_OPTIONS.map((month) => (
              <button
                key={month.value}
                type="button"
                title={month.label}
                aria-label={month.label}
                aria-pressed={isMonthInSelectedRange(month.value)}
                onPointerDown={() => onBeginSwarmingRangeSelection(month.value)}
                onPointerEnter={() =>
                  onContinueSwarmingRangeSelection(month.value)
                }
                onPointerUp={onEndSwarmingRangeSelection}
                className={`shrink-0 rounded-sm border transition ${
                  isMonthRangeEndpoint(month.value)
                    ? 'h-6 w-6 border-[color:var(--app-primary)] bg-[color:var(--app-primary)]'
                    : isMonthInSelectedRange(month.value)
                      ? 'h-4 w-4 border-[color:var(--app-primary)] bg-[color:var(--app-primary-soft)]'
                      : 'h-4 w-4 border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] hover:border-[color:var(--app-primary)]'
                }`}
              />
            ))}
          </div>
          <div
            className="grid grid-cols-12 justify-items-center gap-2 text-xs text-[color:var(--app-text-soft)]"
            aria-hidden
          >
            {MONTH_OPTIONS.map((month) => (
              <span key={`label-${month.value}`} className="w-6 text-center">
                {month.label.slice(0, 1)}
              </span>
            ))}
          </div>
        </div>
      )}

      <textarea
        className="ui-textarea mt-2 w-full"
        placeholder="Description"
        rows={2}
        value={levelDraft.description}
        onChange={(event) => onUpdateDescription(levelKey, event.target.value)}
      />

      {(levelKey === 'subfamily' ||
        levelKey === 'genus' ||
        levelKey === 'species') && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <input
            className={`ui-input ${isAutoCalculatedSize ? 'cursor-not-allowed opacity-50' : ''}`}
            placeholder={
              isAutoCalculatedSize ? undefined : 'Ouvrière (ex: 2-3 mm)'
            }
            value={levelDraft.sizeWorker}
            readOnly={isAutoCalculatedSize}
            disabled={isAutoCalculatedSize}
            title={isAutoCalculatedSize ? 'auto-calculé' : undefined}
            aria-label={isAutoCalculatedSize ? 'auto-calculé' : 'Ouvrière'}
            onChange={(event) =>
              onUpdateSize(levelKey, 'sizeWorker', event.target.value)
            }
          />
          <input
            className={`ui-input ${isAutoCalculatedSize ? 'cursor-not-allowed opacity-50' : ''}`}
            placeholder={
              isAutoCalculatedSize ? undefined : 'Reine (ex: 4-5 mm)'
            }
            value={levelDraft.sizeQueen}
            readOnly={isAutoCalculatedSize}
            disabled={isAutoCalculatedSize}
            title={isAutoCalculatedSize ? 'auto-calculé' : undefined}
            aria-label={isAutoCalculatedSize ? 'auto-calculé' : 'Reine'}
            onChange={(event) =>
              onUpdateSize(levelKey, 'sizeQueen', event.target.value)
            }
          />
          <input
            className={`ui-input ${isAutoCalculatedSize ? 'cursor-not-allowed opacity-50' : ''}`}
            placeholder={isAutoCalculatedSize ? undefined : 'Mâle (ex: 2-3 mm)'}
            value={levelDraft.sizeMale}
            readOnly={isAutoCalculatedSize}
            disabled={isAutoCalculatedSize}
            title={isAutoCalculatedSize ? 'auto-calculé' : undefined}
            aria-label={isAutoCalculatedSize ? 'auto-calculé' : 'Mâle'}
            onChange={(event) =>
              onUpdateSize(levelKey, 'sizeMale', event.target.value)
            }
          />
        </div>
      )}

      {showAutoCalculatedSizeHint && (
        <p className="mt-2 text-xs text-[color:var(--app-text-soft)]">
          Les tailles sont auto-calculées à partir des espèces enfants.
        </p>
      )}

      <div className="mt-2 space-y-2">
        {levelDraft.criteria.map((criterion, index) => (
          <div key={`${levelKey}-${index}`} className="flex gap-2">
            <input
              className="ui-input flex-1"
              placeholder="Critère"
              value={criterion}
              onChange={(event) =>
                onUpdateCriterion(levelKey, index, event.target.value)
              }
            />
            <AdminIconButton
              title="Monter"
              onClick={() => onMoveCriterion(levelKey, index, -1)}
              icon={<ArrowUpIcon />}
              disabled={index === 0}
            />
            <AdminIconButton
              title="Descendre"
              onClick={() => onMoveCriterion(levelKey, index, 1)}
              icon={<ArrowDownIcon />}
              disabled={index === levelDraft.criteria.length - 1}
            />
            <AdminIconButton
              title="Supprimer"
              tone="danger"
              onClick={() => onRemoveCriterion(levelKey, index)}
              icon={<TrashIcon />}
            />
          </div>
        ))}
      </div>

      <button
        className="ui-action ui-action--secondary mt-2"
        type="button"
        onClick={() => onAddCriterion(levelKey)}
      >
        + Ajouter un critère
      </button>
    </div>
  )
}
