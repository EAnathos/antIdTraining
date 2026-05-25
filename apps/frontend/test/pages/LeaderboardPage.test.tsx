import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
}))

vi.mock('../../src/lib/api', () => ({
  api: {
    get: apiMocks.get,
    create: apiMocks.create,
  },
}))

import { LeaderboardPage } from '../../src/pages/LeaderboardPage'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('LeaderboardPage', () => {
  it('renders leaderboard and current user points', async () => {
    localStorage.setItem('antidtraining-auth-token', 'token_123')
    apiMocks.create.mockReturnValue({ get: apiMocks.get })

    apiMocks.get.mockImplementation(async (path: string) => {
      if (path === '/stats/leaderboard') {
        return {
          data: {
            items: [
              { userId: 'u1', username: 'Alice', gamesPlayed: 10, correctCount: 8, wrongCount: 2, points: 240 },
            ],
          },
        }
      }

      if (path === '/auth/me') {
        return {
          data: {
            userId: 'u1',
            role: 'USER',
            username: 'Alice',
            points: 240,
          },
        }
      }

      throw new Error(`Unexpected call: ${path}`)
    })

    render(<LeaderboardPage />)

    await screen.findByText('Classement')
    expect(screen.getByText(/Vos points actuels :/)).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getAllByText('240').length).toBeGreaterThan(0)
  })

  it('shows empty state', async () => {
    apiMocks.get.mockImplementation(async (path: string) => {
      if (path === '/stats/leaderboard') {
        return { data: { items: [] } }
      }

      if (path === '/auth/me') {
        return { data: { userId: 'u1', role: 'USER', username: 'Alice', points: 0 } }
      }

      throw new Error(`Unexpected call: ${path}`)
    })

    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Aucun joueur classé pour le moment.')).toBeInTheDocument()
    })
  })
})
