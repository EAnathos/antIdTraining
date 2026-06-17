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

  it('shows department name next to code', async () => {
    apiMocks.get.mockImplementation(async (path: string) => {
      if (path === '/taxons/subfamilies') return { data: ['Formicinae'] }
      if (path === '/game/question') {
        return {
          data: {
            level: 'easy',
            entryId: 'entry_dept',
            sessionId: 'session_dept',
            images: [],
            prompt: 'Identifier la sous-famille',
            details: {
              size: null,
              caste: null,
              department: '75',
              observedAt: '2026-05-01T00:00:00.000Z',
              biotope: 'Forêt',
              photoCredit: 'Alice',
            },
            choices: ['Formicinae'],
          },
        }
      }
      throw new Error(`Unexpected GET call: ${path}`)
    })

    render(<GamePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer ce niveau' }))
    await screen.findByText('Identifier la sous-famille')

    expect(screen.getByText('75 – Paris')).toBeInTheDocument()
  })

  it('hides caste by default and reveals it on click', async () => {
    apiMocks.get.mockImplementation(async (path: string) => {
      if (path === '/taxons/subfamilies') return { data: ['Formicinae'] }
      if (path === '/game/question') {
        return {
          data: {
            level: 'easy',
            entryId: 'entry_caste',
            sessionId: 'session_caste',
            images: [],
            prompt: 'Identifier la sous-famille',
            details: {
              size: null,
              caste: 'QUEEN',
              department: '06',
              observedAt: '2026-05-01T00:00:00.000Z',
              biotope: 'Prairie',
              photoCredit: 'Bob',
            },
            choices: ['Formicinae'],
          },
        }
      }
      throw new Error(`Unexpected GET call: ${path}`)
    })

    render(<GamePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer ce niveau' }))
    await screen.findByText('Identifier la sous-famille')

    const revealButton = screen.getByTitle('Cliquer pour révéler')
    expect(revealButton).toBeInTheDocument()

    fireEvent.click(revealButton)

    expect(
      screen.queryByRole('button', { name: 'Cliquer pour révéler' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Reine')).toBeInTheDocument()
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
    const fullscreenImg = await screen.findByAltText('Spécimen agrandis 1')
    expect(fullscreenImg).toBeInTheDocument()

    // Close via backdrop click
    const backdrop = fullscreenImg.closest('div.fixed') as Element
    fireEvent.click(backdrop)
    expect(screen.queryByAltText('Spécimen agrandis 1')).not.toBeInTheDocument()
  })

  it('displays identification criteria and loads next question on button click', async () => {
    let callCount = 0
    apiMocks.get.mockImplementation(async (path: string) => {
      if (path === '/taxons/subfamilies') return { data: ['Formicinae'] }
      if (path === '/game/question') {
        callCount++
        return {
          data: {
            level: 'easy',
            entryId: `entry_next_${callCount}`,
            sessionId: `session_next_${callCount}`,
            images: [],
            prompt: 'Identifier la sous-famille',
            details: {
              size: null,
              caste: callCount === 1 ? 'MALE' : null,
              department: '99',
              observedAt: '2026-05-01T00:00:00.000Z',
              biotope: 'Haie',
              photoCredit: 'Claire',
            },
            choices: ['Formicinae'],
          },
        }
      }
      throw new Error(`Unexpected GET call: ${path}`)
    })

    apiMocks.post.mockResolvedValue({
      data: {
        correct: true,
        identification: {
          subfamily: {
            value: 'Formicinae',
            description: 'Grande sous-famille',
            criteria: ['Gastre pétiolé', 'Tibias antérieurs épineux'],
          },
          genus: { value: null, description: null, criteria: [] },
          size: null,
        },
      },
    })

    render(<GamePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer ce niveau' }))
    await screen.findByText('Identifier la sous-famille')

    // Unknown department → no name, just code
    expect(screen.getByText('99')).toBeInTheDocument()

    // Caste visible but hidden for first question
    const revealBtn = screen.getByTitle('Cliquer pour révéler')
    fireEvent.click(revealBtn)
    expect(screen.getByText('Mâle')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Sous-famille'), {
      target: { value: 'Formicinae' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))

    await screen.findByText('Correct')
    // Criteria are displayed
    expect(screen.getByText('Gastre pétiolé')).toBeInTheDocument()
    expect(screen.getByText('Tibias antérieurs épineux')).toBeInTheDocument()

    // Click "Question suivante" — loads new question, resets caste reveal
    fireEvent.click(screen.getByRole('button', { name: 'Question suivante' }))
    await screen.findByText('Identifier la sous-famille')

    // Caste is null in second question — no reveal button
    expect(screen.queryByTitle('Cliquer pour révéler')).not.toBeInTheDocument()
  })

  it('displays genus criteria in medium result', async () => {
    apiMocks.get.mockImplementation(async (path: string) => {
      if (path === '/taxons/subfamilies') return { data: ['Formicinae'] }
      if (path === '/game/question') {
        return {
          data: {
            level: 'medium',
            entryId: 'entry_genus_crit',
            sessionId: 'session_genus_crit',
            images: [],
            prompt: 'Identifier la sous-famille puis le genre',
            choices: {
              subfamily: ['Formicinae', 'Myrmicinae'],
              genus: ['Formica', 'Camponotus'],
            },
          },
        }
      }
      if (path === '/taxons/genera') return { data: ['Formica', 'Camponotus'] }
      throw new Error(`Unexpected GET call: ${path}`)
    })

    apiMocks.post
      .mockResolvedValueOnce({
        data: {
          correct: true,
          identification: {
            subfamily: {
              value: 'Formicinae',
              description: null,
              criteria: ['Gastre arrondi', 'Antennes coudées'],
            },
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
            genus: {
              value: 'Formica',
              description: 'Grand genre cosmopolite',
              criteria: ['Pétiole en écaille', 'Gaster lisse'],
            },
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
    expect(screen.getByText('Gastre arrondi')).toBeInTheDocument()
    expect(screen.getByText('Antennes coudées')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Genre'), {
      target: { value: 'Camponotus' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Valider le genre' }))

    await screen.findByText('Faux : Genre incorrect')
    expect(screen.getByText('Genre attendu :')).toBeInTheDocument()
    expect(screen.getByText('Description du genre :')).toBeInTheDocument()
    expect(screen.getByText('Pétiole en écaille')).toBeInTheDocument()
    expect(screen.getByText('Gaster lisse')).toBeInTheDocument()
  })
})
