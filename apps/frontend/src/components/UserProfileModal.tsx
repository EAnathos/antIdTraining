import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/errorUtils'
import { resolveImageUrl } from '../lib/imageUrl'
import type { UserProfile } from '../types/models'

type UserProfileModalProps = {
  username: string
  isOpen: boolean
  onClose: () => void
}

export function UserProfileModal({
  username,
  isOpen,
  onClose,
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !username) return

    setLoading(true)
    setError('')

    api
      .get<UserProfile>(`/auth/users/${username}`)
      .then((response) => {
        setProfile(response.data)
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Impossible de charger le profil.'))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, username])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] p-6 shadow-xl z-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--app-text)]">
            Profil
          </h2>
          <button
            className="text-[color:var(--app-text-soft)] hover:text-[color:var(--app-text)] text-xl leading-none"
            type="button"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="text-center py-8 text-[color:var(--app-text-muted)] text-sm">
            Chargement…
          </div>
        )}

        {error && <div className="ui-alert ui-alert--danger">{error}</div>}

        {profile && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {profile.avatar && (
                <img
                  src={resolveImageUrl(profile.avatar)}
                  alt={profile.username}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-[color:var(--app-text)] truncate">
                  {profile.username}
                </h3>
                <p className="text-sm font-medium text-[color:var(--app-text-muted)]">
                  {profile.points} points
                </p>
              </div>
            </div>

            {profile.bio && (
              <p className="text-sm text-[color:var(--app-text-muted)]">
                {profile.bio}
              </p>
            )}

            <button
              className="ui-button ui-button--primary w-full"
              type="button"
              onClick={onClose}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </>
  )
}
