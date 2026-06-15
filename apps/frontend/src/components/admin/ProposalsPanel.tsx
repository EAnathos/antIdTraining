import { useMemo, useState } from 'react'
import type { EntryProposal } from '../../types/models'
import { backendOrigin } from '../../lib/api'
import { getResponsiveImageProps } from '../../lib/image'

type Props = {
  proposals: EntryProposal[]
  setProposalStatus: (
    id: string,
    decision: 'ACCEPT' | 'REJECT',
    rejectionMessage?: string,
  ) => Promise<void>
}

export function ProposalsPanel({ proposals, setProposalStatus }: Props) {
  const [filter, setFilter] = useState<
    'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'
  >('PENDING')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMessage, setRejectMessage] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    images: string[]
    index: number
    alt: string
  } | null>(null)

  function resolveImageUrl(imageUrl: string) {
    if (!imageUrl) return imageUrl
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl
    }

    return `${backendOrigin}${imageUrl}`
  }

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
      <h3 className="mb-2 text-sm font-semibold text-[color:var(--app-text)]">
        Propositions d'entrées
      </h3>

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'] as const).map((f) => (
          <button
            key={f}
            className={`ui-tab text-sm ${filter === f ? 'ui-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-2 text-sm">
        {filtered.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-[color:var(--app-border)] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <p className="font-medium">
                  {p.subfamily} · {p.genus ?? '-'} · {p.species ?? '-'}
                </p>
                <p className="text-xs text-[color:var(--app-text-muted)]">
                  {p.department} · {p.caste} ·{' '}
                  {p.observedAt
                    ? new Date(p.observedAt).toLocaleDateString()
                    : '-'}
                </p>
                <p className="text-xs text-[color:var(--app-text-muted)]">
                  De: {p.user?.username ?? 'Inconnu'}
                </p>
                <p className="mt-2 text-xs text-[color:var(--app-text-muted)]">
                  {p.biotope}
                </p>
                <p className="text-xs text-[color:var(--app-text-soft)]">
                  {new Date(p.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`ui-chip text-xs ${
                    p.status === 'PENDING'
                      ? 'ui-chip--warning'
                      : p.status === 'ACCEPTED'
                        ? 'ui-chip--success'
                        : 'ui-chip--danger'
                  }`}
                >
                  {p.status}
                </span>
                {p.rejectionMessage && (
                  <p className="text-xs text-[color:var(--app-danger)]">
                    {p.rejectionMessage}
                  </p>
                )}
                {p.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      className="ui-action ui-action--primary"
                      disabled={processingId === p.id}
                      onClick={() => void handleAccept(p.id)}
                    >
                      Accepter
                    </button>
                    <button
                      className="ui-action ui-action--danger"
                      onClick={() => setRejectingId(p.id)}
                    >
                      Rejeter
                    </button>
                  </div>
                )}
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
                        alt: `${p.subfamily} · ${p.genus ?? '-'} · ${p.species ?? '-'}`,
                      })
                    }
                  >
                    <img
                      src={resolveImageUrl(image.imageUrl)}
                      alt={`${p.subfamily} · ${p.genus ?? '-'} · ${p.species ?? '-'}`}
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
                  placeholder="Message de rejet (optionnel)"
                  value={rejectMessage}
                  onChange={(e) => setRejectMessage(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="ui-action ui-action--danger"
                    disabled={processingId === p.id}
                    onClick={() => void handleReject(p.id)}
                  >
                    Confirmer le rejet
                  </button>
                  <button
                    className="ui-action ui-action--secondary"
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
