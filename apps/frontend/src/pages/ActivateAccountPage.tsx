import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { AuthResponse } from '../types/models'

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>(
    'pending',
  )
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setError("Lien d'activation invalide.")
      return
    }

    api
      .post<AuthResponse>('/auth/verify-email', { token })
      .then(({ data }) => {
        window.localStorage.setItem('antidtraining-auth-token', data.token)
        window.localStorage.setItem('antidtraining-auth-role', data.role)
        window.localStorage.setItem(
          'antidtraining-auth-username',
          data.user.username,
        )
        if (data.user.email) {
          window.localStorage.setItem(
            'antidtraining-auth-email',
            data.user.email,
          )
        }
        window.dispatchEvent(new Event('antidtraining-auth-changed'))
        setStatus('success')
        setTimeout(
          () =>
            navigate(data.role === 'ADMIN' ? '/admin' : '/', { replace: true }),
          1500,
        )
      })
      .catch((err) => {
        setStatus('error')
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Lien d'activation invalide ou expiré.",
        )
      })
  }, [searchParams, navigate])

  return (
    <section className="surface-panel surface-panel--solid mx-auto max-w-md space-y-6 p-6">
      <h2 className="text-2xl font-bold tracking-tight text-[color:var(--app-text)]">
        Activation du compte
      </h2>
      {status === 'pending' && (
        <p className="text-sm text-[color:var(--app-text-muted)]">
          Activation en cours…
        </p>
      )}
      {status === 'success' && (
        <p className="text-sm text-[color:var(--app-success)]">
          Compte activé ! Vous allez être redirigé…
        </p>
      )}
      {status === 'error' && (
        <p className="text-sm text-[color:var(--app-danger)]">{error}</p>
      )}
    </section>
  )
}
