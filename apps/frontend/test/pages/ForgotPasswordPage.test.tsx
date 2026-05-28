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

import { ForgotPasswordPage } from '../../src/pages/ForgotPasswordPage'

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits the email to request a reset link', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        message:
          'Si un compte existe pour cette adresse, un e-mail de réinitialisation a été envoyé.',
      },
    })

    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('Adresse e-mail'), {
      target: { value: 'player@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }))

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/auth/password-reset-request',
        { email: 'player@example.com' },
      )
    })

    expect(
      screen.getByText(
        'Si un compte existe pour cette adresse, un e-mail de réinitialisation a été envoyé.',
      ),
    ).toBeTruthy()
  })
})
