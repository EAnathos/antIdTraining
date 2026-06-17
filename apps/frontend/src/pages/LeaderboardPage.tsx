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

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void fetchData({ value: false })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const handlePointsChanged = () => {
      void fetchData({ value: false })
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
    <section className="surface-panel surface-panel--solid space-y-4 p-6">
      <h2 className="text-xl font-semibold text-[color:var(--app-text)]">
        Classement
      </h2>
      <p className="text-sm text-[color:var(--app-text-muted)]">
        Les meilleurs joueurs selon leurs points. Les points proviennent des
        réponses correctes et des ajustements administrateur. Il vous faut 200
        points pour apparaître dans le classement.
      </p>

      {currentUserPoints !== null && (
        <div className="ui-alert ui-alert--info">
          Vos points actuels :{' '}
          <span className="font-semibold">{currentUserPoints}</span>
        </div>
      )}

      {loading && (
        <p className="text-sm text-[color:var(--app-text-muted)]">
          Chargement…
        </p>
      )}
      {error && <p className="ui-alert ui-alert--danger">{error}</p>}

      {data && (
        <div className="w-full min-w-0 overflow-auto rounded-[var(--app-radius-xl)] border border-[color:var(--app-border)]">
          <table className="field-table text-sm">
            <colgroup>
              <col style={{ width: '3rem' }} />
              <col />
              <col
                className="hidden sm:table-column"
                style={{ width: '6rem' }}
              />
              <col
                className="hidden sm:table-column"
                style={{ width: '9rem' }}
              />
              <col style={{ width: '6rem' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="table-head-sticky">#</th>
                <th className="table-head-sticky">Joueur</th>
                <th className="table-head-sticky hidden sm:table-cell">
                  Parties
                </th>
                <th className="table-head-sticky hidden sm:table-cell">
                  Bonnes réponses
                </th>
                <th className="table-head-sticky">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--app-border)]">
              {data.items.map((item, index) => (
                <tr
                  key={item.userId}
                  className={
                    index < 3
                      ? 'bg-[color:var(--app-warning-soft)]'
                      : 'bg-[color:var(--app-surface)]'
                  }
                >
                  <td className="taxon-td font-medium text-[color:var(--app-text)]">
                    {index + 1}
                  </td>
                  <td className="taxon-td">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUsername(item.username)
                        setModalOpen(true)
                      }}
                      className="taxon-td-btn"
                    >
                      {item.username}
                    </button>
                  </td>
                  <td className="taxon-td hidden sm:table-cell text-[color:var(--app-text-muted)]">
                    {item.gamesPlayed}
                  </td>
                  <td className="taxon-td hidden sm:table-cell text-[color:var(--app-text-muted)]">
                    {item.correctCount}
                  </td>
                  <td className="taxon-td font-semibold text-[color:var(--app-text)]">
                    {item.points}
                  </td>
                </tr>
              ))}
              {!data.items.length && (
                <tr>
                  <td
                    className="px-4 py-4 text-[color:var(--app-text-muted)]"
                    colSpan={5}
                  >
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
