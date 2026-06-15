import { useMemo, useState } from 'react'
import type { EntryProposal, Suggestion } from '../../types/models'
import { getResponsiveImageProps } from '../../lib/image'
import { resolveImageUrl } from './imageHelpers'

type Props = {
  suggestions: Suggestion[]
  setSuggestionStatus: (
    id: string,
    status: 'PENDING' | 'PROCESSED' | 'REJECTED',
    rejectionMessage?: string,
  ) => Promise<void>
  deleteSuggestion: (id: string) => Promise<void>
  updateSuggestionRejectionMessage: (
    id: string,
    rejectionMessage: string,
  ) => Promise<void>
  proposals: EntryProposal[]
  setProposalStatus: (
    id: string,
    action: 'ACCEPT' | 'REJECT',
    rejectionMessage?: string,
  ) => Promise<void>
  deleteProposal: (id: string) => Promise<void>
  updateProposalRejectionMessage: (
    id: string,
    rejectionMessage: string,
  ) => Promise<void>
}

export function SuggestionsPanel({
  suggestions,
  setSuggestionStatus,
  deleteSuggestion,
  updateSuggestionRejectionMessage,
  proposals,
  setProposalStatus,
  deleteProposal,
  updateProposalRejectionMessage,
}: Props) {
  const [tab, setTab] = useState<'suggestions' | 'proposals'>('suggestions')
  const [filter, setFilter] = useState<
    'ALL' | 'PENDING' | 'PROCESSED' | 'REJECTED' | string
  >('ALL')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMessage, setRejectMessage] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState('')
  const [preview, setPreview] = useState<{
    images: string[]
    index: number
    alt: string
  } | null>(null)

  // resolveImageUrl is imported from shared helper `imageHelpers`.

  const filteredSuggestions = useMemo(() => {
    if (filter === 'ALL') return suggestions
    return suggestions.filter((s) => s.status === (filter as any))
  }, [suggestions, filter])

  const filteredProposals = useMemo(() => {
    if (filter === 'ALL') return proposals
    return proposals.filter((p) => p.status === filter)
  }, [proposals, filter])

  return (
    <div className="space-y-4">
      <h3 className="mb-2 text-sm font-semibold text-[color:var(--app-text)]">
        Contribuer
      </h3>

      <div className="flex gap-2 border-b border-[color:var(--app-border)]">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${tab === 'suggestions' ? 'border-b-2 border-[color:var(--app-primary)] text-[color:var(--app-primary)]' : 'text-[color:var(--app-text-muted)]'}`}
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
          className={`px-4 py-2 text-sm font-medium ${tab === 'proposals' ? 'border-b-2 border-[color:var(--app-primary)] text-[color:var(--app-primary)]' : 'text-[color:var(--app-text-muted)]'}`}
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
            className={`ui-tab text-sm ${filter === f ? 'ui-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {tab === 'suggestions' && (
        <ul className="mt-3 space-y-2 text-sm">
          {filteredSuggestions.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-[color:var(--app-border)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-left">
                  <p className="font-medium">{s.name ?? 'Anonyme'}</p>
                  <p className="text-xs text-[color:var(--app-text-muted)]">
                    {s.email ?? ''}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-primary)]">
                    Message de contribution
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{s.message}</p>
                  {s.rejectionMessage && (
                    <div className="mt-2 rounded border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] px-3 py-2 text-xs text-[color:var(--app-text-muted)]">
                      {editingMessageId === s.id ? (
                        <>
                          <p className="mb-1 font-semibold uppercase tracking-wide">
                            Modifier le message
                          </p>
                          <textarea
                            className="ui-textarea mb-2 w-full p-1 text-xs"
                            value={editingMessage}
                            onChange={(e) => setEditingMessage(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="ui-button ui-button--primary py-1 text-xs"
                              onClick={() => {
                                void updateSuggestionRejectionMessage(
                                  s.id,
                                  editingMessage,
                                ).then(() => {
                                  setEditingMessageId(null)
                                  setEditingMessage('')
                                })
                              }}
                            >
                              Sauvegarder
                            </button>
                            <button
                              type="button"
                              className="ui-button ui-button--secondary py-1 text-xs"
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
                          <p className="font-semibold uppercase tracking-wide">
                            Message de l'administration
                          </p>
                          <p className="whitespace-pre-wrap">
                            {s.rejectionMessage}
                          </p>
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              className="ui-button ui-button--secondary py-1 text-xs"
                              onClick={() => {
                                setEditingMessageId(s.id)
                                setEditingMessage(s.rejectionMessage || '')
                              }}
                            >
                              Modifier
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-[color:var(--app-text-soft)]">
                    {new Date(s.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`ui-chip text-xs ${s.status === 'PENDING' ? 'ui-chip--warning' : s.status === 'PROCESSED' ? 'ui-chip--success' : 'ui-chip--danger'}`}
                  >
                    {s.status}
                  </span>
                  <div className="flex gap-2">
                    {s.status !== 'PROCESSED' && (
                      <button
                        type="button"
                        className="ui-button ui-button--primary py-1 text-xs"
                        onClick={() =>
                          void setSuggestionStatus(s.id, 'PROCESSED')
                        }
                      >
                        Marquer traitée
                      </button>
                    )}
                    {s.status !== 'REJECTED' && (
                      <button
                        type="button"
                        className="ui-button ui-button--danger py-1 text-xs"
                        onClick={() => setRejectingId(s.id)}
                      >
                        Rejeter
                      </button>
                    )}
                    {s.status !== 'PENDING' && (
                      <button
                        type="button"
                        className="ui-button ui-button--secondary py-1 text-xs"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Supprimer définitivement cette suggestion ?',
                            )
                          ) {
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
                <div className="mt-3 space-y-2 border-t border-[color:var(--app-border)] pt-2">
                  <textarea
                    className="ui-textarea w-full p-2 text-xs"
                    placeholder="Message d'explication"
                    value={rejectMessage}
                    onChange={(e) => setRejectMessage(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="ui-button ui-button--danger py-1 text-xs"
                      onClick={() =>
                        void setSuggestionStatus(
                          s.id,
                          'REJECTED',
                          rejectMessage,
                        )
                      }
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
                      className="ui-button ui-button--secondary py-1 text-xs"
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
            <li key={p.id} className="rounded-lg border border-[color:var(--app-border)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {p.user?.username ?? ‘Utilisateur’}
                    </p>
                    <p className="text-xs text-[color:var(--app-text-soft)]">{p.taxonLevel}</p>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-primary)]">
                    Proposition d’entrée
                  </p>
                  <p className="text-sm text-[color:var(--app-text)]">{p.taxonValue}</p>
                  {p.subfamily && (
                    <p className="text-xs text-[color:var(--app-text-muted)]">
                      Subfamily: {p.subfamily}
                    </p>
                  )}
                  {p.genus && (
                    <p className="text-xs text-[color:var(--app-text-muted)]">Genus: {p.genus}</p>
                  )}
                  {p.species && (
                    <p className="text-xs text-[color:var(--app-text-muted)]">
                      Species: {p.species}
                    </p>
                  )}
                  {p.size && (
                    <p className="text-xs text-[color:var(--app-text-muted)]">Size: {p.size}</p>
                  )}
                  {p.caste && (
                    <p className="text-xs text-[color:var(--app-text-muted)]">Caste: {p.caste}</p>
                  )}
                  {p.rejectionMessage && (
                    <div className="mt-2 rounded border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] px-3 py-2 text-xs text-[color:var(--app-text-muted)]">
                      {editingMessageId === p.id ? (
                        <>
                          <p className="mb-1 font-semibold uppercase tracking-wide">
                            Modifier le message
                          </p>
                          <textarea
                            className="ui-textarea mb-2 w-full p-1 text-xs"
                            value={editingMessage}
                            onChange={(e) => setEditingMessage(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="ui-button ui-button--danger py-1 text-xs"
                              onClick={() => {
                                void updateProposalRejectionMessage(
                                  p.id,
                                  editingMessage,
                                ).then(() => {
                                  setEditingMessageId(null)
                                  setEditingMessage('')
                                })
                              }}
                            >
                              Sauvegarder
                            </button>
                            <button
                              type="button"
                              className="ui-button ui-button--secondary py-1 text-xs"
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
                          <p className="font-semibold uppercase tracking-wide">
                            Message de l'administration
                          </p>
                          <p className="whitespace-pre-wrap">
                            {p.rejectionMessage}
                          </p>
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              className="ui-button ui-button--secondary py-1 text-xs"
                              onClick={() => {
                                setEditingMessageId(p.id)
                                setEditingMessage(p.rejectionMessage || '')
                              }}
                            >
                              Modifier
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-[color:var(--app-text-muted)]">
                    {p.department} •{' '}
                    {new Date(p.observedAt).toLocaleDateString()}
                  </p>
                  {p.images.length > 0 && (
                    <p className="mt-1 text-xs text-[color:var(--app-text-soft)]">
                      {p.images.length} image(s)
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[color:var(--app-text-soft)]">
                    {new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`ui-chip text-xs ${p.status === 'PENDING' ? 'ui-chip--warning' : p.status === 'ACCEPTED' ? 'ui-chip--success' : 'ui-chip--danger'}`}
                  >
                    {p.status}
                  </span>
                  <div className="flex gap-2">
                    {p.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          className="ui-button ui-button--primary py-1 text-xs"
                          onClick={() => void setProposalStatus(p.id, 'ACCEPT')}
                        >
                          Accepter
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button--danger py-1 text-xs"
                          onClick={() => setRejectingId(p.id)}
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                    {p.status !== 'PENDING' && (
                      <button
                        type="button"
                        className="ui-button ui-button--secondary py-1 text-xs"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Supprimer définitivement cette proposition ?',
                            )
                          ) {
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

              {p.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      className="overflow-hidden rounded border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)]"
                      onClick={() =>
                        setPreview({
                          images: p.images.map((proposalImage) =>
                            resolveImageUrl(proposalImage.imageUrl),
                          ),
                          index,
                          alt: `${p.user?.username ?? 'Utilisateur'} · ${p.taxonValue}`,
                        })
                      }
                    >
                      <img
                        src={resolveImageUrl(image.imageUrl)}
                        alt={`${p.user?.username ?? 'Utilisateur'} · ${p.taxonValue}`}
                        className="h-16 w-16 object-cover"
                        loading="lazy"
                        decoding="async"
                        width={64}
                        height={64}
                      />
                    </button>
                  ))}
                </div>
              )}

              {rejectingId === p.id && (
                <div className="mt-3 space-y-2 border-t border-[color:var(--app-border)] pt-2">
                  <textarea
                    className="ui-textarea w-full p-2 text-xs"
                    placeholder="Message d'explication"
                    value={rejectMessage}
                    onChange={(e) => setRejectMessage(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="ui-button ui-button--danger py-1 text-xs"
                      onClick={() =>
                        void setProposalStatus(p.id, 'REJECT', rejectMessage)
                      }
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
                      className="ui-button ui-button--secondary py-1 text-xs"
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

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute -right-2 -top-2 rounded-full bg-[color:var(--app-surface)] px-2 py-1 text-xs font-semibold text-[color:var(--app-text)] shadow"
              onClick={() => setPreview(null)}
            >
              Fermer
            </button>

            <button
              type="button"
              className="absolute -left-14 top-1/2 -translate-y-1/2 rounded-full bg-[color:var(--app-surface)] px-3 py-2 text-lg font-semibold text-[color:var(--app-text)] shadow disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() =>
                setPreview((current) =>
                  !current || current.images.length <= 1
                    ? current
                    : {
                        ...current,
                        index:
                          (current.index - 1 + current.images.length) %
                          current.images.length,
                      },
                )
              }
              disabled={preview.images.length <= 1}
              aria-label="Image précédente"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              className="absolute -right-14 top-1/2 -translate-y-1/2 rounded-full bg-[color:var(--app-surface)] px-3 py-2 text-lg font-semibold text-[color:var(--app-text)] shadow disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() =>
                setPreview((current) =>
                  !current || current.images.length <= 1
                    ? current
                    : {
                        ...current,
                        index: (current.index + 1) % current.images.length,
                      },
                )
              }
              disabled={preview.images.length <= 1}
              aria-label="Image suivante"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            <img
              {...getResponsiveImageProps(preview.images[preview.index], {
                sizes: '(max-width: 768px) 90vw, 50vw',
              })}
              alt={preview.alt}
              className="max-h-[85vh] max-w-[90vw] rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface)] object-contain"
              decoding="async"
            />

            <p className="mt-2 text-center text-xs text-[color:var(--app-text-inverse)]">
              Image {preview.index + 1}/{preview.images.length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
