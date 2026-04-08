import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import type { AdminSection } from '../types/models'
import { useAdminData } from '../hooks/useAdminData'
import { AdminMobileMenu } from '../components/admin/AdminMobileMenu'
import { TaxonsCrudPanel } from '../components/admin/TaxonsCrudPanel'
import { ReferencesCrudPanel } from '../components/admin/ReferencesCrudPanel'
import { EntriesCrudPanel } from '../components/admin/EntriesCrudPanel'
import { DatabaseToolsPanel } from '../components/admin/DatabaseToolsPanel'
import { StatsPanel } from '../components/admin/StatsPanel'

const ADMIN_TOKEN_KEY = 'adminToken'

function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY)
}

function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
}

const adminSections: { id: AdminSection; label: string }[] = [
  { id: 'taxons', label: 'Taxons' },
  { id: 'references', label: 'Références' },
  { id: 'entries', label: 'Entrées' },
  { id: 'stats', label: 'Statistiques' },
  { id: 'database', label: 'Base de données' },
]

export function AdminDashboardPage() {
  const token = getAdminToken()
  const [section, setSection] = useState<AdminSection>('taxons')
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)

  function logoutToLogin() {
    clearAdminToken()
    window.location.href = '/admin/login'
  }

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  const data = useAdminData(token, logoutToLogin)


  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="hidden flex-wrap gap-2 md:flex">
          {adminSections.map((item) => (
            <button
              key={item.id}
              className={`rounded-lg px-3 py-2 text-sm ${section === item.id ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <AdminMobileMenu
          adminMenuOpen={adminMenuOpen}
          setAdminMenuOpen={setAdminMenuOpen}
          section={section}
          setSection={setSection}
        />

        <button
          className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
          onClick={logoutToLogin}
        >
          Déconnexion
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {data.message && (
          <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${data.message.includes('impossible') || data.message.includes('Payload') || data.message.includes('HTTP') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
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
            saveReferenceAuthorsAndTaxonsById={data.saveReferenceAuthorsAndTaxonsById}
          />
        )}

        {section === 'entries' && (
          <EntriesCrudPanel
            entries={data.entries}
            subfamilies={data.subfamilies}
            entryForm={data.entryForm}
            setEntryForm={data.setEntryForm}
            selectedEntryId={data.selectedEntryId}
            setSelectedEntryId={data.setSelectedEntryId}
            setEntryFiles={data.setEntryFiles}
            createEntry={data.createEntry}
            updateEntry={data.updateEntry}
            deleteEntry={data.deleteEntry}
          />
        )}

        {section === 'stats' && (
          <StatsPanel
            stats={data.gameStats}
            period={data.statsPeriod}
            setPeriod={data.setStatsPeriod}
          />
        )}

        {section === 'database' && (
          <DatabaseToolsPanel
            exportDatabase={data.exportDatabase}
            importDatabase={data.importDatabase}
          />
        )}
      </div>
    </section>
  )
}
