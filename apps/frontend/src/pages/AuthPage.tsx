import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { AuthRegistrationResponse, AuthResponse } from '../types/models'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState<string | null>(null)

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

      const { data } = await api.post<AuthRegistrationResponse>(
        '/auth/register',
        { username, email, password, confirmPassword },
      )
      setRegistered(data.email)
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Identifiants invalides',
      )
    }
  }

  if (registered) {
    return (
      <section className="surface-panel surface-panel--solid mx-auto max-w-md space-y-6 p-6">
        <h2 className="text-2xl font-bold tracking-tight text-[color:var(--app-text)]">
          Vérifiez votre boîte mail
        </h2>
        <div className="ui-alert ui-alert--warning">
          <p>
            Un lien d'activation a été envoyé à <strong>{registered}</strong>.
          </p>
          <p className="mt-1">
            Cliquez sur le lien pour activer votre compte. Il expire dans 24
            heures.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="surface-panel surface-panel--solid mx-auto max-w-md space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-[color:var(--app-text)]">
          Connexion
        </h2>
        <p className="text-sm leading-6 text-[color:var(--app-text-muted)]">
          Vous pouvez jouer sans être connecté. Créez un compte joueur avec un
          nom d'utilisateur et une adresse e-mail pour suivre votre progression
          dans le classement.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`ui-tab ${mode === 'login' ? 'ui-tab--active' : ''}`}
          onClick={() => {
            setMode('login')
            setError('')
          }}
        >
          Se connecter
        </button>
        <button
          type="button"
          className={`ui-tab ${mode === 'register' ? 'ui-tab--active' : ''}`}
          onClick={() => {
            setMode('register')
            setError('')
          }}
        >
          Créer un compte
        </button>
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        {mode === 'register' && (
          <input
            className="ui-input"
            placeholder="Nom d'utilisateur"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
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
          pattern={mode === 'register' ? '.*[^A-Za-z0-9\\s].*' : undefined}
          required
        />
        {mode === 'register' && (
          <>
            <input
              className="ui-input"
              placeholder="Confirmer le mot de passe"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              pattern=".*[^A-Za-z0-9\\s].*"
              required
            />
            <p className="text-xs leading-5 text-[color:var(--app-text-soft)]">
              Le mot de passe doit contenir au moins 8 caractères et un
              caractère spécial.
            </p>
          </>
        )}
        <button className="ui-button ui-button--primary w-full" type="submit">
          {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
        </button>
      </form>

      {mode === 'login' && (
        <div className="text-sm text-[color:var(--app-text-muted)]">
          <Link
            className="font-semibold text-[color:var(--app-primary)] underline decoration-[color:var(--app-primary)] underline-offset-2 hover:opacity-85"
            to="/forgot-password"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      )}

      {error && (
        <p className="text-sm text-[color:var(--app-danger)]">{error}</p>
      )}
    </section>
  )
}
