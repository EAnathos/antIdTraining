import { useMemo, useState } from 'react'
import type { AdminUserPointsItem } from '../../types/models'

type Props = {
  users: AdminUserPointsItem[]
  setUserPoints: (id: string, points: number) => Promise<void>
}

type SortKey = 'username' | 'role' | 'points' | 'createdAt'

export function UserPointsPanel({ users, setUserPoints }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('points')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const sortDirectionMultiplier = sortDirection === 'asc' ? 1 : -1

  function handleSort(column: SortKey) {
    if (sortBy === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortBy(column)
    setSortDirection(column === 'points' ? 'desc' : 'asc')
  }

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return [...users]
      .filter((user) => {
        if (!normalizedSearch) return true
        return user.username.toLowerCase().includes(normalizedSearch)
      })
      .sort((a, b) => {
        let comparison = 0

        if (sortBy === 'username') {
          comparison = a.username.localeCompare(b.username, 'fr')
        } else if (sortBy === 'role') {
          comparison = a.role.localeCompare(b.role, 'fr')
        } else if (sortBy === 'points') {
          comparison = a.points - b.points
        } else {
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        }

        if (comparison !== 0) {
          return comparison * sortDirectionMultiplier
        }

        return a.username.localeCompare(b.username, 'fr')
      })
  }, [search, sortBy, sortDirectionMultiplier, users])

  function sortIndicator(column: SortKey) {
    if (sortBy !== column) {
      return '↕'
    }

    return sortDirection === 'asc' ? '↑' : '↓'
  }

  async function handleSave(userId: string, currentPoints: number) {
    if (savingUserId === userId) return

    const nextPoints = Number.parseInt(drafts[userId] ?? String(currentPoints), 10)
    if (!Number.isFinite(nextPoints)) return

    setSavingUserId(userId)
    try {
      await setUserPoints(userId, nextPoints)
      setDrafts((current) => ({ ...current, [userId]: String(nextPoints) }))
    } finally {
      setSavingUserId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">Points des utilisateurs</h3>
      <p className="text-sm text-slate-700">Modifiez les points des utilisateurs. Le total inclut les points gagnés aux jeux et les ajustements.</p>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600" htmlFor="admin-user-points-search">
          Rechercher un utilisateur
        </label>
        <input
          id="admin-user-points-search"
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 placeholder:text-slate-400 shadow-sm"
          type="search"
          placeholder="Nom d'utilisateur"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <p className="text-sm text-slate-600">Clique sur un en-tête pour trier le tableau.</p>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="user-points-table min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">
                <button className="flex items-center gap-2" type="button" onClick={() => handleSort('username')}>
                  Utilisateur <span className="text-xs">{sortIndicator('username')}</span>
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button className="flex items-center gap-2" type="button" onClick={() => handleSort('role')}>
                  Rôle <span className="text-xs">{sortIndicator('role')}</span>
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button className="flex items-center gap-2" type="button" onClick={() => handleSort('points')}>
                  Points <span className="text-xs">{sortIndicator('points')}</span>
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button className="flex items-center gap-2" type="button" onClick={() => handleSort('createdAt')}>
                  Créé le <span className="text-xs">{sortIndicator('createdAt')}</span>
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {filteredUsers.map((user) => {
              const draftValue = drafts[user.id] ?? String(user.points)

              return (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium max-w-0 truncate" title={user.username}>{user.username}</td>
                  <td className="px-4 py-3">{user.role === 'ADMIN' ? 'Admin' : 'User'}</td>
                  <td className="px-4 py-3">
                    <input
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-slate-700"
                      type="number"
                      placeholder={String(user.points)}
                      value={draftValue}
                      onChange={(event) => setDrafts((current) => ({ ...current, [user.id]: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void handleSave(user.id, user.points)
                        }
                      }}
                      title={`Points: ${user.points}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="w-full rounded-lg bg-slate-100 text-slate-900 border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 hover:bg-slate-200"
                      disabled={savingUserId === user.id}
                      onClick={() => void handleSave(user.id, user.points)}
                    >
                      {savingUserId === user.id ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </td>
                </tr>
              )
            })}

            {filteredUsers.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-700" colSpan={5}>
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}