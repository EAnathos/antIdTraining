import { useMemo, useState } from 'react'
import type { AdminUserPointsItem } from '../../types/models'

type Props = {
  users: AdminUserPointsItem[]
  setUserPoints: (id: string, points: number) => Promise<void>
}

export function UserPointsPanel({ users, setUserPoints }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username, 'fr')),
    [users],
  )

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">Points des utilisateurs</h3>
      <p className="text-sm text-slate-600">Modifiez les points des utilisateurs. Le total inclut les points gagnés aux jeux et les ajustements.</p>

      <div className="space-y-3">
        {sortedUsers.map((user) => {
          const draftValue = drafts[user.id] ?? String(user.points)

          return (
            <div key={user.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-slate-900">{user.username}</p>
                <p className="text-xs text-slate-500">{user.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}</p>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <input
                  className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right"
                  type="number"
                  placeholder={String(user.points)}
                  value={draftValue}
                  onChange={(event) => setDrafts((current) => ({ ...current, [user.id]: event.target.value }))}
                  title={`Points: ${user.points}`}
                />

                <button
                  type="button"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={savingUserId === user.id}
                  onClick={async () => {
                    const nextPoints = Number.parseInt(drafts[user.id] ?? String(user.points), 10)
                    if (!Number.isFinite(nextPoints)) {
                      return
                    }

                    setSavingUserId(user.id)
                    try {
                      await setUserPoints(user.id, nextPoints)
                      setDrafts((current) => ({ ...current, [user.id]: String(nextPoints) }))
                    } finally {
                      setSavingUserId(null)
                    }
                  }}
                >
                  {savingUserId === user.id ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )
        })}

        {sortedUsers.length === 0 && <p className="text-sm text-slate-600">Aucun utilisateur trouvé.</p>}
      </div>
    </div>
  )
}