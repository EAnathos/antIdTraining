import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

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
        err instanceof Error && err.message
          ? err.message
          : 'Erreur lors de la réinitialisation du mot de passe.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Réinitialiser le mot de passe
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Choisissez un nouveau mot de passe pour sécuriser votre compte.
      </p>

      {!token && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Le lien semble invalide. Retournez à la connexion pour demander un
          nouveau lien.
        </div>
      )}

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <input
          className="w-full rounded-lg border border-slate-300 p-2"
          placeholder="Nouveau mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          pattern=".*[^A-Za-z0-9\s].*"
          minLength={8}
          required
        />
        <input
          className="w-full rounded-lg border border-slate-300 p-2"
          placeholder="Confirmer le mot de passe"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          pattern=".*[^A-Za-z0-9\s].*"
          minLength={8}
          required
        />
        <p className="text-xs text-slate-500">
          Le mot de passe doit contenir au moins 8 caractères et un caractère
          spécial.
        </p>
        <button
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
          type="submit"
          disabled={loading || !token}
        >
          {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
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
