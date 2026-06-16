import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  create: vi.fn(),
}))

vi.mock('../../src/lib/api', () => ({
  api: {
    get: apiMocks.get,
    post: apiMocks.post,
    create: apiMocks.create,
  },
  backendOrigin: '',
}))

vi.mock('../../src/lib/imageUrl', () => ({
  resolveImageUrl: vi.fn((url: string) => url),
}))

import { ProfilePage } from '../../src/pages/ProfilePage'

const mockProfile = {
  userId: 'u1',
  username: 'Alice',
  email: 'alice@example.com',
  role: 'USER',
  bio: 'Passionnée de fourmis',
  avatar: null,
  createdAt: '2024-01-01T00:00:00.000Z',
}

function renderPage() {
  return render(
    <BrowserRouter>
      <ProfilePage />
    </BrowserRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()

  // Default: authApi.get resolves with profile
  const authApiInstance = { get: vi.fn(), patch: vi.fn(), delete: vi.fn() }
  authApiInstance.get.mockResolvedValue({ data: mockProfile })
  apiMocks.create.mockReturnValue(authApiInstance)
})

describe('ProfilePage — not authenticated', () => {
  it('redirects to /connexion when no token in localStorage', () => {
    renderPage()
    // BrowserRouter renders Navigate which changes location
    expect(window.location.pathname).toBe('/connexion')
  })
})

describe('ProfilePage — authenticated', () => {
  beforeEach(() => {
    localStorage.setItem('antidtraining-auth-token', 'valid-token')
  })

  it('shows loading state initially then username', async () => {
    renderPage()
    // Loading state
    expect(screen.getByText('Chargement du profil…')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })

  it('shows error when API call fails', async () => {
    const authApiInstance = { get: vi.fn() }
    authApiInstance.get.mockRejectedValue(new Error('Réseau indisponible'))
    apiMocks.create.mockReturnValue(authApiInstance)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Réseau indisponible')).toBeInTheDocument()
    })
  })

  it('shows fallback error when API error has no message', async () => {
    const authApiInstance = { get: vi.fn() }
    authApiInstance.get.mockRejectedValue({})
    apiMocks.create.mockReturnValue(authApiInstance)

    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText('Impossible de charger le profil.'),
      ).toBeInTheDocument()
    })
  })

  it('persists theme preference in localStorage when changed', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Alice'))

    // Find dark theme button
    const darkBtn = screen.getByTitle('Mode sombre')
    fireEvent.click(darkBtn)

    expect(localStorage.getItem('antidtraining-theme')).toBe('dark')
  })

  it('calls logout endpoint and navigates on logout', async () => {
    apiMocks.post.mockResolvedValue({})

    renderPage()
    await waitFor(() => screen.getByText('Alice'))

    const logoutBtn = screen.getByRole('button', { name: /se déconnecter/i })
    fireEvent.click(logoutBtn)

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/auth/logout')
    })
    expect(localStorage.getItem('antidtraining-auth-token')).toBeNull()
  })

  it('enters edit mode and saves profile', async () => {
    const authApiInstance = {
      get: vi.fn().mockResolvedValue({ data: mockProfile }),
      patch: vi
        .fn()
        .mockResolvedValue({ data: { ...mockProfile, bio: 'Nouveau bio' } }),
    }
    apiMocks.create.mockReturnValue(authApiInstance)

    renderPage()
    await waitFor(() => screen.getByText('Alice'))

    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    expect(screen.getByText('Modifier votre profil')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      expect(authApiInstance.patch).toHaveBeenCalledWith(
        '/auth/profile',
        expect.objectContaining({ bio: 'Passionnée de fourmis' }),
      )
    })
  })

  it('cancels edit mode without saving', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Alice'))

    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    expect(screen.getByText('Modifier votre profil')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))
    expect(screen.queryByText('Modifier votre profil')).not.toBeInTheDocument()
  })

  it('toggles password reset confirmation panel', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Alice'))

    const resetTrigger = screen
      .getByText('Mot de passe')
      .closest('button') as HTMLButtonElement
    fireEvent.click(resetTrigger)

    expect(
      screen.getByRole('button', { name: /envoyer le lien/i }),
    ).toBeInTheDocument()
  })

  it('sends password reset request', async () => {
    const authApiInstance = {
      get: vi.fn().mockResolvedValue({ data: mockProfile }),
      post: vi.fn().mockResolvedValue({}),
    }
    apiMocks.create.mockReturnValue(authApiInstance)

    renderPage()
    await waitFor(() => screen.getByText('Alice'))

    const resetTrigger = screen
      .getByText('Mot de passe')
      .closest('button') as HTMLButtonElement
    fireEvent.click(resetTrigger)

    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }))

    await waitFor(() => {
      expect(authApiInstance.post).toHaveBeenCalledWith(
        '/auth/password-reset-request',
      )
    })
  })

  it('toggles delete account confirmation panel', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Alice'))

    const deleteTrigger = screen
      .getByText('Suppression du compte')
      .closest('button') as HTMLButtonElement
    fireEvent.click(deleteTrigger)

    expect(
      screen.getByRole('button', { name: /supprimer définitivement/i }),
    ).toBeInTheDocument()
  })

  it('deletes account and clears localStorage', async () => {
    const authApiInstance = {
      get: vi.fn().mockResolvedValue({ data: mockProfile }),
      post: vi.fn().mockResolvedValue({}),
    }
    apiMocks.create.mockReturnValue(authApiInstance)

    renderPage()
    await waitFor(() => screen.getByText('Alice'))

    const deleteTrigger = screen
      .getByText('Suppression du compte')
      .closest('button') as HTMLButtonElement
    fireEvent.click(deleteTrigger)

    fireEvent.click(
      screen.getByRole('button', { name: /supprimer définitivement/i }),
    )

    await waitFor(() => {
      expect(authApiInstance.post).toHaveBeenCalledWith('/auth/delete-account')
    })
    expect(localStorage.getItem('antidtraining-auth-token')).toBeNull()
  })
})
