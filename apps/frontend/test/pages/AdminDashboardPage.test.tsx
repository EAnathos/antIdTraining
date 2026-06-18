import '@testing-library/jest-dom'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useAdminDataMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/hooks/useAdminData', () => ({
  useAdminData: useAdminDataMock,
}))

vi.mock('../../src/components/admin/AdminMobileMenu', () => ({
  AdminMobileMenu: () => <div>Mobile menu</div>,
}))

vi.mock('../../src/components/admin/TaxonsCrudPanel', () => ({
  TaxonsCrudPanel: () => <div>Taxons panel</div>,
}))

vi.mock('../../src/components/admin/ReferencesCrudPanel', () => ({
  ReferencesCrudPanel: () => <div>References panel</div>,
}))

vi.mock('../../src/components/admin/EntriesCrudPanel', () => ({
  EntriesCrudPanel: () => <div>Entries panel</div>,
}))

vi.mock('../../src/components/admin/DatabaseToolsPanel', () => ({
  DatabaseToolsPanel: () => <div>Database tools</div>,
}))

vi.mock('../../src/components/admin/StatsPanel', () => ({
  StatsPanel: () => <div>Stats panel</div>,
}))

vi.mock('../../src/components/admin/SuggestionsPanel', () => ({
  SuggestionsPanel: () => <div>Suggestions panel</div>,
}))

vi.mock('../../src/components/admin/UserPointsPanel', () => ({
  UserPointsPanel: () => <div>Points panel</div>,
}))

vi.mock('../../src/components/admin/AdminHistoryPanel', () => ({
  AdminHistoryPanel: ({ history }: { history: unknown[] }) => (
    <div>history:{history.length}</div>
  ),
}))

vi.mock('../../src/lib/api', () => ({
  api: { post: vi.fn().mockResolvedValue({}) },
}))

import { AdminDashboardPage } from '../../src/pages/AdminDashboardPage'

