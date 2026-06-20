import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { persistAuth } from '../lib/auth'
import { getErrorMessage } from '../lib/errorUtils'
import type { AuthResponse } from '../types/models'

type Status =
  | { kind: 'pending' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>({ kind: 'pending' })

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus({ kind: 'error', message: "Lien d'activation invalide." })
      return
    }

    api
      .post<AuthResponse>('/auth/verify-email', { token })
      .then(({ data }) => {
        persistAuth(data.role, data.user.username)
        setStatus({ kind: 'success' })
        setTimeout(
          () =>
            navigate(data.role === 'ADMIN' ? '/admin' : '/', { replace: true }),
          1500,
        )
      })
      .catch((err) => {
        setStatus({
          kind: 'error',
          message: getErrorMessage(
            err,
            "Lien d'activation invalide ou expiré.",
          ),
        })
      })
  }, [searchParams, navigate])

  return (
    <section className="surface-panel surface-panel--solid mx-auto max-w-md space-y-6 p-6">
      <h2 className="text-2xl font-bold tracking-tight text-[color:var(--app-text)]">
        Activation du compte
      </h2>
      {status.kind === 'pending' && (
        <p className="text-sm text-[color:var(--app-text-muted)]">
          Activation en cours…
        </p>
      )}
      {status.kind === 'success' && (
        <p className="text-sm text-[color:var(--app-success)]">
          Compte activé ! Vous allez être redirigé…
        </p>
      )}
      {status.kind === 'error' && (
        <p className="text-sm text-[color:var(--app-danger)]">
          {status.message}
        </p>
      )}
    </section>
  )
}
