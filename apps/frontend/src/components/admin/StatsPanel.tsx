import type { GameLevelStats, GameStatsPeriod } from '../../types/models'
import { useState } from 'react'
import { api } from '../../lib/api'

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
      setResetError(error instanceof Error && error.message ? error.message : 'Erreur lors de la réinitialisation')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Statistiques des parties */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Statistiques des parties</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-700">
              Période
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as GameStatsPeriod)}
                className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1"
              >
                <option value="all">Total</option>
                <option value="30d">30 jours</option>
                <option value="7d">7 jours</option>
              </select>
            </label>
            <button
              className="ml-4 rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
              onClick={() => setShowConfirm(true)}
              disabled={resetLoading}
              title="Réinitialiser toutes les statistiques"
            >
              Réinitialiser stats
            </button>
          </div>
        </div>

        {showConfirm && (
          <div className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-3">
            <span>Confirmer la réinitialisation des statistiques ?</span>
            <button
              className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 disabled:opacity-60"
              onClick={handleResetStats}
              disabled={resetLoading}
            >
              Oui, réinitialiser
            </button>
            <button
              className="rounded bg-slate-200 px-2 py-1 text-slate-800 hover:bg-slate-300"
              onClick={() => setShowConfirm(false)}
              disabled={resetLoading}
            >
              Annuler
            </button>
          </div>
        )}
        {resetError && <div className="mb-3 text-sm text-red-600">{resetError}</div>}

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Niveau</th>
                <th className="px-4 py-3 font-medium">Parties lancées</th>
                <th className="px-4 py-3 font-medium">Réponses finales</th>
                <th className="px-4 py-3 font-medium">Bonnes réponses finales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
              {levelsOrder.map((level) => {
                const item = statsByLevel.get(level)
                return (
                  <tr key={level}>
                    <td className="px-4 py-3 font-medium">{levelLabels[level]}</td>
                    <td className="px-4 py-3">{item?.launchedCount ?? 0}</td>
                    <td className="px-4 py-3">{item?.finalizedCount ?? 0}</td>
                    <td className="px-4 py-3">{item ? `${item.finalCorrectRate.toFixed(1)}%` : '0.0%'}</td>
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
