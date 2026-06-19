import type { GameLevelStats, GameStatsPeriod } from '../../types/models'
import { useState } from 'react'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errorUtils'

type Props = {
  stats: GameLevelStats[]
  period: GameStatsPeriod
  setPeriod: (value: GameStatsPeriod) => void
}

const levelLabels: Record<GameLevelStats['level'], string> = {
  easy: 'Simple',
  medium: 'Moyen',
  hard: 'Difficile',
}

const levelsOrder: GameLevelStats['level'][] = ['easy', 'medium', 'hard']

export function StatsPanel({ stats, period, setPeriod }: Props) {
  const statsByLevel = new Map(stats.map((item) => [item.level, item]))
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleResetStats() {
    setResetLoading(true)
    setResetError(null)
    try {
      await api.post('/admin/stats-tools/reset')
      setShowConfirm(false)
      window.location.reload()
    } catch (error: unknown) {
      setResetError(
        getErrorMessage(error, 'Erreur lors de la réinitialisation'),
      )
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Statistiques des parties */}
      <div className="surface-panel surface-panel--solid p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-lg font-semibold text-[color:var(--app-text)]">
            Statistiques des parties
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[color:var(--app-text-muted)]">
              Période
              <select
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value as GameStatsPeriod)
                }
                className="ui-select ml-2 py-1"
              >
                <option value="all">Total</option>
                <option value="30d">30 jours</option>
                <option value="7d">7 jours</option>
              </select>
            </label>
            <button
              className="ui-action ui-action--danger ml-4 disabled:opacity-60"
              onClick={() => setShowConfirm(true)}
              disabled={resetLoading}
              title="Réinitialiser toutes les statistiques"
            >
              Réinitialiser stats
            </button>
          </div>
        </div>

        {showConfirm && (
          <div className="ui-alert ui-alert--danger mb-3 flex items-center gap-3 text-sm">
            <span>Confirmer la réinitialisation des statistiques ?</span>
            <button
              className="ui-action ui-action--danger"
              onClick={handleResetStats}
              disabled={resetLoading}
            >
              Oui, réinitialiser
            </button>
            <button
              className="ui-action ui-action--secondary"
              onClick={() => setShowConfirm(false)}
              disabled={resetLoading}
            >
              Annuler
            </button>
          </div>
        )}
        {resetError && (
          <div className="ui-alert ui-alert--danger mb-3 text-sm">
            {resetError}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-[color:var(--app-border)]">
          <table className="min-w-full divide-y divide-[color:var(--app-border)] text-sm">
            <thead className="table-head-row">
              <tr className="table-head-row">
                <th className="table-head-sticky px-4 py-3 font-medium">
                  Niveau
                </th>
                <th className="table-head-sticky px-4 py-3 font-medium">
                  Parties lancées
                </th>
                <th className="table-head-sticky px-4 py-3 font-medium">
                  Réponses finales
                </th>
                <th className="table-head-sticky px-4 py-3 font-medium">
                  Bonnes réponses finales
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--app-border)] bg-[color:var(--app-surface)] text-[color:var(--app-text)]">
              {levelsOrder.map((level) => {
                const item = statsByLevel.get(level)
                return (
                  <tr key={level}>
                    <td className="px-4 py-3 font-medium">
                      {levelLabels[level]}
                    </td>
                    <td className="px-4 py-3">{item?.launchedCount ?? 0}</td>
                    <td className="px-4 py-3">{item?.finalizedCount ?? 0}</td>
                    <td className="px-4 py-3">
                      {item ? `${item.finalCorrectRate.toFixed(1)}%` : '0.0%'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
