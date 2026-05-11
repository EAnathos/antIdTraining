import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { LeaderboardResponse } from '../types/models'

export function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    void api
      .get<LeaderboardResponse>('/stats/leaderboard', { params: { limit: 20 } })
      .then((response) => {
        if (!cancelled) {
          setData(response.data)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error && err.message ? err.message : 'Impossible de charger le classement.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Classement</h2>
      <p className="text-sm text-slate-600">
        Le classement est basé sur les parties terminées. Le nombre de points gagnés ou perdus dépend du niveau de difficulté.
        Seuls les joueurs ayant plus de 200 points apparaissent ici.
      </p>

      {loading && <p className="text-sm text-slate-600">Chargement…</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {data && (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Joueur</th>
                <th className="px-4 py-3">Parties</th>
                <th className="px-4 py-3">Bonnes réponses</th>
                <th className="px-4 py-3">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.items.map((item, index) => (
                <tr key={item.userId} className={index < 3 ? 'bg-amber-50/40' : ''}>
                  <td className="px-4 py-3 font-medium text-slate-900">{index + 1}</td>
                  <td className="px-4 py-3 text-slate-900">{item.username}</td>
                  <td className="px-4 py-3 text-slate-700">{item.gamesPlayed}</td>
                  <td className="px-4 py-3 text-slate-700">{item.correctCount}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.points}</td>
                </tr>
              ))}
              {!data.items.length && (
                <tr>
                  <td className="px-4 py-4 text-slate-600" colSpan={5}>
                    Aucun joueur classé pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}