import { useEffect, useState } from 'react'
import { api } from '../lib/api'
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
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'Impossible de charger le profil.',
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, username])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl z-50 mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Profil</h2>
          <button
            className="text-slate-500 hover:text-slate-700 text-xl"
            type="button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="text-center py-8 text-slate-600">Chargement…</div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {profile && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {profile.avatar && (
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div>
                <h3 className="font-semibold text-slate-900">
                  {profile.username}
                </h3>
                <p className="text-sm font-medium text-slate-700">
                  {profile.points} points
                </p>
              </div>
            </div>

            {profile.bio && (
              <div>
                <p className="text-sm text-slate-700">{profile.bio}</p>
              </div>
            )}

            <button
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 text-sm font-medium"
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
