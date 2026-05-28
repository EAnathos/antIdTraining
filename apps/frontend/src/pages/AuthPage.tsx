import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { AuthRegistrationResponse, AuthResponse } from '../types/models'

type AuthMode = 'login' | 'register' | 'verify'

export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')

  function persistAuth(
    roleValue: 'ADMIN' | 'USER',
    token: string,
    name: string,
    emailValue: string | null,
  ) {
    window.localStorage.setItem('antidtraining-auth-token', token)
    window.localStorage.setItem('antidtraining-auth-role', roleValue)
    window.localStorage.setItem('antidtraining-auth-username', name)
    if (emailValue) {
      window.localStorage.setItem('antidtraining-auth-email', emailValue)
    }
    window.dispatchEvent(new Event('antidtraining-auth-changed'))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    try {
      if (mode === 'login') {
        const { data } = await api.post<AuthResponse>('/auth/login', {
          email,
          password,
        })
        persistAuth(data.role, data.token, data.user.username, data.user.email)
        navigate(data.role === 'ADMIN' ? '/admin' : '/', { replace: true })
        return
      }

      if (mode === 'register') {
        const { data } = await api.post<AuthRegistrationResponse>(
          '/auth/register',
          { username, email, password, confirmPassword },
        )
        setEmail(data.email)
        setVerificationCode('')
        setMode('verify')
        setPassword('')
        setConfirmPassword('')
        return
      }

      const { data } = await api.post<AuthResponse>('/auth/verify-email', {
        email,
        code: verificationCode,
      })
      persistAuth(data.role, data.token, data.user.username, data.user.email)
      navigate(data.role === 'ADMIN' ? '/admin' : '/', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Identifiants invalides',
      )
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Connexion</h2>
      <p className="mt-2 text-sm text-slate-600">
        Vous pouvez jouer sans être connecté. Créez un compte joueur avec un nom
        d’utilisateur et une adresse e-mail pour suivre votre progression dans
        le classement.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm ${mode === 'login' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          onClick={() => {
            setMode('login')
            setError('')
          }}
        >
          Se connecter
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm ${mode === 'register' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          onClick={() => {
            setMode('register')
            setError('')
          }}
        >
          Créer un compte
        </button>
      </div>

      {mode === 'verify' && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100">
          <p>Un code de vérification a été envoyé à {email}.</p>
          <p className="mt-1">Entrez ce code pour activer votre compte.</p>
        </div>
      )}

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        {mode === 'register' && (
          <input
            className="w-full rounded-lg border border-slate-300 p-2"
            placeholder="Nom d'utilisateur"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          className="w-full rounded-lg border border-slate-300 p-2"
          placeholder="Adresse e-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {mode !== 'verify' && (
          <input
            className="w-full rounded-lg border border-slate-300 p-2"
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
        {mode === 'register' && (
          <input
            className="w-full rounded-lg border border-slate-300 p-2"
            placeholder="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        )}
        {mode === 'verify' && (
          <input
            className="w-full rounded-lg border border-slate-300 p-2"
            placeholder="Code de vérification"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            required
          />
        )}
        <button
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white"
          type="submit"
        >
          {mode === 'login'
            ? 'Se connecter'
            : mode === 'register'
              ? 'Créer le compte'
              : 'Vérifier mon e-mail'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  )
}
