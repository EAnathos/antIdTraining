import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
  }`
}

function adminNavClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
  }`
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [authState, setAuthState] = useState(() => ({
    token: typeof window !== 'undefined' ? window.localStorage.getItem('antidtraining-auth-token') : null,
    role: typeof window !== 'undefined' ? (window.localStorage.getItem('antidtraining-auth-role') as 'ADMIN' | 'USER' | null) : null,
  }))

  useEffect(() => {
    const syncAuthState = () => {
      setAuthState({
        token: window.localStorage.getItem('antidtraining-auth-token'),
        role: window.localStorage.getItem('antidtraining-auth-role') as 'ADMIN' | 'USER' | null,
      })
    }

    window.addEventListener('antidtraining-auth-changed', syncAuthState)
    window.addEventListener('storage', syncAuthState)

    return () => {
      window.removeEventListener('antidtraining-auth-changed', syncAuthState)
      window.removeEventListener('storage', syncAuthState)
    }
  }, [])

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPromptEvent(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator) || import.meta.env.DEV) {
      return
    }

    let updateRegistration: ServiceWorkerRegistration | null = null
    let controllerChangeHandler: (() => void) | null = null
    let cancelled = false

    const handleUpdateFound = () => {
      const installingWorker = updateRegistration?.installing
      if (!installingWorker) {
        return
      }

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          setUpdateAvailable(true)
        }
      })
    }

    const register = async () => {
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      if (cancelled) {
        return
      }

      updateRegistration = registration
      registration.addEventListener('updatefound', handleUpdateFound)

      if (registration.waiting && navigator.serviceWorker.controller) {
        setUpdateAvailable(true)
      }

      await registration.update().catch(() => undefined)
    }

    controllerChangeHandler = () => {
      setUpdateAvailable(false)
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler)
    void register().catch(() => undefined)

    return () => {
      cancelled = true
      if (updateRegistration) {
        updateRegistration.removeEventListener('updatefound', handleUpdateFound)
      }
      if (controllerChangeHandler) {
        navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
      }
    }
  }, [])

  async function refreshToLatestVersion() {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration?.waiting) {
      return
    }

    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  async function installApp() {
    if (!installPromptEvent) {
      return
    }

    await installPromptEvent.prompt()
    const choice = await installPromptEvent.userChoice
    if (choice.outcome === 'accepted') {
      setInstallPromptEvent(null)
    }
  }

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => undefined)
    window.localStorage.removeItem('antidtraining-auth-token')
    window.localStorage.removeItem('antidtraining-auth-role')
    window.localStorage.removeItem('antidtraining-auth-username')
    window.dispatchEvent(new Event('antidtraining-auth-changed'))
    navigate(location.pathname.startsWith('/admin') ? '/connexion' : '/', { replace: true })
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <header className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Ant ID Training</h1>
        <nav className="mt-3 flex flex-wrap items-center gap-2">
          <NavLink className={navClass} to="/" end>
            Jeu
          </NavLink>
          <NavLink className={navClass} to="/taxons">
            Taxons
          </NavLink>
          <NavLink className={navClass} to="/references">
            Références
          </NavLink>
          <NavLink className={navClass} to="/classement">
            Classement
          </NavLink>
          <div className="ml-auto flex flex-wrap gap-2">
            {authState.token ? (
              <>
                {authState.role === 'ADMIN' && (
                  <NavLink className={adminNavClass} to="/admin">
                    Admin
                  </NavLink>
                )}
                <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700" type="button" onClick={() => void handleLogout()}>
                  Déconnexion
                </button>
              </>
            ) : (
              <NavLink className={adminNavClass} to="/connexion">
                Connexion
              </NavLink>
            )}
            {installPromptEvent && (
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700" type="button" onClick={() => void installApp()}>
                Installer l’app
              </button>
            )}
          </div>
        </nav>
      </header>

      {!isOnline && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          Mode hors ligne activé. Les pages déjà chargées restent disponibles, mais les nouvelles données peuvent nécessiter une connexion.
        </div>
      )}

      {updateAvailable && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 shadow-sm">
          <p>Une mise à jour est disponible.</p>
          <button className="rounded-lg bg-indigo-700 px-3 py-2 font-medium text-white" type="button" onClick={() => void refreshToLatestVersion()}>
            Recharger
          </button>
        </div>
      )}

      {children}
      <footer className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <p>
            Site conçu et maintenu par{' '}
            <a className="font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-4" href="https://anathos.me/" target="_blank" rel="noreferrer">
              Anathos
            </a>
            .
          </p>

          <nav aria-label="Liens de pied de page" className="flex flex-wrap items-center justify-center gap-3">
            <NavLink className={navClass} to="/about">
              À propos
            </NavLink>
            <NavLink className={navClass} to="/contribution">
              Contribuer
            </NavLink>
          </nav>
        </div>
      </footer>
    </div>
  )
}
