import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<{ userId: string; role: string }>('/auth/me')
      .then((response) => {
        if (response.data.role === 'ADMIN') {
          setLoggedIn(true)
        }
      })
      .catch(() => {
        // No active admin session.
      })
      .finally(() => setCheckingSession(false))
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      const { data } = await api.post<{ token: string; role: string }>('/auth/login', { username, password })
      if (data.role !== 'ADMIN') {
        setError('Compte non administrateur')
        return
      }
      setLoggedIn(true)
      navigate('/admin', { replace: true })
    } catch {
      setError('Identifiants invalides')
    }
  }

  if (checkingSession) {
    return (
      <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Vérification de la session…</p>
      </section>
    )
  }

  if (loggedIn) {
    return <Navigate to="/admin" replace />
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Connexion administrateur</h2>
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
          Se connecter
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  )
}
