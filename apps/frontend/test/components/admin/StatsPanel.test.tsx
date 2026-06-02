import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StatsPanel } from '../../../src/components/admin/StatsPanel'

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('../../../src/lib/api', () => ({
  api: {
    post: apiMocks.post,
  },
}))

describe('StatsPanel', () => {
  it('changes period and asks for reset confirmation', async () => {
    const setPeriod = vi.fn()
    apiMocks.post.mockResolvedValue({})

    render(
      <StatsPanel
        stats={[
          {
            level: 'easy',
            launchedCount: 10,
            finalizedCount: 8,
            finalCorrectCount: 6,
            finalCorrectRate: 75,
          },
          {
            level: 'medium',
            launchedCount: 4,
            finalizedCount: 3,
            finalCorrectCount: 2,
            finalCorrectRate: 66.7,
          },
          {
            level: 'hard',
            launchedCount: 1,
            finalizedCount: 1,
            finalCorrectCount: 1,
            finalCorrectRate: 100,
          },
        ]}
        period="all"
        setPeriod={setPeriod}
      />,
    )

    fireEvent.change(screen.getByDisplayValue('Total'), {
      target: { value: '7d' },
    })
    expect(setPeriod).toHaveBeenCalledWith('7d')

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser stats' }))
    expect(
      screen.getByText('Confirmer la réinitialisation des statistiques ?'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Oui, réinitialiser' }))
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/admin/stats-tools/reset'),
    )
  })

  it('calls window.location.reload on successful reset', async () => {
    const setPeriod = vi.fn()
    apiMocks.post.mockResolvedValue({})
    const reload = vi.fn()
    // replace window.location with a writable mock containing reload
    // @ts-expect-error allow redefining
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, reload },
    })

    render(<StatsPanel stats={[]} period="all" setPeriod={setPeriod} />)

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser stats' }))
    fireEvent.click(screen.getByRole('button', { name: 'Oui, réinitialiser' }))

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/admin/stats-tools/reset'),
    )
    expect(reload).toHaveBeenCalled()
  })

  it('shows an error message when reset fails', async () => {
    const setPeriod = vi.fn()
    apiMocks.post.mockRejectedValue(new Error('boom'))

    render(<StatsPanel stats={[]} period="all" setPeriod={setPeriod} />)

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser stats' }))
    fireEvent.click(screen.getByRole('button', { name: 'Oui, réinitialiser' }))

    expect(
      await screen.findByText(/boom|Erreur lors de la réinitialisation/),
    ).toBeTruthy()
  })
})
