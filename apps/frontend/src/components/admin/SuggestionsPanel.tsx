import { useMemo, useState } from 'react'
import type { Suggestion } from '../../types/models'

type Props = {
  suggestions: Suggestion[]
  setSuggestionStatus: (id: string, status: 'PENDING' | 'PROCESSED' | 'REJECTED') => Promise<void>
}

export function SuggestionsPanel({ suggestions, setSuggestionStatus }: Props) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PROCESSED' | 'REJECTED'>('ALL')

  const filtered = useMemo(() => {
    if (filter === 'ALL') return suggestions
    return suggestions.filter((s) => s.status === filter)
  }, [suggestions, filter])

  return (
    <div className="space-y-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Contribution</h3>

      <div className="flex gap-2">
        {(['ALL', 'PENDING', 'PROCESSED', 'REJECTED'] as const).map((f) => (
          <button key={f} className={`rounded px-3 py-2 text-sm ${filter === f ? 'bg-amber-500 text-white' : 'bg-amber-100'}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-2 text-sm">
        {filtered.map((s) => (
          <li key={s.id} className="rounded border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <p className="font-medium">{s.name ?? 'Anonyme'}</p>
                <p className="text-xs text-slate-600">{s.email ?? ''}</p>
                <p className="mt-2 whitespace-pre-wrap">{s.message}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(s.createdAt).toLocaleString()}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="rounded bg-slate-100 px-2 py-1 text-xs">{s.status}</span>
                <div className="flex gap-2">
                  {s.status !== 'PROCESSED' && (
                    <button className="rounded bg-emerald-600 px-2 py-1 text-xs text-white" onClick={() => void setSuggestionStatus(s.id, 'PROCESSED')}>Marquer traitée</button>
                  )}
                  {s.status !== 'REJECTED' && (
                    <button className="rounded bg-red-600 px-2 py-1 text-xs text-white" onClick={() => void setSuggestionStatus(s.id, 'REJECTED')}>Rejeter</button>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
