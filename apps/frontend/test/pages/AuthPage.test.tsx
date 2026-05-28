import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('../../src/lib/api', () => ({
  backendOrigin: '',
  api: {
    post: apiMocks.post,
  },
}))

import { AuthPage } from '../../src/pages/AuthPage'

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('displays login form by default', () => {
    renderWithRouter(<AuthPage />)

    expect(screen.getByText('Connexion')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Adresse e-mail')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Mot de passe')).toBeInTheDocument()
    const buttons = screen.getAllByText((content, element) => {
      return (
        element?.tagName.toLowerCase() === 'button' &&
        content === 'Se connecter'
      )
    })
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('switches between login and register modes', () => {
    renderWithRouter(<AuthPage />)

    const registerTab = screen.getByText('Créer un compte')
    fireEvent.click(registerTab)

    expect(screen.getByText('Créer le compte')).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Nom d'utilisateur")).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Adresse e-mail')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Confirmer le mot de passe'),
    ).toBeInTheDocument()

    const loginTab = screen.getByText('Se connecter')
    fireEvent.click(loginTab)

    const connectButtons = screen
      .getAllByText('Se connecter')
      .filter((element) => element.tagName === 'BUTTON')
    expect(connectButtons.length).toBeGreaterThan(0)
  })

  it('submits register form and stores auth data', async () => {
    apiMocks.post
      .mockResolvedValueOnce({
        data: {
          requiresEmailVerification: true,
          email: 'newuser@example.com',
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'USER',
          token: 'test_token_456',
          user: {
            id: 'user_1',
            username: 'newuser',
            email: 'newuser@example.com',
            role: 'USER',
          },
        },
      })

    renderWithRouter(<AuthPage />)

    fireEvent.click(screen.getByText('Créer un compte'))

    fireEvent.change(screen.getByPlaceholderText("Nom d'utilisateur"), {
      target: { value: 'newuser' },
    })
    fireEvent.change(screen.getByPlaceholderText('Adresse e-mail'), {
      target: { value: 'newuser@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), {
      target: { value: 'newpass123!' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirmer le mot de passe'), {
      target: { value: 'newpass123!' },
    })

    fireEvent.click(screen.getByText('Créer le compte'))

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'newpass123!',
        confirmPassword: 'newpass123!',
      })
    })

    expect(
      screen.getByText(/Un code de vérification a été envoyé/),
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Code de vérification'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Code de vérification'), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier mon e-mail' }))

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenLastCalledWith('/auth/verify-email', {
        email: 'newuser@example.com',
        code: '123456',
      })
    })

    expect(localStorage.getItem('antidtraining-auth-username')).toBe('newuser')
    expect(localStorage.getItem('antidtraining-auth-email')).toBe(
      'newuser@example.com',
    )
  })

  it('submits login form with e-mail', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        role: 'USER',
        token: 'test_token_123',
        user: {
          id: 'user_2',
          username: 'player',
          email: 'player@example.com',
          role: 'USER',
        },
      },
    })

    renderWithRouter(<AuthPage />)

    fireEvent.change(screen.getByPlaceholderText('Adresse e-mail'), {
      target: { value: 'player@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), {
      target: { value: 'secret123' },
    })

    fireEvent.click(
      screen
        .getAllByRole('button', { name: 'Se connecter' })
        .find((button) => button.type === 'submit')!,
    )

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/auth/login', {
        email: 'player@example.com',
        password: 'secret123',
      })
    })
  })

  it('displays error on failed register', async () => {
    apiMocks.post.mockRejectedValue(new Error('Utilisateur déjà existant'))

    renderWithRouter(<AuthPage />)

    fireEvent.click(screen.getByText('Créer un compte'))

    fireEvent.change(screen.getByPlaceholderText("Nom d'utilisateur"), {
      target: { value: 'existinguser' },
    })
    fireEvent.change(screen.getByPlaceholderText('Adresse e-mail'), {
      target: { value: 'existinguser@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), {
      target: { value: 'password!' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirmer le mot de passe'), {
      target: { value: 'password!' },
    })

    fireEvent.click(screen.getByText('Créer le compte'))

    await screen.findByText('Utilisateur déjà existant')
    expect(localStorage.length).toBe(0)
  })
})
