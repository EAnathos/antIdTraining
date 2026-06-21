import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  role: null as 'ADMIN' | 'USER' | null,
  profile: null as null,
  isLoading: false,
  refresh: vi.fn(),
}))

vi.mock('../../../src/lib/authContext', () => ({
  useAuth: () => ({
    role: authMocks.role,
    profile: authMocks.profile,
    isLoading: authMocks.isLoading,
    refresh: authMocks.refresh,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

import { AppShell } from '../../../src/components/layout/AppShell'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  authMocks.role = null
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

  it('shows profile navigation when authenticated', () => {
    authMocks.role = 'USER'

    render(
      <MemoryRouter>
        <AppShell>
          <div>Contenu principal</div>
        </AppShell>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Profil' })).toBeInTheDocument()
  })

  it('opens and closes the mobile burger menu', () => {
    authMocks.role = 'USER'

    render(
      <MemoryRouter>
        <AppShell>
          <div>Contenu</div>
        </AppShell>
      </MemoryRouter>,
    )

    const burger = screen.getByRole('button', { name: /ouvrir le menu/i })
    expect(burger).toBeInTheDocument()

    // Mobile nav is not rendered yet
    expect(screen.getAllByRole('link', { name: 'Taxons' })).toHaveLength(1)

    fireEvent.click(burger)

    // Mobile drawer is now open: two sets of nav links
    expect(screen.getAllByRole('link', { name: 'Taxons' })).toHaveLength(2)
    expect(burger).toHaveAttribute('aria-expanded', 'true')

    // Click a nav link closes the menu
    const mobileLinks = screen.getAllByRole('link', { name: 'Taxons' })
    fireEvent.click(mobileLinks[1])
    expect(screen.getAllByRole('link', { name: 'Taxons' })).toHaveLength(1)
  })

  it('shows admin, offline and install states', async () => {
    authMocks.role = 'ADMIN'
    localStorage.setItem('antidtraining-theme', 'dark')

    const prompt = vi.fn().mockResolvedValue(undefined)
    const beforeInstallPrompt = Object.assign(
      new Event('beforeinstallprompt', { cancelable: true }),
      {
        preventDefault: vi.fn(),
        prompt,
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      },
    )

    render(
      <MemoryRouter>
        <AppShell>
          <div>Contenu principal</div>
        </AppShell>
      </MemoryRouter>,
    )

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    fireEvent(window, new Event('offline'))
    expect(screen.getByText(/Mode hors ligne activé/)).toBeInTheDocument()
    fireEvent(window, beforeInstallPrompt)

    expect(
      screen.getByRole('button', { name: /Installer/i }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Installer/i }))
    await waitFor(() => expect(prompt).toHaveBeenCalled())

    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Profil' })).toBeInTheDocument()
  })
})
