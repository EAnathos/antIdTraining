import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { AUTH_ROLE_KEY } from '../lib/authKeys'
import { getErrorMessage } from '../lib/errorUtils'
import type { AuthMeResponse, LeaderboardResponse } from '../types/models'
import { UserProfileModal } from '../components/UserProfileModal'

const MEDALS = ['🥇', '🥈', '🥉']

function rankLabel(index: number): string {
  return MEDALS[index] ?? `#${index + 1}`
}

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
    try {
      const leaderboardPromise = api.get<LeaderboardResponse>(
        '/stats/leaderboard',
        { params: { limit: 20 } },
      )
      const isAuthenticated =
        typeof window !== 'undefined' &&
        !!window.localStorage.getItem(AUTH_ROLE_KEY)
      const currentUserPromise = isAuthenticated
        ? api.get<AuthMeResponse>('/auth/me').catch(() => null)
        : Promise.resolve(null)

      const [leaderboardResponse, currentUserResponse] = await Promise.all([
        leaderboardPromise,
        currentUserPromise,
      ])

      if (cancelled.value) return

      setData(leaderboardResponse.data)
      setCurrentUserPoints(currentUserResponse?.data.points ?? null)
    } catch (err) {
      if (!cancelled.value) {
        setError(getErrorMessage(err, 'Impossible de charger le classement.'))
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
      if (!document.hidden) void fetchData({ value: false })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const handlePointsChanged = () => void fetchData({ value: false })
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

  function openModal(username: string) {
    setSelectedUsername(username)
    setModalOpen(true)
  }

  return (
    <section className="surface-panel surface-panel--solid p-6 overflow-hidden">
      <h2 className="text-xl font-semibold text-[color:var(--app-text)]">
        Classement
      </h2>
      <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
        Les meilleurs joueurs selon leurs points. Les points proviennent des
        réponses correctes et des ajustements administrateur. Il vous faut 200
        points pour apparaître dans le classement.
      </p>

      {currentUserPoints !== null && (
        <div className="mt-4 ui-alert ui-alert--info">
          Vos points actuels :{' '}
          <span className="font-semibold">{currentUserPoints}</span>
        </div>
      )}

      {loading && (
        <p className="mt-4 text-sm text-[color:var(--app-text-muted)]">
          Chargement…
        </p>
      )}
      {error && <p className="mt-4 ui-alert ui-alert--danger">{error}</p>}

      {data && (
        <>
          {/* ── Mobile card list (< 640px) ── */}
          <div className="mt-4 sm:hidden rounded-[var(--app-radius-xl)] border border-[color:var(--app-border)] overflow-hidden divide-y divide-[color:var(--app-border)]">
            {data.items.length === 0 ? (
              <p className="px-4 py-4 text-sm text-[color:var(--app-text-muted)]">
                Aucun joueur classé pour le moment.
              </p>
            ) : (
              data.items.map((item, index) => (
                <div
                  key={item.userId}
                  className={`leaderboard-card${index < 3 ? ' leaderboard-card--top' : ''}`}
                >
                  <span
                    className={`leaderboard-card__rank${index < 3 ? ' text-[color:var(--app-secondary)]' : ''}`}
                  >
                    {rankLabel(index)}
                  </span>
                  <button
                    type="button"
                    className="leaderboard-card__name"
                    onClick={() => openModal(item.username)}
                  >
                    {item.username}
                  </button>
                  <span className="leaderboard-card__points">
                    {item.points} pts
                  </span>
                </div>
              ))
            )}
          </div>

          {/* ── Desktop table (≥ 640px) ── */}
          <div className="mt-4 hidden sm:block overflow-auto rounded-[var(--app-radius-xl)] border border-[color:var(--app-border)]">
            <table className="field-table text-sm">
              <colgroup>
                <col style={{ width: '3rem' }} />
                <col />
                <col style={{ width: '6rem' }} />
                <col style={{ width: '9rem' }} />
                <col style={{ width: '6rem' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="table-head-sticky">#</th>
                  <th className="table-head-sticky">Joueur</th>
                  <th className="table-head-sticky">Parties</th>
                  <th className="table-head-sticky">Bonnes réponses</th>
                  <th className="table-head-sticky">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--app-border)]">
                {data.items.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-4 text-[color:var(--app-text-muted)]"
                      colSpan={5}
                    >
                      Aucun joueur classé pour le moment.
                    </td>
                  </tr>
                ) : (
                  data.items.map((item, index) => (
                    <tr
                      key={item.userId}
                      className={
                        index < 3
                          ? 'bg-[color:var(--app-warning-soft)]'
                          : undefined
                      }
                    >
                      <td
                        className={`taxon-td font-medium${index < 3 ? ' text-[color:var(--app-secondary)]' : ' text-[color:var(--app-text-soft)]'}`}
                      >
                        {rankLabel(index)}
                      </td>
                      <td className="taxon-td">
                        <button
                          type="button"
                          onClick={() => openModal(item.username)}
                          className="taxon-td-btn"
                        >
                          {item.username}
                        </button>
                      </td>
                      <td className="taxon-td text-[color:var(--app-text-muted)]">
                        {item.gamesPlayed}
                      </td>
                      <td className="taxon-td text-[color:var(--app-text-muted)]">
                        {item.correctCount}
                      </td>
                      <td className="taxon-td font-semibold text-[color:var(--app-text)]">
                        {item.points}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <UserProfileModal
        username={selectedUsername ?? ''}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </section>
  )
}
