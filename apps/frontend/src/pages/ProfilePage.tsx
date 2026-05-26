import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { AuthMeResponse } from '../types/models'

export function ProfilePage() {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('antidtraining-auth-token') : null
  const [profile, setProfile] = useState<AuthMeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    const authApi = api.create({ headers: { Authorization: `Bearer ${token}` } })
    authApi
      .get<AuthMeResponse>('/auth/me')
      .then((response) => {
        setProfile(response.data)
      })
      .catch((err) => {
        setError(err instanceof Error && err.message ? err.message : 'Impossible de charger le profil.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => undefined)
    window.localStorage.removeItem('antidtraining-auth-token')
    window.localStorage.removeItem('antidtraining-auth-role')
    window.localStorage.removeItem('antidtraining-auth-username')
    window.localStorage.removeItem('antidtraining-auth-email')
    window.dispatchEvent(new Event('antidtraining-auth-changed'))
    navigate('/connexion', { replace: true })
  }

  if (!token) {
    return <Navigate to="/connexion" replace />
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Chargement du profil…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Profil</h2>
        <p className="mt-3 text-sm text-red-600">{error}</p>
        <button className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white" type="button" onClick={() => void handleLogout()}>
          Se déconnecter
        </button>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Profil</h2>

      <dl className="mt-4 space-y-3 text-sm text-slate-700">
        <div>
          <dt className="font-medium text-slate-500">Nom d’utilisateur</dt>
          <dd>{profile?.username ?? 'Non renseigné'}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Adresse e-mail</dt>
          <dd>{profile?.email ?? 'Non renseignée'}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Rôle</dt>
          <dd>{profile?.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Points</dt>
          <dd>{profile?.points ?? 0}</dd>
        </div>
      </dl>

      <button className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700" type="button" onClick={() => void handleLogout()}>
        Se déconnecter
      </button>
    </section>
  )
}
