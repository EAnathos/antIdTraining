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

import { TaxonsPage } from '../../src/pages/TaxonsPage'

const taxon = {
  id: 'taxon_1',
  subfamily: 'Formicinae',
  tribe: 'Lasiini',
  genus: 'Formica',
  subgenus: 'Serviformica',
  speciesGroup: 'rufibarbis group',
  species: 'rufibarbis',
  invasive: false,
  swarmingStartMonth: 5,
  swarmingEndMonth: 6,
  distribution: { departments: ['75'] },
  confusions: [],
  levelDetails: {
    subfamily: { description: 'Sous-famille', sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
    genus: { description: 'Genre', sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
    subgenus: { description: 'Sous-genre', sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
    speciesGroup: { description: 'Groupe', sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
    species: { description: 'Espèce', sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()

  apiMocks.get.mockImplementation(async (path: string) => {
    if (path === '/taxons') {
      return {
        data: {
          items: [taxon],
          offset: 0,
          limit: 20,
          nextOffset: 20,
          hasMore: false,
          total: 1,
        },
      }
    }

    if (path === '/references') {
      return {
        data: [
          {
            id: 'ref_1',
            title: 'Référence liée',
            authors: ['Dupont'],
            description: 'Description',
            type: 'MYRMECOLOGY',
            url: '10.1234/test',
            taxons: [
              { id: 'taxon_1', subfamily: 'Formicinae', tribe: 'Lasiini', genus: 'Formica', subgenus: 'Serviformica', speciesGroup: 'rufibarbis group', species: 'rufibarbis' },
            ],
          },
        ],
      }
    }

    throw new Error(`Unexpected call: ${path}`)
  })
})

describe('TaxonsPage', () => {
  it('renders taxons and opens detail modal with linked references', async () => {
    render(<TaxonsPage />)

    expect(await screen.findByText('Taxons enregistrés')).toBeInTheDocument()
    expect(screen.getByText('Formicinae')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'rufibarbis' }))

    await waitFor(() => {
      expect(screen.getByText('Références liées')).toBeInTheDocument()
      expect(screen.getByText('Référence liée')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: 'Référence liée' })).toHaveAttribute('href', 'https://doi.org/10.1234/test')
  })

  it('loads taxons from cache when available', async () => {
    sessionStorage.setItem(
      'taxons-page-cache:v1:',
      JSON.stringify({
        savedAt: Date.now(),
        items: [taxon],
        hasMore: false,
      }),
    )

    apiMocks.get.mockImplementation(async (path: string) => {
      if (path === '/references') {
        return { data: [] }
      }

      throw new Error(`Unexpected call: ${path}`)
    })

    render(<TaxonsPage />)

    expect(await screen.findByText('Taxons enregistrés')).toBeInTheDocument()
    expect(screen.getByText('Formicinae')).toBeInTheDocument()
    expect(apiMocks.get).toHaveBeenCalledWith('/references')
  })

  it('loads multiple pages and shows the final list state', async () => {
    apiMocks.get.mockImplementation(async (path: string, options?: { params?: { offset?: number } }) => {
      if (path === '/taxons' && options?.params?.offset === 0) {
        return {
          data: {
            items: [taxon],
            offset: 0,
            limit: 20,
            nextOffset: 1,
            hasMore: true,
            total: 2,
          },
        }
      }

      if (path === '/taxons' && options?.params?.offset === 1) {
        return {
          data: {
            items: [
              {
                ...taxon,
                id: 'taxon_4',
                subfamily: 'Myrmicinae',
                tribe: 'Myrmicini',
                genus: 'Messor',
                species: 'structor',
                swarmingStartMonth: 7,
                swarmingEndMonth: 8,
                distribution: { departments: ['13'] },
                levelDetails: {
                  ...taxon.levelDetails,
                  subfamily: { description: 'Sous-famille', sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
                  genus: { description: 'Genre', sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
                  species: { description: 'Espèce', sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
                },
              },
            ],
            offset: 1,
            limit: 20,
            nextOffset: 2,
            hasMore: false,
            total: 2,
          },
        }
      }

      if (path === '/references') {
        return { data: [] }
      }

      throw new Error(`Unexpected call: ${path}`)
    })

    render(<TaxonsPage />)

    expect(await screen.findByText('Taxons enregistrés')).toBeInTheDocument()
    expect(screen.getByText('Formicinae')).toBeInTheDocument()
    expect(screen.getByText('Myrmicinae')).toBeInTheDocument()
    expect(await screen.findByText('Fin de la liste.')).toBeInTheDocument()
  })

  it('shows fallback detail content for incomplete species data', async () => {
    apiMocks.get.mockImplementationOnce(async (path: string) => {
      if (path === '/taxons') {
        return {
          data: {
            items: [
              {
                ...taxon,
                id: 'taxon_2',
                subfamily: 'Myrmicinae',
                tribe: null,
                genus: 'Messor',
                subgenus: null,
                speciesGroup: null,
                species: 'barbarus',
                swarmingStartMonth: null,
                swarmingEndMonth: null,
                distribution: { departments: [] },
                confusions: [
                  {
                    id: 'conf_1',
                    detail: 'Peut être confondu avec une autre espèce.',
                    confusedTaxon: { genus: 'Aphaenogaster', species: 'test' },
                  },
                ],
                levelDetails: {
                  ...taxon.levelDetails,
                  subfamily: { description: null, sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
                  genus: { description: null, sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
                  species: { description: null, sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
                },
              },
            ],
            offset: 0,
            limit: 20,
            nextOffset: 20,
            hasMore: false,
            total: 1,
          },
        }
      }

      if (path === '/references') {
        return { data: [] }
      }

      throw new Error(`Unexpected call: ${path}`)
    })

    render(<TaxonsPage />)

    expect(await screen.findByText('Taxons enregistrés')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'barbarus' }))

    await waitFor(() => {
      expect(screen.getByText('Aucune description.')).toBeInTheDocument()
      expect(screen.getByText('Aucun critère renseigné.')).toBeInTheDocument()
      expect(screen.getByText("Aucune période d'essaimage renseignée.")).toBeInTheDocument()
      expect(screen.getByText('Aucune référence liée.')).toBeInTheDocument()
      expect(screen.getByText('Peut être confondu avec une autre espèce.')).toBeInTheDocument()
      expect(screen.getByText('Aucune aire de répartition renseignée.')).toBeInTheDocument()
    })
  })

  it('filters taxons with advanced options and resets them', async () => {
    apiMocks.get.mockImplementationOnce(async (path: string) => {
      if (path === '/taxons') {
        return {
          data: {
            items: [
              taxon,
              {
                ...taxon,
                id: 'taxon_3',
                subfamily: 'Myrmicinae',
                tribe: 'Myrmicini',
                genus: 'Messor',
                species: 'minor',
                invasive: true,
                swarmingStartMonth: 1,
                swarmingEndMonth: 2,
                distribution: { departments: ['13'] },
                levelDetails: {
                  ...taxon.levelDetails,
                  subfamily: { description: 'Sous-famille', sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
                  genus: { description: 'Genre', sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
                  species: { description: 'Espèce', sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
                },
              },
            ],
            offset: 0,
            limit: 20,
            nextOffset: 20,
            hasMore: false,
            total: 2,
          },
        }
      }

      if (path === '/references') {
        return { data: [] }
      }

      throw new Error(`Unexpected call: ${path}`)
    })

    render(<TaxonsPage />)

    expect(await screen.findByText('2 entrées trouvées')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Options supplémentaires' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jan' }))
    fireEvent.click(screen.getByLabelText('Ville de Paris'))

    expect(screen.getByText('0 entrée trouvée')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }))
    expect(screen.getByText('2 entrées trouvées')).toBeInTheDocument()
  })

  it('filters taxons by invasive status in advanced options', async () => {
    apiMocks.get.mockImplementationOnce(async (path: string) => {
      if (path === '/taxons') {
        return {
          data: {
            items: [
              {
                ...taxon,
                id: 'taxon_non_invasive',
                species: 'rufibarbis',
                invasive: false,
              },
              {
                ...taxon,
                id: 'taxon_invasive',
                genus: 'Linepithema',
                species: 'humile',
                invasive: true,
              },
            ],
            offset: 0,
            limit: 20,
            nextOffset: 20,
            hasMore: false,
            total: 2,
          },
        }
      }

      if (path === '/references') {
        return { data: [] }
      }

      throw new Error(`Unexpected call: ${path}`)
    })

    render(<TaxonsPage />)

    expect(await screen.findByText('2 entrées trouvées')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Options supplémentaires' }))

    const allRadio = screen.getByRole('radio', { name: 'Toutes' })
    const invasiveRadio = screen.getByRole('radio', { name: 'Invasives' })
    const nonInvasiveRadio = screen.getByRole('radio', { name: 'Non invasives' })

    fireEvent.click(invasiveRadio)
    expect(invasiveRadio).toBeChecked()
    expect(allRadio).not.toBeChecked()

    fireEvent.click(nonInvasiveRadio)
    expect(nonInvasiveRadio).toBeChecked()
    expect(invasiveRadio).not.toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }))
    expect(allRadio).toBeChecked()
  })

  it('switches to tree mode and shows tree view', async () => {
    render(<TaxonsPage />)

    await screen.findByText('Taxons enregistrés')
    fireEvent.click(screen.getByTitle('Basculer en vue arborescente'))

    fireEvent.click(screen.getByText('Formicinae'))
    expect(await screen.findByText('Sous-famille : Formicinae')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    fireEvent.click(screen.getByText('Lasiini'))
    expect(await screen.findByText('Sous-famille : Lasiini')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    fireEvent.click(screen.getByText('Formica'))
    expect(await screen.findByText((_, element) => element?.textContent === 'Genre : Formica')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    fireEvent.click(screen.getByText('Serviformica'))
    expect(await screen.findByText((_, element) => element?.textContent === 'Sous-genre : Serviformica')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    fireEvent.click(screen.getByText('rufibarbis group'))
    expect(await screen.findByText((_, element) => element?.textContent === "Groupe d'espèces : rufibarbis group")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    fireEvent.click(screen.getByText('rufibarbis'))
    expect(await screen.findByText((_, element) => element?.textContent === 'Espèce : rufibarbis')).toBeInTheDocument()
  })

  it('shows empty state when no taxons are returned', async () => {
    apiMocks.get.mockImplementationOnce(async (path: string) => {
      if (path === '/taxons') {
        return {
          data: {
            items: [],
            offset: 0,
            limit: 20,
            nextOffset: 0,
            hasMore: false,
            total: 0,
          },
        }
      }

      if (path === '/references') {
        return { data: [] }
      }

      throw new Error(`Unexpected call: ${path}`)
    })

    render(<TaxonsPage />)

    expect(await screen.findByText('Aucun taxon trouvé.')).toBeInTheDocument()
  })
})
