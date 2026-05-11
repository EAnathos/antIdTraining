import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function ContributionPage() {
  const [isConnected, setIsConnected] = useState(() => typeof window !== 'undefined' && !!window.localStorage.getItem('antidtraining-auth-token'))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const syncAuthState = () => {
      setIsConnected(!!window.localStorage.getItem('antidtraining-auth-token'))
    }

    window.addEventListener('antidtraining-auth-changed', syncAuthState)
    window.addEventListener('storage', syncAuthState)

    return () => {
      window.removeEventListener('antidtraining-auth-changed', syncAuthState)
      window.removeEventListener('storage', syncAuthState)
    }
  }, [])

  async function submitContribution(event: React.FormEvent) {
    event.preventDefault()

    try {
      await api.post('/suggestions', {
        name: name || null,
        email: email || null,
        message,
      })
      setSubmitted(true)
      setName('')
      setEmail('')
      setMessage('')
    } catch {
      setSubmitted(false)
    }
  }

  if (!isConnected) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Contribution</h2>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          Vous devez être connecté pour accéder à cette section.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Contribution</h2>
      <p className="mt-4 text-slate-700">
        Vous pouvez proposer une idée, signaler une erreur ou envoyer une suggestion d’amélioration.
      </p>

      {submitted && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Merci pour votre contribution.
        </div>
      )}

      <form className="mt-6 space-y-3" onSubmit={submitContribution}>
        <input
          className="w-full rounded-lg border border-slate-300 p-2"
          placeholder="Nom (optionnel)"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className="w-full rounded-lg border border-slate-300 p-2"
          placeholder="Email (optionnel)"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <textarea
          className="min-h-32 w-full rounded-lg border border-slate-300 p-2"
          placeholder="Votre message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
        />
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700" type="submit">
          Envoyer
        </button>
      </form>
    </section>
  )
}
