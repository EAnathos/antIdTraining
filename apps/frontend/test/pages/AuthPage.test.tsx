import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
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
    expect(screen.getByPlaceholderText('Nom d\'utilisateur')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Mot de passe')).toBeInTheDocument()
    const buttons = screen.getAllByText((content, element) => {
      return element?.tagName.toLowerCase() === 'button' && content === 'Se connecter'
    })
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('switches between login and register modes', () => {
    renderWithRouter(<AuthPage />)

    const registerTab = screen.getByText('Créer un compte')
    fireEvent.click(registerTab)

    expect(screen.getByText('Créer le compte')).toBeInTheDocument()

    const loginTab = screen.getByText('Se connecter')
    fireEvent.click(loginTab)

    const connectButtons = screen.getAllByText('Se connecter').filter(
      (element) => element.tagName === 'BUTTON'
    )
    expect(connectButtons.length).toBeGreaterThan(0)
  })

  it('submits register form and stores auth data', async () => {
    apiMocks.post.mockResolvedValue({
      data: { role: 'USER', token: 'test_token_456', username: 'newuser' },
    })

    renderWithRouter(<AuthPage />)

    fireEvent.click(screen.getByText('Créer un compte'))

    fireEvent.change(screen.getByPlaceholderText('Nom d\'utilisateur'), {
      target: { value: 'newuser' },
    })
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), {
      target: { value: 'newpass123' },
    })

    fireEvent.click(screen.getByText('Créer le compte'))

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        password: 'newpass123',
      })
    })

    expect(localStorage.getItem('antidtraining-auth-username')).toBe('newuser')
  })

  it('displays error on failed register', async () => {
    apiMocks.post.mockRejectedValue(new Error('Utilisateur déjà existant'))

    renderWithRouter(<AuthPage />)

    fireEvent.click(screen.getByText('Créer un compte'))

    fireEvent.change(screen.getByPlaceholderText('Nom d\'utilisateur'), {
      target: { value: 'existinguser' },
    })
    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), {
      target: { value: 'password' },
    })

    fireEvent.click(screen.getByText('Créer le compte'))

    await screen.findByText('Utilisateur déjà existant')
    expect(localStorage.length).toBe(0)
  })
})
