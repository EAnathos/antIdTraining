import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UserProfileModal } from '../../src/components/UserProfileModal'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../../src/lib/api', () => ({
  backendOrigin: '',
  api: {
    get: apiMocks.get,
  },
}))

describe('UserProfileModal', () => {
  it('does not render when closed', () => {
    const onClose = vi.fn()
    const { container } = render(
      <UserProfileModal username="alice" isOpen={false} onClose={onClose} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders profile when open and close button works', async () => {
    const onClose = vi.fn()
    apiMocks.get.mockResolvedValue({
      data: {
        username: 'alice',
        points: 42,
        avatar: '/avatars/a.jpg',
        bio: 'Hello',
      },
    })

    render(
      <UserProfileModal username="alice" isOpen={true} onClose={onClose} />,
    )

    expect(await screen.findByText('Profil')).toBeTruthy()
    expect(await screen.findByText('alice')).toBeTruthy()
    expect(await screen.findByText('42 points')).toBeTruthy()
    expect(screen.getByAltText('alice')).toBeTruthy()

    // click the close button (✕)
    const closeBtn = screen.getByText('✕')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error on fetch failure', async () => {
    const onClose = vi.fn()
    apiMocks.get.mockRejectedValue(new Error('network error'))

    render(<UserProfileModal username="bob" isOpen={true} onClose={onClose} />)

    expect(
      await screen.findByText(/Impossible de charger|network error/),
    ).toBeTruthy()
  })
})
