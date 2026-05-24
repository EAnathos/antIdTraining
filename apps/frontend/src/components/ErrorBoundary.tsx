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
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Oups ! Une erreur s&apos;est produite</h1>
            <p className="text-gray-700 mb-4">
              L&apos;application a rencontré une erreur inattendue. Veuillez réessayer ou contacter le support.
            </p>
            <details className="mb-4 text-sm text-gray-500 bg-gray-100 p-3 rounded">
              <summary className="cursor-pointer font-semibold">Détails de l&apos;erreur</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs overflow-auto max-h-40">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
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
