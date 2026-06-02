import React, { type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary component pour capturer les erreurs non gérées dans le rendu React.
 * Affiche une interface de fallback conviviale et enregistre l'erreur pour diagnostic.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enregistrer l'erreur dans les logs
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    // Optionnellement, envoyer l'erreur à un service de monitoring
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-shell page-shell--centered min-h-screen px-4 py-6">
          <div className="surface-panel surface-panel--solid w-full max-w-lg p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="ui-chip ui-chip--danger">Erreur critique</span>
              <p className="m-0 text-sm text-[color:var(--app-text-muted)]">
                Une erreur inattendue a interrompu l’affichage.
              </p>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--app-danger)]">
              Oups ! Une erreur s&apos;est produite
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--app-text-muted)]">
              L&apos;application a rencontré une erreur inattendue. Veuillez
              réessayer ou contacter le support.
            </p>

            <details className="mt-5 ui-alert ui-alert--warning">
              <summary className="cursor-pointer font-semibold">
                Détails de l&apos;erreur
              </summary>
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-6">
                {this.state.error?.toString()}
              </pre>
            </details>

            <button
              onClick={() => window.location.reload()}
              className="ui-button ui-button--primary mt-5 w-full"
            >
              Recharger la page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
