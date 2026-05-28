import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

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
        err instanceof Error && err.message
          ? err.message
          : 'Erreur lors de l’envoi du lien de réinitialisation.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Mot de passe oublié
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Saisissez votre adresse e-mail pour recevoir un lien de
        réinitialisation.
      </p>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <input
          className="w-full rounded-lg border border-slate-300 p-2"
          placeholder="Adresse e-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Envoi…' : 'Envoyer le lien'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-600">{success}</p>}

      <div className="mt-4 text-sm text-slate-600">
        <Link
          className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-700"
          to="/connexion"
        >
          Retour à la connexion
        </Link>
      </div>
    </section>
  )
}
