import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { AuthMeResponse, LeaderboardResponse } from '../types/models'
import { UserProfileModal } from '../components/UserProfileModal'

export function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUserPoints, setCurrentUserPoints] = useState<number | null>(
    null,
  )
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchData = async (cancelled: { value: boolean }) => {
    const token =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('antidtraining-auth-token')
        : null
    const authApi = token
      ? api.create({ headers: { Authorization: `Bearer ${token}` } })
      : api

    try {
      const leaderboardPromise = api.get<LeaderboardResponse>(
        '/stats/leaderboard',
        { params: { limit: 20 } },
      )
      const currentUserPromise = authApi
        .get<AuthMeResponse>('/auth/me')
        .catch(() => null)

      const [leaderboardResponse, currentUserResponse] = await Promise.all([
        leaderboardPromise,
        currentUserPromise,
      ])

      if (cancelled.value) {
        return
      }

      setData(leaderboardResponse.data)
      setCurrentUserPoints(currentUserResponse?.data.points ?? null)
    } catch (err) {
      if (!cancelled.value) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'Impossible de charger le classement.',
        )
        setCurrentUserPoints(null)
      }
    } finally {
      if (!cancelled.value) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const cancelled = { value: false }
    void fetchData(cancelled)

    return () => {
      cancelled.value = true
    }
  }, [])

  // Refetch points when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const cancelled = { value: false }
        void fetchData(cancelled)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Refetch points when user points are changed from admin panel
  useEffect(() => {
    const handlePointsChanged = () => {
      const cancelled = { value: false }
      void fetchData(cancelled)
    }

    window.addEventListener(
      'antidtraining-user-points-changed',
      handlePointsChanged,
    )

    return () => {
      window.removeEventListener(
        'antidtraining-user-points-changed',
        handlePointsChanged,
      )
    }
  }, [])

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Classement</h2>
      <p className="text-sm text-slate-600">
        Les meilleurs joueurs selon leurs points. Les points proviennent des
        réponses correctes et des ajustements administrateur. Il vous faut 200
        points pour apparaître dans le classement.
      </p>

      {currentUserPoints !== null && (
        <div className="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          Vos points actuels :{' '}
          <span className="font-semibold">{currentUserPoints}</span>
        </div>
      )}

      {loading && <p className="text-sm text-slate-600">Chargement…</p>}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

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
                <tr
                  key={item.userId}
                  className={index < 3 ? 'bg-amber-50/40' : ''}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUsername(item.username)
                        setModalOpen(true)
                      }}
                      className="text-slate-900 hover:text-blue-600 hover:underline cursor-pointer"
                    >
                      {item.username}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.gamesPlayed}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.correctCount}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {item.points}
                  </td>
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

      <UserProfileModal
        username={selectedUsername || ''}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </section>
  )
}
