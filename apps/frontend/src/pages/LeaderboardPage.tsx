import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { AUTH_ROLE_KEY } from '../lib/authKeys'
import { getErrorMessage } from '../lib/errorUtils'
import type { AuthMeResponse, LeaderboardResponse } from '../types/models'
import { UserProfileModal } from '../components/UserProfileModal'

const MEDALS = ['🥇', '🥈', '🥉']

function LeaderboardInfoTooltip() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (
        btnRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      )
        return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({
        top: r.bottom + window.scrollY + 6,
        left: r.left + window.scrollX,
      })
    }
    setOpen((v) => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="ml-2 w-5 h-5 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface)] text-[color:var(--app-text-muted)] text-xs font-semibold leading-none flex items-center justify-center hover:bg-[color:var(--app-surface-raised)] transition-colors"
        aria-label="Informations sur le classement"
      >
        ?
      </button>
      {open && (
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-50 w-72 rounded-[var(--app-radius-lg)] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] shadow-lg p-4 text-sm text-[color:var(--app-text-muted)]"
        >
          <p className="mb-3">
            Les meilleurs joueurs selon leurs points. Les points proviennent des
            réponses correctes. Il vous faut{' '}
            <span className="font-semibold text-[color:var(--app-text)]">
              200 points
            </span>{' '}
            pour apparaître dans le classement.
          </p>
          <p className="mb-2 font-semibold text-[color:var(--app-text)]">
            Points par niveau
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-[color:var(--app-text-soft)]">
                <th className="text-left pb-1 font-medium">Niveau</th>
                <th className="text-center pb-1 font-medium">Bonne réponse</th>
                <th className="text-center pb-1 font-medium">
                  Mauvaise réponse
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--app-border)]">
              {[
                { label: 'Facile', correct: '+5', wrong: '−2' },
                { label: 'Moyen', correct: '+10', wrong: '−5' },
                { label: 'Difficile', correct: '+15', wrong: '−5' },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="py-1">{row.label}</td>
                  <td className="py-1 text-center text-[color:var(--app-success)]">
                    {row.correct}
                  </td>
                  <td className="py-1 text-center text-[color:var(--app-danger)]">
                    {row.wrong}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

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
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-[color:var(--app-text)]">
          Classement
        </h2>
        <LeaderboardInfoTooltip />
      </div>

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
