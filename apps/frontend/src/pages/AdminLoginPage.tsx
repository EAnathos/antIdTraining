import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
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
      const { data } = await api.post<{ token: string; role: string }>(
        '/auth/login',
        { email, password },
      )
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
      <section className="surface-panel surface-panel--solid mx-auto max-w-md p-6">
        <p className="text-[color:var(--app-text-muted)]">
          Vérification de la session…
        </p>
      </section>
    )
  }

  if (loggedIn) {
    return <Navigate to="/admin" replace />
  }

  return (
    <section className="surface-panel surface-panel--solid mx-auto max-w-md space-y-5 p-6">
      <div className="space-y-2">
        <span className="ui-chip ui-chip--warning">Administration</span>
        <h2 className="text-2xl font-bold tracking-tight text-[color:var(--app-text)]">
          Connexion administrateur
        </h2>
      </div>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          className="ui-input"
          placeholder="Adresse e-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="ui-input"
          placeholder="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="ui-button ui-button--primary w-full" type="submit">
          Se connecter
        </button>
      </form>
      {error && (
        <p className="text-sm text-[color:var(--app-danger)]">{error}</p>
      )}
    </section>
  )
}
