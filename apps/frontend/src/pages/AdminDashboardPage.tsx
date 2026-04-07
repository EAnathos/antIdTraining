import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import type { AdminSection } from '../types/models'
import { useAdminData } from '../hooks/useAdminData'
import { AdminMobileMenu } from '../components/admin/AdminMobileMenu'
import { TaxonsCrudPanel } from '../components/admin/TaxonsCrudPanel'
import { ReferencesCrudPanel } from '../components/admin/ReferencesCrudPanel'
import { EntriesCrudPanel } from '../components/admin/EntriesCrudPanel'

export function AdminDashboardPage() {
  const token = localStorage.getItem('adminToken')
  const [section, setSection] = useState<AdminSection>('taxons')
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  const data = useAdminData(token)


  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="hidden flex-wrap gap-2 md:flex">
          <button className={`rounded-lg px-3 py-2 text-sm ${section === 'taxons' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`} onClick={() => setSection('taxons')}>Taxons</button>
          <button className={`rounded-lg px-3 py-2 text-sm ${section === 'references' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`} onClick={() => setSection('references')}>Références</button>
          <button className={`rounded-lg px-3 py-2 text-sm ${section === 'entries' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`} onClick={() => setSection('entries')}>Entrées</button>
        </div>

        <AdminMobileMenu
          adminMenuOpen={adminMenuOpen}
          setAdminMenuOpen={setAdminMenuOpen}
          section={section}
          setSection={setSection}
        />

        <button
          className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
          onClick={() => {
            localStorage.removeItem('adminToken')
            window.location.href = '/admin/login'
          }}
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
          />
        )}

        {section === 'references' && (
          <ReferencesCrudPanel
            references={data.references}
            referenceForm={data.referenceForm}
            setReferenceForm={data.setReferenceForm}
            selectedReferenceId={data.selectedReferenceId}
            setSelectedReferenceId={data.setSelectedReferenceId}
            createReference={data.createReference}
            updateReference={data.updateReference}
            deleteReference={data.deleteReference}
          />
        )}

        {section === 'entries' && (
          <EntriesCrudPanel
            entries={data.entries}
            taxons={data.taxons}
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
      </div>
    </section>
  )
}
