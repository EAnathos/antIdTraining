import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UserPointsPanel } from '../../../src/components/admin/UserPointsPanel'

const users = [
  { id: 'u1', username: 'beta', role: 'USER', points: 12, createdAt: '2026-05-01T00:00:00.000Z' },
  { id: 'u2', username: 'alpha', role: 'ADMIN', points: 20, createdAt: '2026-05-02T00:00:00.000Z' },
]

describe('UserPointsPanel', () => {
  it('filters, sorts and saves points', async () => {
    const setUserPoints = vi.fn().mockResolvedValue(undefined)

    render(<UserPointsPanel users={users} setUserPoints={setUserPoints} />)

    fireEvent.change(screen.getByPlaceholderText("Nom d'utilisateur"), { target: { value: 'alp' } })
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.queryByText('beta')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Points/ }))
    const input = screen.getByTitle('Points: 20')
    fireEvent.change(input, { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => {
      expect(setUserPoints).toHaveBeenCalledWith('u2', 25)
    })
  })

  it('shows empty state when no user matches', () => {
    render(<UserPointsPanel users={users} setUserPoints={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText("Nom d'utilisateur"), { target: { value: 'zzz' } })
    expect(screen.getByText('Aucun utilisateur trouvé.')).toBeInTheDocument()
  })
})
