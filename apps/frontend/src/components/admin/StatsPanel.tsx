import type { GameLevelStats, GameStatsPeriod } from '../../types/models'

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Statistiques des parties</h3>
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
      </div>

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
  )
}
