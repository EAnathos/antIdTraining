import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../../src/lib/api', () => ({
  api: {
    get: apiMocks.get,
  },
}))

import { ReferencesPage } from '../../src/pages/ReferencesPage'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ReferencesPage', () => {
  it('renders references and toggles linked taxons', async () => {
    apiMocks.get.mockResolvedValue({
      data: [
        {
          id: 'ref_1',
          title: 'Atlas',
          authors: ['Dupont'],
          description: 'Description',
          type: 'WEBSITE',
          url: 'https://example.com',
          taxons: [
            {
              id: 't1',
              subfamily: 'Formicinae',
              tribe: null,
              genus: 'Formica',
              subgenus: null,
              speciesGroup: null,
              species: 'rufibarbis',
            },
          ],
        },
        {
          id: 'ref_2',
          title: 'DOI ref',
          authors: [],
          description: null,
          type: 'MYRMECOLOGY',
          url: '10.1234/test',
          taxons: [],
        },
      ],
    })

    render(<ReferencesPage />)

    expect(await screen.findByText('Atlas')).toBeInTheDocument()
    expect(screen.getByText('DOI ref')).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Voir taxons liés (1)' }),
    )
    expect(
      screen.getByText(/Formicinae > Formica > rufibarbis/),
    ).toBeInTheDocument()
  })

  it('shows error state on load failure', async () => {
    apiMocks.get.mockRejectedValue(new Error('boom'))

    render(<ReferencesPage />)

    await waitFor(() => {
      expect(
        screen.getAllByText('Chargement des références impossible.').length,
      ).toBeGreaterThan(0)
    })
  })
})
