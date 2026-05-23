import { useMemo, useState } from 'react'
import type { EntryProposal } from '../../types/models'

type Props = {
  proposals: EntryProposal[]
  setProposalStatus: (id: string, decision: 'ACCEPT' | 'REJECT', rejectionMessage?: string) => Promise<void>
}

export function ProposalsPanel({ proposals, setProposalStatus }: Props) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('PENDING')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMessage, setRejectMessage] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'ALL') return proposals
    return proposals.filter((p) => p.status === filter)
  }, [proposals, filter])

  async function handleAccept(id: string) {
    setProcessingId(id)
    try {
      await setProposalStatus(id, 'ACCEPT')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(id: string) {
    setProcessingId(id)
    try {
      await setProposalStatus(id, 'REJECT', rejectMessage)
      setRejectingId(null)
      setRejectMessage('')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Propositions d'entrées</h3>

      <div className="flex gap-2">
        {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'] as const).map((f) => (
          <button
            key={f}
            className={`rounded px-3 py-2 text-sm ${
              filter === f ? 'bg-blue-500 text-white' : 'bg-blue-100'
            }`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-2 text-sm">
        {filtered.map((p) => (
          <li key={p.id} className="rounded border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <p className="font-medium">
                  {p.subfamily} · {p.genus ?? '-'} · {p.species ?? '-'}
                </p>
                <p className="text-xs text-slate-600">
                  {p.department} · {p.caste} · {p.observedAt ? new Date(p.observedAt).toLocaleDateString() : '-'}
                </p>
                <p className="text-xs text-slate-600">De: {p.user?.username ?? 'Inconnu'}</p>
                <p className="mt-2 text-xs text-slate-700">{p.biotope}</p>
                <p className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleString()}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded px-2 py-1 text-xs ${
                    p.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-800'
                      : p.status === 'ACCEPTED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {p.status}
                </span>
                {p.rejectionMessage && <p className="text-xs text-red-600">{p.rejectionMessage}</p>}
                {p.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                      disabled={processingId === p.id}
                      onClick={() => void handleAccept(p.id)}
                    >
                      Accepter
                    </button>
                    <button
                      className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                      onClick={() => setRejectingId(p.id)}
                    >
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            </div>

            {rejectingId === p.id && (
              <div className="mt-3 space-y-2 border-t pt-2">
                <textarea
                  className="w-full rounded border p-2 text-xs"
                  placeholder="Message de rejet (optionnel)"
                  value={rejectMessage}
                  onChange={(e) => setRejectMessage(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                    disabled={processingId === p.id}
                    onClick={() => void handleReject(p.id)}
                  >
                    Confirmer le rejet
                  </button>
                  <button
                    className="rounded bg-slate-300 px-2 py-1 text-xs"
                    onClick={() => {
                      setRejectingId(null)
                      setRejectMessage('')
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
