import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/errorUtils'

type ResetPasswordResponse = {
  message: string
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Lien de réinitialisation invalide ou incomplet.')
    }
  }, [token])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      setError('Lien de réinitialisation invalide ou incomplet.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data } = await api.post<ResetPasswordResponse>(
        '/auth/password-reset',
        {
          token,
          password,
          confirmPassword,
        },
      )
      setSuccess(data.message || 'Mot de passe réinitialisé.')
      setTimeout(() => {
        navigate('/connexion', { replace: true })
      }, 1800)
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Erreur lors de la réinitialisation du mot de passe.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="surface-panel surface-panel--solid mx-auto max-w-md space-y-5 p-6">
      <div className="space-y-2">
        <span className="ui-chip ui-chip--accent">Sécurité</span>
        <h2 className="text-2xl font-bold tracking-tight text-[color:var(--app-text)]">
          Réinitialiser le mot de passe
        </h2>
        <p className="text-sm leading-6 text-[color:var(--app-text-muted)]">
          Choisissez un nouveau mot de passe pour sécuriser votre compte.
        </p>
      </div>

      {!token && (
        <div className="ui-alert ui-alert--warning">
          Le lien semble invalide. Retournez à la connexion pour demander un
          nouveau lien.
        </div>
      )}

      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          className="ui-input"
          placeholder="Nouveau mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          pattern=".*[^A-Za-z0-9\s].*"
          minLength={8}
          required
        />
        <input
          className="ui-input"
          placeholder="Confirmer le mot de passe"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          pattern=".*[^A-Za-z0-9\s].*"
          minLength={8}
          required
        />
        <p className="text-xs leading-5 text-[color:var(--app-text-soft)]">
          Le mot de passe doit contenir au moins 8 caractères et un caractère
          spécial.
        </p>
        <button
          className="ui-button ui-button--primary w-full disabled:opacity-60"
          type="submit"
          disabled={loading || !token}
        >
          {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
        </button>
      </form>

      {error && (
        <p className="text-sm text-[color:var(--app-danger)]">{error}</p>
      )}
      {success && (
        <p className="text-sm text-[color:var(--app-success)]">{success}</p>
      )}

      <div className="text-sm text-[color:var(--app-text-muted)]">
        <Link
          className="font-semibold text-[color:var(--app-primary)] underline decoration-[color:var(--app-primary)] underline-offset-2 hover:opacity-85"
          to="/connexion"
        >
          Retour à la connexion
        </Link>
      </div>
    </section>
  )
}
