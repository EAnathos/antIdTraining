import React, { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { AuthMeResponse } from '../types/models'

export function ProfilePage() {
  const navigate = useNavigate()
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('antidtraining-auth-token')
      : null
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

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    const authApi = api.create({
      headers: { Authorization: `Bearer ${token}` },
    })
    authApi
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
  }, [token])

  async function handleSaveProfile() {
    if (!token || !profile) return
    setSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const authApi = api.create({
        headers: { Authorization: `Bearer ${token}` },
      })
      const updated = await authApi.patch<AuthMeResponse>('/auth/profile', {
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
    if (!file || !token) return
    setAvatarUploading(true)
    setError('')

    try {
      const authApi = api.create({
        headers: { Authorization: `Bearer ${token}` },
      })
      const form = new FormData()
      form.append('avatar', file)
      await authApi.post('/auth/avatar', form)
      const me = await authApi.get<AuthMeResponse>('/auth/me')
      setProfile(me.data)
      setAvatar(me.data.avatar || '')
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
    if (!token) return
    setPasswordResetLoading(true)
    setError('')

    try {
      const authApi = api.create({
        headers: { Authorization: `Bearer ${token}` },
      })
      await authApi.post('/auth/password-reset-request')
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
    if (!token || !deleteConfirm) return

    try {
      const authApi = api.create({
        headers: { Authorization: `Bearer ${token}` },
      })
      await authApi.post('/auth/delete-account')
      window.localStorage.removeItem('antidtraining-auth-token')
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
    window.localStorage.removeItem('antidtraining-auth-token')
    window.localStorage.removeItem('antidtraining-auth-role')
    window.localStorage.removeItem('antidtraining-auth-username')
    window.localStorage.removeItem('antidtraining-auth-email')
    window.dispatchEvent(new Event('antidtraining-auth-changed'))
    navigate('/connexion', { replace: true })
  }

  if (!token) {
    return <Navigate to="/connexion" replace />
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Chargement du profil…</p>
      </section>
    )
  }

  if (error && !profile) {
    return (
      <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Profil</h2>
        <p className="mt-3 text-sm text-red-600">{error}</p>
        <button
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          type="button"
          onClick={() => void handleLogout()}
        >
          Se déconnecter
        </button>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Profil</h2>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 border border-green-200">
          {successMessage}
        </div>
      )}

      {/* Avatar and Bio Section */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <div className="flex items-start gap-4">
          {profile?.avatar && (
            <img
              src={profile.avatar}
              alt={profile.username || 'Avatar'}
              className="w-20 h-20 rounded-full object-cover"
            />
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">
              {profile?.username}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {profile?.bio || 'Pas de biographie'}
            </p>
            <p className="text-sm font-medium text-slate-700 mt-2">
              {profile?.points ?? 0} points
            </p>
          </div>
          {!editMode && (
            <button
              className="rounded-lg px-3 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              type="button"
              onClick={() => setEditMode(true)}
            >
              Modifier
            </button>
          )}
        </div>

        {editMode && (
          <div className="mt-4 space-y-3 pt-4 border-t border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Avatar (fichier)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void handleAvatarFileChange(e)}
                className="w-full text-sm"
              />
              {avatarUploading && (
                <p className="text-xs text-slate-500 mt-2">Upload en cours…</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Biographie
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Parlez un peu de vous…"
                maxLength={500}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm resize-none h-20"
              />
              <p className="text-xs text-slate-500 mt-1">
                {bio.length}/500 caractères
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-lg px-3 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400"
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={saving}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                className="rounded-lg px-3 py-2 text-sm bg-slate-950 text-white hover:bg-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
      </div>

      {/* Profile Info Section */}
      <dl className="space-y-3 text-sm text-slate-700">
        <div>
          <dt className="font-medium text-slate-500">Adresse e-mail</dt>
          <dd>{profile?.email ?? 'Non renseignée'}</dd>
        </div>
      </dl>

      {/* RGPD Actions */}
      <div className="border-t pt-4">
        <div className="space-y-2">
          <button
            className="block w-full text-left rounded-lg px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-sm transition dark:bg-amber-950 dark:hover:bg-amber-900 dark:border-amber-800 dark:text-amber-100"
            type="button"
            onClick={() => setPasswordResetConfirm(!passwordResetConfirm)}
            disabled={passwordResetLoading}
          >
            Réinitialiser le mot de passe
          </button>
          {passwordResetConfirm && (
            <div className="rounded-lg bg-amber-100 p-3 border border-amber-300 dark:bg-amber-950 dark:border-amber-800">
              <p className="text-sm text-amber-950 font-medium mb-2 dark:text-amber-100">
                Cette action est possible une seule fois par semaine.
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-lg px-3 py-2 bg-amber-700 text-white hover:bg-amber-800 text-sm font-medium dark:bg-amber-500 dark:hover:bg-amber-400"
                  type="button"
                  onClick={() => void handlePasswordResetRequest()}
                  disabled={passwordResetLoading}
                >
                  {passwordResetLoading ? 'Traitement…' : 'Valider'}
                </button>
                <button
                  className="flex-1 rounded-lg px-3 py-2 bg-slate-200 text-slate-900 hover:bg-slate-300 text-sm dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                  type="button"
                  onClick={() => setPasswordResetConfirm(false)}
                  disabled={passwordResetLoading}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
          <button
            className="block w-full text-left rounded-lg px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-950 text-sm transition dark:bg-red-950 dark:hover:bg-red-900 dark:border-red-800 dark:text-red-100"
            type="button"
            onClick={() => setDeleteConfirm(!deleteConfirm)}
          >
            Supprimer mon compte
          </button>
          {deleteConfirm && (
            <div className="rounded-lg bg-red-100 p-3 border border-red-300 dark:bg-red-950 dark:border-red-800">
              <p className="text-sm text-red-950 font-medium mb-2 dark:text-red-100">
                Confirmer la suppression ?
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-lg px-3 py-2 bg-red-700 text-white hover:bg-red-800 text-sm font-medium dark:bg-red-500 dark:hover:bg-red-400"
                  type="button"
                  onClick={() => void handleDeleteAccount()}
                >
                  Confirmer
                </button>
                <button
                  className="flex-1 rounded-lg px-3 py-2 bg-slate-200 text-slate-900 hover:bg-slate-300 text-sm dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
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

      {/* Logout Button */}
      <button
        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 font-medium transition dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        type="button"
        onClick={() => void handleLogout()}
      >
        Se déconnecter
      </button>
    </section>
  )
}
