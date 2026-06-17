import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

import { GamePage } from '../../src/pages/GamePage'

describe('GamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.get.mockImplementation(async (path: string) => {
      if (path === '/taxons/subfamilies') {
        return { data: ['Formicinae', 'Myrmicinae'] }
      }

      throw new Error(`Unexpected GET call: ${path}`)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('plays an easy question and displays success feedback', async () => {
    apiMocks.get.mockImplementation(async (path: string) => {
      if (path === '/taxons/subfamilies') {
        return { data: ['Formicinae', 'Myrmicinae'] }
      }

      if (path === '/game/question') {
        return {
          data: {
            level: 'easy',
            entryId: 'entry_1',
            sessionId: 'session_1',
            images: [],
            prompt: 'Identifier la sous-famille',
            details: {
              size: '4-6 mm',
              department: '75',
              observedAt: '2026-05-01T00:00:00.000Z',
              biotope: 'Forêt',
              photoCredit: 'Alice',
            },
            choices: ['Formicinae', 'Myrmicinae'],
            answer: {
              subfamily: 'Formicinae',
            },
          },
        }
      }

      throw new Error(`Unexpected GET call: ${path}`)
    })

    apiMocks.post.mockResolvedValue({
      data: {
        correct: true,
        identification: {
          subfamily: { value: 'Formicinae', description: null, criteria: [] },
          genus: { value: null, description: null, criteria: [] },
          size: '4-6 mm',
        },
      },
    })

    render(<GamePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Démarrer ce niveau' }))

    await screen.findByText('Identifier la sous-famille')

    fireEvent.change(screen.getByLabelText('Sous-famille'), {
      target: { value: 'Formicinae' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))

    await screen.findByText('Correct')
    expect(screen.getByText(/Score de la session/)).toHaveTextContent('5')
  })

  it('handles medium two-step validation and genus failure feedback', async () => {
    apiMocks.get.mockImplementation(async (path: string) => {
      if (path === '/taxons/subfamilies') {
        return { data: ['Formicinae', 'Myrmicinae'] }
      }

      if (path === '/game/question') {
        return {
          data: {
            level: 'medium',
            entryId: 'entry_2',
            sessionId: 'session_2',
            images: [],
            prompt: 'Identifier la sous-famille puis le genre',
            choices: {
              subfamily: ['Formicinae', 'Myrmicinae'],
              genus: ['Formica', 'Camponotus'],
            },
            answer: {
              subfamily: 'Formicinae',
              genus: 'Formica',
            },
          },
        }
      }

      if (path === '/taxons/genera') {
        return { data: ['Formica', 'Camponotus'] }
      }

      throw new Error(`Unexpected GET call: ${path}`)
    })

    apiMocks.post
      .mockResolvedValueOnce({
        data: {
          correct: true,
          identification: {
            subfamily: { value: 'Formicinae', description: null, criteria: [] },
            genus: { value: null, description: null, criteria: [] },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          correct: false,
          reason: 'Genre incorrect',
          identification: {
            subfamily: { value: 'Formicinae', description: null, criteria: [] },
            genus: { value: 'Formica', description: null, criteria: [] },
          },
        },
      })

    render(<GamePage />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Niveau moyen Sous-famille puis genre.',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer ce niveau' }))

    await screen.findByText('Identifier la sous-famille puis le genre')

    fireEvent.change(screen.getByLabelText('Sous-famille'), {
      target: { value: 'Formicinae' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Valider la sous-famille' }),
    )

    await screen.findByText('Correct : sous-famille validée')

    fireEvent.change(screen.getByLabelText('Genre'), {
      target: { value: 'Camponotus' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Valider le genre' }))

    await screen.findByText('Faux : Genre incorrect')
    await waitFor(() => {
      expect(screen.getByText(/Score de la session/)).toHaveTextContent('0')
    })
  })

  it('opens fullscreen images and navigates between them on mobile controls', async () => {
    localStorage.setItem('antidtraining-auth-token', 'token_1')

    apiMocks.get.mockImplementation(async (path: string) => {
      if (path === '/taxons/subfamilies') {
        return { data: ['Formicinae', 'Myrmicinae'] }
      }

      if (path === '/game/question') {
        return {
          data: {
            level: 'easy',
            entryId: 'entry_3',
            sessionId: 'session_3',
            images: ['/img/a.jpg', '/img/b.jpg'],
            prompt: 'Identifier la sous-famille',
            details: {
              size: null,
              department: '75',
              observedAt: '2026-05-01T00:00:00.000Z',
              biotope: 'Forêt',
              photoCredit: 'Alice',
            },
            choices: ['Formicinae', 'Myrmicinae'],
            answer: {
              subfamily: 'Formicinae',
            },
          },
        }
      }

      throw new Error(`Unexpected GET call: ${path}`)
    })

    apiMocks.post.mockResolvedValue({
      data: {
        correct: true,
        identification: {
          subfamily: { value: 'Formicinae', description: null, criteria: [] },
          genus: { value: null, description: null, criteria: [] },
          size: null,
        },
      },
    })

    render(<GamePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Démarrer ce niveau' }))
    await screen.findByText('Identifier la sous-famille')

    expect(
      screen.getByText(
        /Le nombre de points gagnés ou perdus dépend du niveau de difficulté./,
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByAltText('Spécimen 1'))
    expect(
      await screen.findByAltText('Spécimen agrandis 1'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByAltText('Spécimen agrandis 1')).not.toBeInTheDocument()
  })
})
