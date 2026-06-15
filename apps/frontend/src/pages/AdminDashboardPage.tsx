import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AdminSection } from '../types/models'
import { useAdminData } from '../hooks/useAdminData'
import { AdminMobileMenu } from '../components/admin/AdminMobileMenu'
import { TaxonsCrudPanel } from '../components/admin/TaxonsCrudPanel'
import { ReferencesCrudPanel } from '../components/admin/ReferencesCrudPanel'
import { EntriesCrudPanel } from '../components/admin/EntriesCrudPanel'
import { DatabaseToolsPanel } from '../components/admin/DatabaseToolsPanel'
import { StatsPanel } from '../components/admin/StatsPanel'
import { SuggestionsPanel } from '../components/admin/SuggestionsPanel'
import { UserPointsPanel } from '../components/admin/UserPointsPanel'
import { AdminHistoryPanel } from '../components/admin/AdminHistoryPanel'
import { api } from '../lib/api'

const adminSections: { id: AdminSection; label: string }[] = [
  { id: 'taxons', label: 'Taxons' },
  { id: 'references', label: 'Références' },
  { id: 'entries', label: 'Entrées' },
  { id: 'suggestions', label: 'Contribuer' },
  { id: 'points', label: 'Points' },
  { id: 'database', label: 'Outils' },
]

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [section, setSection] = useState<AdminSection>('taxons')
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const [toolsTab, setToolsTab] = useState<'database' | 'stats' | 'history'>(
    'database',
  )

  const logoutToLogin = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined)
    window.localStorage.removeItem('antidtraining-auth-token')
    window.localStorage.removeItem('antidtraining-auth-role')
    window.localStorage.removeItem('antidtraining-auth-username')
    window.localStorage.removeItem('antidtraining-auth-email')
    window.dispatchEvent(new Event('antidtraining-auth-changed'))
    navigate('/connexion', { replace: true })
  }, [navigate])

  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('antidtraining-auth-token')
      : null
  const data = useAdminData(token, logoutToLogin)

  const normalizedMessage = data.message.toLowerCase()
  const isErrorMessage =
    normalizedMessage.includes('impossible') ||
    normalizedMessage.includes('introuvable') ||
    normalizedMessage.includes('invalide') ||
    normalizedMessage.includes('expirée') ||
    normalizedMessage.includes('http')

  return (
    <section className="page-shell space-y-6">
      <div className="surface-panel surface-panel--solid p-5 md:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <AdminMobileMenu
            adminMenuOpen={adminMenuOpen}
            setAdminMenuOpen={setAdminMenuOpen}
            section={section}
            setSection={setSection}
          />
        </div>
      </div>

      <div className="page-grid page-grid--two-col lg:flex lg:gap-4">
        <aside className="surface-panel surface-panel--solid hidden p-3 lg:block lg:w-1/5">
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-text-soft)]">
            Sections
          </p>
          <ul className="space-y-1">
            {adminSections.map((item) => (
              <li
                key={item.id}
                role="button"
                tabIndex={0}
                className={`cursor-pointer rounded px-3 py-2 text-sm ${
                  section === item.id
                    ? 'bg-[color:var(--app-surface-muted)] font-semibold text-[color:var(--app-text)]'
                    : 'text-[color:var(--app-text-soft)] hover:bg-[color:var(--app-surface-muted)]'
                }`}
                onClick={() => setSection(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSection(item.id)
                }}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </aside>

        <div className="surface-panel surface-panel--solid min-w-0 p-4 lg:w-4/5">
          {data.message && (
            <div
              className={`ui-alert mb-4 ${isErrorMessage ? 'ui-alert--danger' : 'ui-alert--success'}`}
            >
              {data.message}
            </div>
          )}

          {section === 'taxons' && (
            <TaxonsCrudPanel
              taxons={data.taxons}
              taxonForm={data.taxonForm}
              setTaxonForm={data.setTaxonForm}
              selectedTaxonId={data.selectedTaxonId}
              setSelectedTaxonId={data.setSelectedTaxonId}
              createTaxon={data.createTaxon}
              updateTaxon={data.updateTaxon}
              deleteTaxon={data.deleteTaxon}
              saveTaxonLevelDetails={data.saveTaxonLevelDetails}
            />
          )}

          {section === 'references' && (
            <ReferencesCrudPanel
              references={data.references}
              taxons={data.taxons}
              referenceForm={data.referenceForm}
              setReferenceForm={data.setReferenceForm}
              selectedReferenceId={data.selectedReferenceId}
              setSelectedReferenceId={data.setSelectedReferenceId}
              createReference={data.createReference}
              updateReference={data.updateReference}
              deleteReference={data.deleteReference}
              saveReferenceAuthorsAndTaxons={data.saveReferenceAuthorsAndTaxons}
              saveReferenceAuthorsAndTaxonsById={
                data.saveReferenceAuthorsAndTaxonsById
              }
            />
          )}

          {section === 'entries' && (
            <EntriesCrudPanel
              entries={data.entries}
              entriesPage={data.entriesPage}
              entriesLimit={data.entriesLimit}
              entriesTotal={data.entriesTotal}
              entriesPages={data.entriesPages}
              setEntriesPage={data.setEntriesPage}
              setEntriesLimit={data.setEntriesLimit}
              subfamilies={data.subfamilies}
              entryForm={data.entryForm}
              setEntryForm={data.setEntryForm}
              selectedEntryId={data.selectedEntryId}
              setSelectedEntryId={data.setSelectedEntryId}
              setEntryFiles={data.setEntryFiles}
              createEntry={data.createEntry}
              updateEntry={data.updateEntry}
              deleteEntry={data.deleteEntry}
              reorderEntryImages={data.reorderEntryImages}
            />
          )}

          {section === 'suggestions' && (
            <SuggestionsPanel
              suggestions={data.suggestions}
              setSuggestionStatus={data.setSuggestionStatus}
              deleteSuggestion={data.deleteSuggestion}
              updateSuggestionRejectionMessage={
                data.updateSuggestionRejectionMessage
              }
              proposals={data.proposals}
              setProposalStatus={data.setProposalStatus}
              deleteProposal={data.deleteProposal}
              updateProposalRejectionMessage={
                data.updateProposalRejectionMessage
              }
            />
          )}

          {section === 'points' && (
            <UserPointsPanel
              users={data.users}
              setUserPoints={data.setUserPoints}
            />
          )}

          {section === 'database' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 border-b border-[color:var(--app-border)] pb-2">
                {(
                  [
                    { id: 'database', label: 'Base de données' },
                    { id: 'stats', label: 'Statistiques' },
                    { id: 'history', label: 'Historique' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`ui-tab text-sm ${toolsTab === item.id ? 'ui-tab--active' : ''}`}
                    onClick={() => setToolsTab(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {toolsTab === 'database' && (
                <DatabaseToolsPanel
                  exportDatabaseSnapshot={data.exportDatabaseSnapshot}
                  importDatabaseSnapshot={data.importDatabaseSnapshot}
                  cleanupUploads={data.cleanupUploads}
                />
              )}

              {toolsTab === 'stats' && (
                <StatsPanel
                  stats={data.gameStats}
                  period={data.statsPeriod}
                  setPeriod={data.setStatsPeriod}
                />
              )}

              {toolsTab === 'history' && (
                <AdminHistoryPanel history={data.history} />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
