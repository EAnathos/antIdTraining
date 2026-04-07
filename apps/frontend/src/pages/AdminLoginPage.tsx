import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../lib/api'

const ADMIN_TOKEN_KEY = 'adminToken'

function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY)
}

function setAdminToken(token: string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(Boolean(getAdminToken()))
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      const { data } = await api.post<{ token: string; role: string }>('/auth/login', { email, password })
      if (data.role !== 'ADMIN') {
        setError('Compte non administrateur')
        return
      }
      setAdminToken(data.token)
      setLoggedIn(true)
    } catch {
      setError('Identifiants invalides')
    }
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
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
