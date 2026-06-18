import React, { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { resolveImageUrl } from '../lib/imageUrl'
import type { AuthMeResponse } from '../types/models'

type ThemePreference = 'system' | 'light' | 'dark'

function SunIcon() {
  return (
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
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
      <path d="M12 3a6.5 6.5 0 1 0 9 9A9 9 0 1 1 12 3Z" />
    </svg>
  )
}

function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const stored = window.localStorage.getItem('antidtraining-theme')
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system'
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(themePreference: ThemePreference) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem('antidtraining-theme', themePreference)

  let resolvedTheme: 'light' | 'dark'
  if (themePreference === 'system') {
    resolvedTheme = getSystemTheme()
  } else {
    resolvedTheme = themePreference
  }

  const root = document.documentElement
  root.setAttribute('data-theme', resolvedTheme)
  root.style.colorScheme = resolvedTheme

  const themeColor = resolvedTheme === 'dark' ? '#020617' : '#f6f7fb'
  const themeMeta = document.querySelector("meta[name='theme-color']")
  themeMeta?.setAttribute('content', themeColor)
}

function formatMemberSince(createdAt: string | null | undefined) {
  if (!createdAt) {
    return 'Date inconnue'
  }

  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return 'Date inconnue'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<AuthMeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [avatar, setAvatar] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [passwordResetConfirm, setPasswordResetConfirm] = useState(false)
  const [passwordResetLoading, setPasswordResetLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    getStoredThemePreference(),
  )

  function handleThemeChange(newTheme: ThemePreference) {
    setThemePreference(newTheme)
    applyTheme(newTheme)
  }

  useEffect(() => {
    api
      .get<AuthMeResponse>('/auth/me')
      .then((response) => {
        setProfile(response.data)
        setAvatar(response.data.avatar || '')
        setBio(response.data.bio || '')
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
  }, [])

  async function handleSaveProfile() {
    if (!profile) return
    setSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const updated = await api.patch<AuthMeResponse>('/auth/profile', {
        avatar: avatar || null,
        bio: bio || null,
      })
      setProfile(updated.data)
      setEditMode(false)
      setSuccessMessage('Profil mis à jour avec succès.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Erreur lors de la mise à jour du profil.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setError('')

    try {
      const form = new FormData()
      form.append('avatar', file)
      const updated = await api.post<AuthMeResponse>('/auth/avatar', form)
      setProfile(updated.data)
      setAvatar(updated.data.avatar || '')
      setSuccessMessage('Avatar mis à jour.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Erreur lors de l’upload de l’avatar.',
      )
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handlePasswordResetRequest() {
    setPasswordResetLoading(true)
    setError('')

    try {
      await api.post('/auth/password-reset-request')
      setPasswordResetConfirm(false)
      setSuccessMessage(
        'Demande de réinitialisation enregistrée. Vous pouvez en faire une nouvelle dans 7 jours.',
      )
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Erreur lors de la demande de réinitialisation.',
      )
    } finally {
      setPasswordResetLoading(false)
    }
  }

  async function handleDeleteAccount() {
    if (!deleteConfirm) return

    try {
      await api.post('/auth/delete-account')
      window.localStorage.removeItem('antidtraining-auth-role')
      window.localStorage.removeItem('antidtraining-auth-username')
      window.localStorage.removeItem('antidtraining-auth-email')
      window.dispatchEvent(new Event('antidtraining-auth-changed'))
      navigate('/connexion', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Erreur lors de la suppression du compte.',
      )
    }
  }

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => undefined)
    window.localStorage.removeItem('antidtraining-auth-role')
    window.localStorage.removeItem('antidtraining-auth-username')
    window.localStorage.removeItem('antidtraining-auth-email')
    window.dispatchEvent(new Event('antidtraining-auth-changed'))
    navigate('/connexion', { replace: true })
  }

  if (!loading && !profile) {
    return <Navigate to="/connexion" replace />
  }

  if (loading) {
    return (
      <section className="surface-panel surface-panel--solid mx-auto max-w-2xl p-6">
        <p className="text-[color:var(--app-text-muted)]">
          Chargement du profil…
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      {/* Error and Success Messages */}
      {error && (
        <div className="ui-alert ui-alert--danger text-sm">{error}</div>
      )}
      {successMessage && (
        <div className="ui-alert ui-alert--success text-sm">
          {successMessage}
        </div>
      )}

      {/* Header Card - Profile Summary */}
      <div className="surface-panel surface-panel--solid overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-4 sm:p-6">
          <div className="relative shrink-0">
            {profile?.avatar ? (
              <img
                src={resolveImageUrl(profile.avatar)}
                alt={profile.username || 'Avatar'}
                className="w-24 h-24 rounded-full object-cover ring-2 ring-[color:var(--app-primary)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[color:var(--app-primary)] to-[color:var(--app-primary-strong)] flex items-center justify-center text-[color:var(--app-text-inverse)] text-2xl font-bold">
                {profile?.username?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>

          <div className="flex-1 pt-1 text-center sm:text-left w-full">
            <h1 className="text-2xl font-bold text-[color:var(--app-text)]">
              {profile?.username || 'Profil'}
            </h1>
            <p className="text-sm text-[color:var(--app-text-muted)] mt-1">
              Membre depuis le {formatMemberSince(profile?.createdAt)}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[color:var(--app-text-soft)] uppercase">
                  Points
                </span>
                <span className="text-xl font-bold text-[color:var(--app-text)]">
                  {profile?.points ?? 0}
                </span>
              </div>
              <div className="h-8 w-px bg-[color:var(--app-border)]" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[color:var(--app-text-soft)] uppercase">
                  Email
                </span>
                <span className="text-sm text-[color:var(--app-text-muted)] break-all">
                  {profile?.email || 'Non renseigné'}
                </span>
              </div>
            </div>
            {!editMode && (
              <button
                className="ui-action ui-action--primary mt-4"
                type="button"
                onClick={() => setEditMode(true)}
              >
                Modifier
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Card */}
      {editMode && (
        <div className="surface-panel surface-panel--solid p-6 space-y-4">
          <h3 className="text-lg font-semibold text-[color:var(--app-text)]">
            Modifier votre profil
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[color:var(--app-text-muted)] mb-2">
                Avatar
              </label>
              <div className="flex items-center gap-3">
                {avatar && (
                  <img
                    src={resolveImageUrl(avatar)}
                    alt="Preview"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleAvatarFileChange(e)}
                    className="text-sm"
                  />
                  {avatarUploading && (
                    <p className="text-xs text-[color:var(--app-text-soft)] mt-1">
                      Upload en cours…
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[color:var(--app-text-muted)] mb-2">
                Biographie
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Parlez un peu de vous…"
                maxLength={500}
                className="w-full rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] p-3 text-sm resize-none h-24 text-[color:var(--app-text)] placeholder:text-[color:var(--app-text-soft)]"
              />
              <p className="text-xs text-[color:var(--app-text-soft)] mt-1">
                {bio.length}/500 caractères
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              className="ui-action ui-action--primary"
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={saving}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              className="ui-action ui-action--secondary"
              type="button"
              onClick={() => {
                setEditMode(false)
                setAvatar(profile?.avatar || '')
                setBio(profile?.bio || '')
              }}
              disabled={saving}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Theme Selector Card */}
      <div className="surface-panel surface-panel--solid p-6">
        <h3 className="text-lg font-semibold text-[color:var(--app-text)] mb-4">
          Apparence
        </h3>
        <div className="flex flex-wrap gap-2">
          {(['system', 'light', 'dark'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => handleThemeChange(theme)}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-all ${
                themePreference === theme
                  ? 'bg-[color:var(--app-primary)] text-white'
                  : 'border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface)]'
              }`}
              type="button"
              title={`Mode ${theme === 'system' ? 'système' : theme === 'light' ? 'clair' : 'sombre'}`}
            >
              {theme === 'system' && '🖥️ Système'}
              {theme === 'light' && (
                <>
                  <SunIcon /> Clair
                </>
              )}
              {theme === 'dark' && (
                <>
                  <MoonIcon /> Sombre
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Account Settings Card */}
      <div className="surface-panel surface-panel--solid p-6 space-y-4">
        <h3 className="text-lg font-semibold text-[color:var(--app-text)] mb-1">
          Compte
        </h3>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="profile-action-card profile-action-card--warning">
            <button
              className="profile-action-card__trigger"
              type="button"
              onClick={() => setPasswordResetConfirm(!passwordResetConfirm)}
              disabled={passwordResetLoading}
            >
              <div className="profile-action-card__row">
                <div className="flex items-start gap-3">
                  <div
                    className="profile-action-card__media"
                    aria-hidden="true"
                  >
                    ↻
                  </div>
                  <div>
                    <p className="profile-action-card__title">Mot de passe</p>
                    <p className="profile-action-card__description">
                      Demander un lien de réinitialisation.
                    </p>
                    <span className="profile-action-card__badge">
                      1 demande / 7 jours
                    </span>
                  </div>
                </div>
                <span
                  className="profile-action-card__chevron"
                  aria-hidden="true"
                >
                  {passwordResetConfirm ? '−' : '+'}
                </span>
              </div>
            </button>

            {passwordResetConfirm && (
              <div className="profile-action-card__panel space-y-3">
                <p className="text-sm text-[color:var(--app-text-muted)]">
                  Le lien sera envoyé à l’adresse associée au compte.
                </p>
                <div className="profile-action-card__actions sm:flex-row">
                  <button
                    className="ui-action ui-action--primary flex-1"
                    type="button"
                    onClick={() => void handlePasswordResetRequest()}
                    disabled={passwordResetLoading}
                  >
                    {passwordResetLoading ? 'Envoi…' : 'Envoyer le lien'}
                  </button>
                  <button
                    className="ui-action ui-action--secondary flex-1"
                    type="button"
                    onClick={() => setPasswordResetConfirm(false)}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="profile-action-card profile-action-card--danger">
            <button
              className="profile-action-card__trigger"
              type="button"
              onClick={() => setDeleteConfirm(!deleteConfirm)}
            >
              <div className="profile-action-card__row">
                <div className="flex items-start gap-3">
                  <div
                    className="profile-action-card__media"
                    aria-hidden="true"
                  >
                    ⌫
                  </div>
                  <div>
                    <p className="profile-action-card__title">
                      Suppression du compte
                    </p>
                    <p className="profile-action-card__description">
                      Effacer définitivement le profil et les données.
                    </p>
                    <span className="profile-action-card__badge">
                      irréversible
                    </span>
                  </div>
                </div>
                <span
                  className="profile-action-card__chevron"
                  aria-hidden="true"
                >
                  {deleteConfirm ? '−' : '+'}
                </span>
              </div>
            </button>

            {deleteConfirm && (
              <div className="profile-action-card__panel space-y-3">
                <p className="text-sm text-[color:var(--app-text-muted)]">
                  Cette action supprime le compte sans possibilité de retour.
                </p>
                <div className="profile-action-card__actions sm:flex-row">
                  <button
                    className="ui-action ui-action--danger flex-1"
                    type="button"
                    onClick={() => void handleDeleteAccount()}
                  >
                    Supprimer définitivement
                  </button>
                  <button
                    className="ui-action ui-action--secondary flex-1"
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button
        className="ui-action ui-action--secondary w-full py-3"
        type="button"
        onClick={() => void handleLogout()}
      >
        Se déconnecter
      </button>
    </section>
  )
}
