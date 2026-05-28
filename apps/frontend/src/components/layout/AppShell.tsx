import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type ThemePreference = 'system' | 'light' | 'dark'

const THEME_STORAGE_KEY = 'antidtraining-theme'

function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
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

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-slate-900 text-white'
      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
  }`
}

function adminNavClass({ isActive }: { isActive: boolean }) {
  return `admin-nav-button rounded-lg border border-amber-800 bg-amber-700 px-3 py-2 text-sm font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-800 ${
    isActive ? 'admin-nav-button-active' : 'admin-nav-button-inactive'
  }`
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    getStoredThemePreference(),
  )
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() =>
    getSystemTheme(),
  )
  const [authState, setAuthState] = useState(() => ({
    token:
      typeof window !== 'undefined'
        ? window.localStorage.getItem('antidtraining-auth-token')
        : null,
    role:
      typeof window !== 'undefined'
        ? (window.localStorage.getItem('antidtraining-auth-role') as
            | 'ADMIN'
            | 'USER'
            | null)
        : null,
  }))

  const resolvedTheme =
    themePreference === 'system' ? systemTheme : themePreference

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference)

    const root = document.documentElement
    root.setAttribute('data-theme', resolvedTheme)
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme, themePreference])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () =>
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    const syncAuthState = () => {
      setAuthState({
        token: window.localStorage.getItem('antidtraining-auth-token'),
        role: window.localStorage.getItem('antidtraining-auth-role') as
          | 'ADMIN'
          | 'USER'
          | null,
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
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      )
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
        if (
          installingWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          setUpdateAvailable(true)
        }
      })
    }

    const register = async () => {
      const registration =
        await navigator.serviceWorker.register('/service-worker.js')
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

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      controllerChangeHandler,
    )
    void register().catch(() => undefined)

    return () => {
      cancelled = true
      if (updateRegistration) {
        updateRegistration.removeEventListener('updatefound', handleUpdateFound)
      }
      if (controllerChangeHandler) {
        navigator.serviceWorker.removeEventListener(
          'controllerchange',
          controllerChangeHandler,
        )
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

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <header className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Ant ID Training
        </h1>
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
                <NavLink className={navClass} to="/profil">
                  Profil
                </NavLink>
              </>
            ) : (
              <NavLink className={adminNavClass} to="/connexion">
                Connexion
              </NavLink>
            )}
            {installPromptEvent && (
              <button
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                type="button"
                onClick={() => void installApp()}
              >
                Installer l’app
              </button>
            )}
          </div>
        </nav>
      </header>

      {!isOnline && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          Mode hors ligne activé. Les pages déjà chargées restent disponibles,
          mais les nouvelles données peuvent nécessiter une connexion.
        </div>
      )}

      {updateAvailable && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 shadow-sm">
          <p>Une mise à jour est disponible.</p>
          <button
            className="rounded-lg bg-indigo-700 px-3 py-2 font-medium text-white"
            type="button"
            onClick={() => void refreshToLatestVersion()}
          >
            Recharger
          </button>
        </div>
      )}

      {children}
      <footer className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <p>
            Site conçu et maintenu par{' '}
            <a
              className="font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-4"
              href="https://anathos.me/"
              target="_blank"
              rel="noreferrer"
            >
              Anathos
            </a>
            .
          </p>

          <nav
            aria-label="Liens de pied de page"
            className="flex flex-wrap items-center justify-center gap-3 text-slate-900 dark:text-slate-100"
          >
            <NavLink className={navClass} to="/about">
              À propos
            </NavLink>
            <NavLink className={navClass} to="/contribution">
              Contribuer
            </NavLink>
          </nav>

          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            onClick={() =>
              setThemePreference(resolvedTheme === 'dark' ? 'light' : 'dark')
            }
            aria-label={
              resolvedTheme === 'dark'
                ? 'Passer en mode clair'
                : 'Passer en mode sombre'
            }
            title={resolvedTheme === 'dark' ? 'Mode sombre' : 'Mode clair'}
          >
            {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </footer>
    </div>
  )
}