const renderPage = () =>
  render(
    <BrowserRouter>
      <AdminDashboardPage />
    </BrowserRouter>,
  )

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAdminDataMock.mockReturnValue({
      message: '',
      taxons: [],
      taxonForm: {
        subfamily: '',
        tribe: '',
        genus: '',
        subgenus: '',
        speciesGroup: '',
        species: '',
        distribution: [],
      },
      setTaxonForm: vi.fn(),
      selectedTaxonId: '',
      setSelectedTaxonId: vi.fn(),
      createTaxon: vi.fn(),
      updateTaxon: vi.fn(),
      deleteTaxon: vi.fn(),
      saveTaxonLevelDetails: vi.fn(),
      references: [],
      referenceForm: {
        title: '',
        authors: '',
        description: '',
        type: 'WEBSITE',
        url: '',
        taxonIds: [],
      },
      setReferenceForm: vi.fn(),
      selectedReferenceId: '',
      setSelectedReferenceId: vi.fn(),
      createReference: vi.fn(),
      updateReference: vi.fn(),
      deleteReference: vi.fn(),
      saveReferenceAuthorsAndTaxons: vi.fn(),
      saveReferenceAuthorsAndTaxonsById: vi.fn(),
      entries: [],
      entriesPage: 1,
      entriesLimit: 50,
      entriesTotal: 0,
      entriesPages: 1,
      setEntriesPage: vi.fn(),
      setEntriesLimit: vi.fn(),
      entryStats: null,
      gameStats: [],
      statsPeriod: 'all',
      setStatsPeriod: vi.fn(),
      entryForm: {
        subfamily: '',
        genus: '',
        subgenus: '',
        species: '',
        speciesGroup: '',
        department: '',
        observedAt: '',
        biotope: '',
        photoCredit: '',
        caste: '',
      },
      setEntryForm: vi.fn(),
      entryFiles: null,
      setEntryFiles: vi.fn(),
      selectedEntryId: '',
      setSelectedEntryId: vi.fn(),
      createEntry: vi.fn(),
      updateEntry: vi.fn(),
      deleteEntry: vi.fn(),
      reorderEntryImages: vi.fn(),
      suggestions: [],
      setSuggestionStatus: vi.fn(),
      deleteSuggestion: vi.fn(),
      updateSuggestionRejectionMessage: vi.fn(),
      proposals: [],
      setProposalStatus: vi.fn(),
      deleteProposal: vi.fn(),
      updateProposalRejectionMessage: vi.fn(),
      history: [
        {
          id: 'event_1',
          at: '2026-05-29T10:00:00.000Z',
          title: 'Taxon créé',
          detail: 'Formica rufa (par Admin).',
          tone: 'success',
        },
      ],
      users: [],
      setUserPoints: vi.fn(),
      exportDatabaseSnapshot: vi.fn(),
      importDatabaseSnapshot: vi.fn(),
      cleanupUploads: vi.fn(),
    })
  })

  it('shows the admin history tab content with mocked data', () => {
    renderPage()

    expect(screen.getByText('Taxons panel')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Outils' }))
    fireEvent.click(screen.getByRole('button', { name: 'Historique' }))

    expect(screen.getByText('history:1')).toBeInTheDocument()
  })

  it('renders error-styled message when message contains error keywords', () => {
    useAdminDataMock.mockReturnValueOnce({
      message: 'Impossible de charger les données',
      taxons: [],
    })
    renderPage()

    const messageEl = screen.getByText(/Impossible de charger/)
    expect(messageEl).toHaveClass('ui-alert--danger')
  })

  it('renders success-styled message when message is positive', () => {
    useAdminDataMock.mockReturnValueOnce({
      message: 'Opération réussie',
      taxons: [],
    })
    renderPage()

    const messageEl = screen.getByText(/Opération réussie/)
    expect(messageEl).toHaveClass('ui-alert--success')
  })

  it('renders section buttons', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Taxons' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Références' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrées' })).toBeInTheDocument()
  })

  it('executes logoutToLogin when the hook requests logout', async () => {
    const removeSpy = vi.spyOn(window.localStorage.__proto__, 'removeItem')
    // when the hook is invoked, call the provided logout callback
    useAdminDataMock.mockImplementationOnce((logout: any) => {
      if (logout) void logout()
      return {
        message: '',
        taxons: [],
        // minimal data required by the component
        taxonForm: {
          subfamily: '',
          tribe: '',
          genus: '',
          subgenus: '',
          speciesGroup: '',
          species: '',
          distribution: [],
        },
        setTaxonForm: vi.fn(),
        selectedTaxonId: '',
        setSelectedTaxonId: vi.fn(),
        createTaxon: vi.fn(),
        updateTaxon: vi.fn(),
        deleteTaxon: vi.fn(),
        saveTaxonLevelDetails: vi.fn(),
        references: [],
        referenceForm: {
          title: '',
          authors: '',
          description: '',
          type: 'WEBSITE',
          url: '',
          taxonIds: [],
        },
        setReferenceForm: vi.fn(),
        selectedReferenceId: '',
        setSelectedReferenceId: vi.fn(),
        createReference: vi.fn(),
        updateReference: vi.fn(),
        deleteReference: vi.fn(),
        saveReferenceAuthorsAndTaxons: vi.fn(),
        saveReferenceAuthorsAndTaxonsById: vi.fn(),
        entries: [],
        entriesPage: 1,
        entriesLimit: 25,
        entriesTotal: 0,
        entriesPages: 1,
        setEntriesPage: vi.fn(),
        setEntriesLimit: vi.fn(),
        entryStats: null,
        gameStats: [],
        statsPeriod: 'all',
        setStatsPeriod: vi.fn(),
        entryForm: {
          subfamily: '',
          genus: '',
          subgenus: '',
          species: '',
          speciesGroup: '',
          department: '',
          observedAt: '',
          biotope: '',
          photoCredit: '',
          caste: '',
        },
        setEntryForm: vi.fn(),
        entryFiles: null,
        setEntryFiles: vi.fn(),
        selectedEntryId: '',
        setSelectedEntryId: vi.fn(),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        reorderEntryImages: vi.fn(),
        suggestions: [],
        setSuggestionStatus: vi.fn(),
        deleteSuggestion: vi.fn(),
        updateSuggestionRejectionMessage: vi.fn(),
        proposals: [],
        setProposalStatus: vi.fn(),
        deleteProposal: vi.fn(),
        updateProposalRejectionMessage: vi.fn(),
        history: [],
        users: [],
        setUserPoints: vi.fn(),
        exportDatabaseSnapshot: vi.fn(),
        importDatabaseSnapshot: vi.fn(),
        cleanupUploads: vi.fn(),
      }
    })

    renderPage()

    // logoutToLogin should remove localStorage keys
    await waitFor(() => expect(removeSpy).toHaveBeenCalled())
  })
})
