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
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Administration
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Espace réservé à la gestion du contenu et des contributions.
            </p>
          </div>

          <AdminMobileMenu
            adminMenuOpen={adminMenuOpen}
            setAdminMenuOpen={setAdminMenuOpen}
            section={section}
            setSection={setSection}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sections
          </p>
          <div className="flex flex-col gap-2">
            {adminSections.map((item) => (
              <button
                key={item.id}
                className={`rounded-lg px-3 py-2 text-left text-sm transition ${section === item.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {data.message && (
            <div
              className={`mb-4 rounded-lg px-3 py-2 text-sm ${isErrorMessage ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
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
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
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
                    className={`rounded-lg px-3 py-2 text-sm ${toolsTab === item.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
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
