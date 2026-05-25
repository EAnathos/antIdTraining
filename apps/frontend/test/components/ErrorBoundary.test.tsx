import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../../src/components/ErrorBoundary'

function Bomb() {
  throw new Error('Boom')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Contenu sain</div>
      </ErrorBoundary>,
    )

    expect(screen.getByText('Contenu sain')).toBeInTheDocument()
  })

  it('renders fallback UI when a child throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText("Oups ! Une erreur s'est produite")).toBeInTheDocument()
    expect(screen.getByText(/Boom/)).toBeInTheDocument()
    expect(errorSpy).toHaveBeenCalled()
  })
})
