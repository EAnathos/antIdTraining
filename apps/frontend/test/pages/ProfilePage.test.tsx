import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}))

vi.mock('../../src/lib/api', () => ({
  api: {
    get: apiMocks.get,
    post: apiMocks.post,
    patch: apiMocks.patch,
  },
  backendOrigin: '',
}))

vi.mock('../../src/lib/imageUrl', () => ({
  resolveImageUrl: vi.fn((url: string) => url),
}))

import { AuthProvider } from '../../src/lib/authContext'
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
      <AuthProvider>
        <ProfilePage />
      </AuthProvider>
    </BrowserRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()

  // Default: AuthProvider.get resolves with profile
  apiMocks.get.mockResolvedValue({ data: mockProfile })
})

describe('ProfilePage — not authenticated', () => {
  it('redirects to /connexion when API returns no profile', async () => {
    apiMocks.get.mockRejectedValue(new Error('Unauthorized'))
    renderPage()
    await waitFor(() => {
      expect(window.location.pathname).toBe('/connexion')
    })
  })
})

describe('ProfilePage — authenticated', () => {
  it('shows loading state initially then username', async () => {
    renderPage()
    expect(screen.getByText('Chargement du profil…')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })

  it('redirects to /connexion when API call fails', async () => {
    apiMocks.get.mockRejectedValue(new Error('Réseau indisponible'))

    renderPage()

    await waitFor(() => {
      expect(window.location.pathname).toBe('/connexion')
    })
  })

  it('persists theme preference in localStorage when changed', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Alice'))

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
    expect(localStorage.getItem('antidtraining-auth-role')).toBeNull()
  })

  it('enters edit mode and saves profile', async () => {
    apiMocks.patch.mockResolvedValue({
      data: { ...mockProfile, bio: 'Nouveau bio' },
    })

    renderPage()
    await waitFor(() => screen.getByText('Alice'))

    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    expect(screen.getByText('Modifier votre profil')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      expect(apiMocks.patch).toHaveBeenCalledWith(
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
    apiMocks.post.mockResolvedValue({})

    renderPage()
    await waitFor(() => screen.getByText('Alice'))

    const resetTrigger = screen
      .getByText('Mot de passe')
      .closest('button') as HTMLButtonElement
    fireEvent.click(resetTrigger)

    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }))

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/auth/password-reset-request')
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
    apiMocks.post.mockResolvedValue({})

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
      expect(apiMocks.post).toHaveBeenCalledWith('/auth/delete-account')
    })
    expect(localStorage.getItem('antidtraining-auth-role')).toBeNull()
  })
})
