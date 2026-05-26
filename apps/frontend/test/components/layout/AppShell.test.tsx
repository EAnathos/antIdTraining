import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '../../../src/components/layout/AppShell'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as any)
})

describe('AppShell', () => {
  it('renders children and sets theme', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Contenu principal</div>
        </AppShell>
      </MemoryRouter>,
    )

    expect(screen.getByText('Contenu principal')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('toggles theme and shows profile navigation', async () => {
    localStorage.setItem('antidtraining-auth-token', 'token_1')
    localStorage.setItem('antidtraining-auth-role', 'USER')
    localStorage.setItem('antidtraining-auth-username', 'alice')
    localStorage.setItem('antidtraining-auth-email', 'alice@example.com')

    render(
      <MemoryRouter>
        <AppShell>
          <div>Contenu principal</div>
        </AppShell>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByLabelText(/Passer en mode/))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(screen.getByRole('link', { name: 'Profil' })).toBeInTheDocument()
  })

  it('shows admin, offline and install states', async () => {
    localStorage.setItem('antidtraining-auth-token', 'token_1')
    localStorage.setItem('antidtraining-auth-role', 'ADMIN')
    localStorage.setItem('antidtraining-theme', 'dark')

    const prompt = vi.fn().mockResolvedValue(undefined)
    const beforeInstallPrompt = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      preventDefault: vi.fn(),
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    })

    render(
      <MemoryRouter>
        <AppShell>
          <div>Contenu principal</div>
        </AppShell>
      </MemoryRouter>,
    )

    fireEvent(window, new Event('offline'))
    expect(screen.getByText(/Mode hors ligne activé/)).toBeInTheDocument()
    fireEvent(window, beforeInstallPrompt)

    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Profil' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Installer l’app' })).toBeInTheDocument()
    expect(screen.getByLabelText('Passer en mode clair')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Installer l’app' }))
    await waitFor(() => expect(prompt).toHaveBeenCalled())

    fireEvent.click(screen.getByLabelText('Passer en mode clair'))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
})
