import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/errorUtils'

type ForgotPasswordResponse = {
  message: string
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data } = await api.post<ForgotPasswordResponse>(
        '/auth/password-reset-request',
        { email },
      )
      setSuccess(data.message)
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Erreur lors de l’envoi du lien de réinitialisation.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="surface-panel surface-panel--solid mx-auto max-w-md space-y-5 p-6">
      <div className="space-y-2">
        <span className="ui-chip ui-chip--accent">Récupération</span>
        <h2 className="text-2xl font-bold tracking-tight text-[color:var(--app-text)]">
          Mot de passe oublié
        </h2>
        <p className="text-sm leading-6 text-[color:var(--app-text-muted)]">
          Saisissez votre adresse e-mail pour recevoir un lien de
          réinitialisation.
        </p>
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
        <button
          className="ui-button ui-button--primary w-full disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Envoi…' : 'Envoyer le lien'}
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
