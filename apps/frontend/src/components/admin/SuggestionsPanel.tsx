import { useMemo, useState } from 'react'
import type { EntryProposal, Suggestion } from '../../types/models'

type Props = {
  suggestions: Suggestion[]
  setSuggestionStatus: (id: string, status: 'PENDING' | 'PROCESSED' | 'REJECTED', rejectionMessage?: string) => Promise<void>
  deleteSuggestion: (id: string) => Promise<void>
  updateSuggestionRejectionMessage: (id: string, rejectionMessage: string) => Promise<void>
  proposals: EntryProposal[]
  setProposalStatus: (id: string, action: 'ACCEPT' | 'REJECT', rejectionMessage?: string) => Promise<void>
  deleteProposal: (id: string) => Promise<void>
  updateProposalRejectionMessage: (id: string, rejectionMessage: string) => Promise<void>
}

export function SuggestionsPanel({ suggestions, setSuggestionStatus, deleteSuggestion, updateSuggestionRejectionMessage, proposals, setProposalStatus, deleteProposal, updateProposalRejectionMessage }: Props) {
  const [tab, setTab] = useState<'suggestions' | 'proposals'>('suggestions')
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PROCESSED' | 'REJECTED' | string>('ALL')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMessage, setRejectMessage] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState('')

  const filteredSuggestions = useMemo(() => {
    if (filter === 'ALL') return suggestions
    return suggestions.filter((s) => s.status === filter as any)
  }, [suggestions, filter])

  const filteredProposals = useMemo(() => {
    if (filter === 'ALL') return proposals
    return proposals.filter((p) => p.status === filter)
  }, [proposals, filter])

  return (
    <div className="space-y-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Contribution</h3>

      <div className="flex gap-2 border-b">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${tab === 'suggestions' ? 'border-b-2 border-amber-500 text-amber-500' : 'text-slate-600'}`}
          onClick={() => {
            setTab('suggestions')
            setFilter('ALL')
            setRejectingId(null)
            setRejectMessage('')
            setEditingMessageId(null)
            setEditingMessage('')
          }}
        >
          Suggestions ({suggestions.length})
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${tab === 'proposals' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-600'}`}
          onClick={() => {
            setTab('proposals')
            setFilter('ALL')
            setRejectingId(null)
            setRejectMessage('')
            setEditingMessageId(null)
            setEditingMessage('')
          }}
        >
          Propositions ({proposals.length})
        </button>
      </div>

      <div className="flex gap-2">
        {(['ALL', 'PENDING', 'PROCESSED', 'REJECTED'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`rounded px-3 py-2 text-sm ${filter === f ? `${tab === 'suggestions' ? 'bg-amber-500' : 'bg-blue-500'} text-white` : 'bg-slate-100'}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {tab === 'suggestions' && (
        <ul className="mt-3 space-y-2 text-sm">
          {filteredSuggestions.map((s) => (
            <li key={s.id} className="rounded border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-left">
                  <p className="font-medium">{s.name ?? 'Anonyme'}</p>
                  <p className="text-xs text-slate-600">{s.email ?? ''}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600">Message de contribution</p>
                  <p className="mt-2 whitespace-pre-wrap">{s.message}</p>
                  {s.rejectionMessage && (
                    <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {editingMessageId === s.id ? (
                        <>
                          <p className="mb-1 font-semibold uppercase tracking-wide">Modifier le message</p>
                          <textarea
                            className="mb-2 w-full rounded border p-1 text-xs text-slate-700"
                            value={editingMessage}
                            onChange={(e) => setEditingMessage(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                              onClick={() => {
                                void updateSuggestionRejectionMessage(s.id, editingMessage).then(() => {
                                  setEditingMessageId(null)
                                  setEditingMessage('')
                                })
                              }}
                            >
                              Sauvegarder
                            </button>
                            <button
                              type="button"
                              className="rounded bg-slate-300 px-2 py-1 text-xs"
                              onClick={() => {
                                setEditingMessageId(null)
                                setEditingMessage('')
                              }}
                            >
                              Annuler
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mb-1 flex items-center justify-between">
                            <p className="font-semibold uppercase tracking-wide">Message de l'administration</p>
                            <button
                              type="button"
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                              onClick={() => {
                                setEditingMessageId(s.id)
                                setEditingMessage(s.rejectionMessage || '')
                              }}
                            >
                              Modifier
                            </button>
                          </div>
                          <p className="whitespace-pre-wrap">{s.rejectionMessage}</p>
                        </>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-500">{new Date(s.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded px-2 py-1 text-xs ${s.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : s.status === 'PROCESSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {s.status}
                  </span>
                  <div className="flex gap-2">
                    {s.status !== 'PROCESSED' && (
                      <button
                        type="button"
                        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                        onClick={() => void setSuggestionStatus(s.id, 'PROCESSED')}
                      >
                        Marquer traitée
                      </button>
                    )}
                    {s.status !== 'REJECTED' && (
                      <button
                        type="button"
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                        onClick={() => setRejectingId(s.id)}
                      >
                        Rejeter
                      </button>
                    )}
                    {s.status !== 'PENDING' && (
                      <button
                        type="button"
                        className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
                        onClick={() => {
                          if (window.confirm('Supprimer définitivement cette suggestion ?')) {
                            void deleteSuggestion(s.id)
                          }
                        }}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {rejectingId === s.id && (
                <div className="mt-3 space-y-2 border-t pt-2">
                  <textarea
                    className="w-full rounded border p-2 text-xs"
                    placeholder="Message d'explication"
                    value={rejectMessage}
                    onChange={(e) => setRejectMessage(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                      onClick={() => void setSuggestionStatus(s.id, 'REJECTED', rejectMessage)}
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
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
      )}

      {tab === 'proposals' && (
        <ul className="mt-3 space-y-2 text-sm">
          {filteredProposals.map((p) => (
            <li key={p.id} className="rounded border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{p.user?.username ?? 'Utilisateur'}</p>
                    <p className="text-xs text-slate-500">{p.taxonLevel}</p>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-blue-600">Proposition d’entrée</p>
                  <p className="text-sm text-slate-900">{p.taxonValue}</p>
                  {p.subfamily && <p className="text-xs text-slate-600">Subfamily: {p.subfamily}</p>}
                  {p.genus && <p className="text-xs text-slate-600">Genus: {p.genus}</p>}
                  {p.species && <p className="text-xs text-slate-600">Species: {p.species}</p>}
                  {p.size && <p className="text-xs text-slate-600">Size: {p.size}</p>}
                  {p.caste && <p className="text-xs text-slate-600">Caste: {p.caste}</p>}
                  {p.rejectionMessage && (
                    <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {editingMessageId === p.id ? (
                        <>
                          <p className="mb-1 font-semibold uppercase tracking-wide">Modifier le message</p>
                          <textarea
                            className="mb-2 w-full rounded border p-1 text-xs text-slate-700"
                            value={editingMessage}
                            onChange={(e) => setEditingMessage(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                              onClick={() => {
                                void updateProposalRejectionMessage(p.id, editingMessage).then(() => {
                                  setEditingMessageId(null)
                                  setEditingMessage('')
                                })
                              }}
                            >
                              Sauvegarder
                            </button>
                            <button
                              type="button"
                              className="rounded bg-slate-300 px-2 py-1 text-xs"
                              onClick={() => {
                                setEditingMessageId(null)
                                setEditingMessage('')
                              }}
                            >
                              Annuler
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mb-1 flex items-center justify-between">
                            <p className="font-semibold uppercase tracking-wide">Message de l'administration</p>
                            <button
                              type="button"
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                              onClick={() => {
                                setEditingMessageId(p.id)
                                setEditingMessage(p.rejectionMessage || '')
                              }}
                            >
                              Modifier
                            </button>
                          </div>
                          <p className="whitespace-pre-wrap">{p.rejectionMessage}</p>
                        </>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-600">
                    {p.department} • {new Date(p.observedAt).toLocaleDateString()}
                  </p>
                  {p.images.length > 0 && <p className="text-xs text-slate-500 mt-1">{p.images.length} image(s)</p>}
                  <p className="mt-2 text-xs text-slate-500">{new Date(p.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded px-2 py-1 text-xs ${p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : p.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {p.status}
                  </span>
                  <div className="flex gap-2">
                    {p.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                          onClick={() => void setProposalStatus(p.id, 'ACCEPT')}
                        >
                          Accepter
                        </button>
                        <button
                          type="button"
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                          onClick={() => setRejectingId(p.id)}
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                    {p.status !== 'PENDING' && (
                      <button
                        type="button"
                        className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
                        onClick={() => {
                          if (window.confirm('Supprimer définitivement cette proposition ?')) {
                            void deleteProposal(p.id)
                          }
                        }}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {rejectingId === p.id && (
                <div className="mt-3 space-y-2 border-t pt-2">
                  <textarea
                    className="w-full rounded border p-2 text-xs"
                    placeholder="Message d'explication"
                    value={rejectMessage}
                    onChange={(e) => setRejectMessage(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                      onClick={() => void setProposalStatus(p.id, 'REJECT', rejectMessage)}
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
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
      )}
    </div>
  )
}
