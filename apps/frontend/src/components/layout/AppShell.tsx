import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AUTH_THEME_KEY } from '../../lib/authKeys'
import { useAuth } from '../../lib/authContext'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function buttonClass(kind: 'primary' | 'secondary') {
  return kind === 'primary'
    ? 'ui-button ui-button--primary text-sm'
    : 'ui-button ui-button--secondary text-sm'
}

function navClass({ isActive }: { isActive: boolean }) {
  return `nav-link${isActive ? ' nav-link--active' : ''}`
}

function adminNavClass({ isActive }: { isActive: boolean }) {
  return `nav-action${isActive ? ' nav-action--active' : ''}`
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role } = useAuth()
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const applyTheme = () => {
      const stored = window.localStorage.getItem(AUTH_THEME_KEY)
      const themePreference =
        stored === 'light' || stored === 'dark' || stored === 'system'
          ? stored
          : 'system'

      let resolvedTheme: 'light' | 'dark'
      if (themePreference === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light'
      } else {
        resolvedTheme = themePreference
      }

      const root = document.documentElement
      root.setAttribute('data-theme', resolvedTheme)
      root.style.colorScheme = resolvedTheme

      const themeColor = resolvedTheme === 'dark' ? '#0d1a12' : '#faf7f2'
      const themeMeta = document.querySelector("meta[name='theme-color']")
      themeMeta?.setAttribute('content', themeColor)
    }

    applyTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
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
    <div className="app-shell app-shell--wide">
      <header className="app-header">
        <div className="app-header__top">
          <NavLink
            to="/"
            className="app-brand no-underline hover:opacity-80 transition-opacity"
          >
            <h1 className="app-brand__title">Ant ID Training</h1>
            <p className="app-brand__subtitle">
              Plateforme d'entraînement à l'identification des fourmis
            </p>
          </NavLink>

          <nav className="app-nav" aria-label="Navigation principale">
            <div className="app-nav__group">
              <NavLink className={navClass} to="/taxons">
                Taxons
              </NavLink>
              <NavLink className={navClass} to="/references">
                Références
              </NavLink>
              <NavLink className={navClass} to="/classement">
                Classement
              </NavLink>
            </div>

            <div className="app-nav__group app-nav__group--push-right">
              {role ? (
                <>
                  {role === 'ADMIN' && (
                    <span className="hidden sm:contents">
                      <NavLink className={adminNavClass} to="/admin">
                        Admin
                      </NavLink>
                    </span>
                  )}
                  <NavLink className={adminNavClass} to="/profil">
                    Profil
                  </NavLink>
                </>
              ) : (
                <NavLink className={adminNavClass} to="/connexion">
                  Connexion
                </NavLink>
              )}
              {installPromptEvent && (
                <span className="sm:hidden">
                  <button
                    className={buttonClass('primary')}
                    type="button"
                    onClick={() => void installApp()}
                  >
                    Installer l'app
                  </button>
                </span>
              )}
            </div>
          </nav>
        </div>
      </header>

      {!isOnline && (
        <div className="ui-alert ui-alert--warning">
          Mode hors ligne activé. Les pages déjà chargées restent disponibles,
          mais les nouvelles données peuvent nécessiter une connexion.
        </div>
      )}

      {updateAvailable && (
        <div className="ui-alert ui-alert--info flex flex-wrap items-center justify-between gap-3">
          <p>Une mise à jour est disponible.</p>
          <button
            className={buttonClass('primary')}
            type="button"
            onClick={() => void refreshToLatestVersion()}
          >
            Recharger
          </button>
        </div>
      )}

      <main className="app-content">{children}</main>
      <footer className="app-footer">
        <div className="app-footer__inner">
          <div className="app-footer__content app-footer__content--inline">
            <NavLink to="/about" className="app-footer__link">
              À propos
            </NavLink>
            <span className="app-footer__separator" aria-hidden="true">
              •
            </span>
            <NavLink to="/contribution" className="app-footer__link">
              Contribuer
            </NavLink>
            <span className="app-footer__separator" aria-hidden="true">
              •
            </span>
            <a
              href="https://anathos.me/"
              target="_blank"
              rel="noreferrer"
              className="app-footer__link app-footer__link--external"
            >
              Anathos
            </a>
          </div>

          <div className="app-footer__content app-footer__content--inline">
            <NavLink to="/mentions-legales" className="app-footer__link">
              Mentions légales
            </NavLink>
            <span className="app-footer__separator" aria-hidden="true">
              •
            </span>
            <NavLink
              to="/politique-de-confidentialite"
              className="app-footer__link"
            >
              Politique de confidentialité
            </NavLink>
            <span className="app-footer__separator" aria-hidden="true">
              •
            </span>
            <NavLink to="/cgu" className="app-footer__link">
              CGU
            </NavLink>
          </div>

          <div className="app-footer__bottom">
            <p className="app-footer__copyright">© 2025–2026 Ant ID Training</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
