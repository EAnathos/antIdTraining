import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../../src/lib/api', () => ({
  backendOrigin: '',
  api: {
    get: apiMocks.get,
    post: apiMocks.post,
  },
}))

import { AdminLoginPage } from '../../src/pages/AdminLoginPage'

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('displays loading state while checking session', () => {
    apiMocks.get.mockImplementationOnce(() => new Promise(() => {}))

    renderWithRouter(<AdminLoginPage />)

    expect(screen.getByText('Vérification de la session…')).toBeInTheDocument()
  })

  it('displays login form after session check when not logged in', async () => {
    apiMocks.get.mockRejectedValue(new Error('Not authenticated'))

    renderWithRouter(<AdminLoginPage />)

    await screen.findByText('Connexion administrateur')
    expect(screen.getByPlaceholderText('Adresse e-mail')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Mot de passe')).toBeInTheDocument()
  })

  it('redirects to /admin when already logged in as admin', async () => {
    apiMocks.get.mockResolvedValue({
      data: { userId: 'admin_1', role: 'ADMIN' },
    })

    renderWithRouter(<AdminLoginPage />)

    await waitFor(() => {
      expect(apiMocks.get).toHaveBeenCalledWith('/auth/me')
    })

    // The component will navigate, so the form should not be visible
    // We can verify by checking that no error message is visible
    expect(
      screen.queryByText('Connexion administrateur'),
    ).not.toBeInTheDocument()
  })

  it('submits admin login form and redirects on success', async () => {
    apiMocks.get.mockRejectedValue(new Error('Not authenticated'))
    apiMocks.post.mockResolvedValue({
      data: { token: 'admin_token_123', role: 'ADMIN' },
    })

    renderWithRouter(<AdminLoginPage />)

    await screen.findByText('Connexion administrateur')

    fireEvent.change(screen.getByPlaceholderText('Adresse e-mail'), {
      target: { value: 'admin@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), {
      target: { value: 'admin_password' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@example.com',
        password: 'admin_password',
      })
    })
  })

  it('displays error when login response has non-admin role', async () => {
    apiMocks.get.mockRejectedValue(new Error('Not authenticated'))
    apiMocks.post.mockResolvedValue({
      data: { token: 'user_token', role: 'USER' },
    })

    renderWithRouter(<AdminLoginPage />)

    await screen.findByText('Connexion administrateur')

    fireEvent.change(screen.getByPlaceholderText('Adresse e-mail'), {
      target: { value: 'regularuser@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), {
      target: { value: 'password' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await screen.findByText('Compte non administrateur')
  })

  it('displays error on login failure', async () => {
    apiMocks.get.mockRejectedValue(new Error('Not authenticated'))
    apiMocks.post.mockRejectedValue(new Error('Login failed'))

    renderWithRouter(<AdminLoginPage />)

    await screen.findByText('Connexion administrateur')

    fireEvent.change(screen.getByPlaceholderText('Adresse e-mail'), {
      target: { value: 'admin@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), {
      target: { value: 'wrongpass' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await screen.findByText('Identifiants invalides')
  })
})
