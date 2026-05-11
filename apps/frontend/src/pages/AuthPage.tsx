import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { AuthResponse } from '../types/models'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [role, setRole] = useState<'ADMIN' | 'USER' | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [error, setError] = useState('')

  function persistAuth(roleValue: 'ADMIN' | 'USER', token: string, name: string) {
    window.localStorage.setItem('antidtraining-auth-token', token)
    window.localStorage.setItem('antidtraining-auth-role', roleValue)
    window.localStorage.setItem('antidtraining-auth-username', name)
    window.dispatchEvent(new Event('antidtraining-auth-changed'))
  }

  function clearAuth() {
    window.localStorage.removeItem('antidtraining-auth-token')
    window.localStorage.removeItem('antidtraining-auth-role')
    window.localStorage.removeItem('antidtraining-auth-username')
    window.dispatchEvent(new Event('antidtraining-auth-changed'))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const { data } = await api.post<AuthResponse>(endpoint, { username, password })
      persistAuth(data.role, data.token, username)
      setLoggedIn(true)
      setRole(data.role)
      setDisplayName(username)
      navigate(data.role === 'ADMIN' ? '/admin' : '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Identifiants invalides')
    }
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => undefined)
    clearAuth()
    setLoggedIn(false)
    setRole(null)
    setDisplayName(null)
    setUsername('')
    setPassword('')
  }

  if (loggedIn && role === 'ADMIN') {
    return <Navigate to="/admin" replace />
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Connexion</h2>
      <p className="mt-2 text-sm text-slate-600">Vous pouvez jouer sans être connecté. Créez un compte joueur si vous voulez suivre votre progression dans le classement.</p>

      {loggedIn && role === 'USER' && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Connecté{displayName ? ` en tant que ${displayName}` : ''}.
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="rounded-lg bg-emerald-700 px-3 py-2 text-white" type="button" onClick={() => navigate('/', { replace: true })}>
              Jouer
            </button>
            <button className="rounded-lg bg-slate-200 px-3 py-2 text-slate-900" type="button" onClick={() => void logout()}>
              Se déconnecter
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm ${mode === 'login' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          onClick={() => setMode('login')}
        >
          Se connecter
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm ${mode === 'register' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          onClick={() => setMode('register')}
        >
          Créer un compte
        </button>
      </div>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <input
          className="w-full rounded-lg border border-slate-300 p-2"
          placeholder="Nom d'utilisateur"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border border-slate-300 p-2"
          placeholder="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white" type="submit">
          {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  )
}