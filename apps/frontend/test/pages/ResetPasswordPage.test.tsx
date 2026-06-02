import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('../../src/lib/api', () => ({
  api: {
    post: apiMocks.post,
  },
}))

import { ResetPasswordPage } from '../../src/pages/ResetPasswordPage'

const renderWithRouter = (initialPath = '/reset-password?token=test-token') => {
  window.history.pushState({}, 'Test', initialPath)
  return render(
    <BrowserRouter>
      <ResetPasswordPage />
    </BrowserRouter>,
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits the new password with the token', async () => {
    apiMocks.post.mockResolvedValue({
      data: { message: 'Mot de passe réinitialisé.' },
    })

    renderWithRouter()

    fireEvent.change(screen.getByPlaceholderText('Nouveau mot de passe'), {
      target: { value: 'newpass123!' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirmer le mot de passe'), {
      target: { value: 'newpass123!' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Réinitialiser le mot de passe' }),
    )

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/auth/password-reset', {
        token: 'test-token',
        password: 'newpass123!',
        confirmPassword: 'newpass123!',
      })
    })

    expect(screen.getByText('Mot de passe réinitialisé.')).toBeInTheDocument()
  })

  it('shows an error when token is missing', () => {
    renderWithRouter('/reset-password')

    expect(
      screen.getByText('Lien de réinitialisation invalide ou incomplet.'),
    ).toBeTruthy()
  })
})
