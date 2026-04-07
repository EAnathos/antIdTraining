import type { AdminSection } from '../../types/models'

type Props = {
  adminMenuOpen: boolean
  setAdminMenuOpen: (value: boolean | ((prev: boolean) => boolean)) => void
  section: AdminSection
  setSection: (value: AdminSection) => void
}

export function AdminMobileMenu({
  adminMenuOpen,
  setAdminMenuOpen,
  section,
  setSection,
}: Props) {
  return (
    <>
      <button
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:hidden"
        onClick={() => setAdminMenuOpen((open) => !open)}
      >
        ☰ Menu admin
      </button>

      {adminMenuOpen && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Section</p>
            <div className="flex flex-wrap gap-2">
              <button
                className={`rounded-lg px-3 py-2 text-sm ${section === 'taxons' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
                onClick={() => {
                  setSection('taxons')
                  setAdminMenuOpen(false)
                }}
              >
                Taxons
              </button>
              <button
                className={`rounded-lg px-3 py-2 text-sm ${section === 'references' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
                onClick={() => {
                  setSection('references')
                  setAdminMenuOpen(false)
                }}
              >
                Références
              </button>
              <button
                className={`rounded-lg px-3 py-2 text-sm ${section === 'entries' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
                onClick={() => {
                  setSection('entries')
                  setAdminMenuOpen(false)
                }}
              >
                Entrées
              </button>
            </div>
          </div>

        </div>
      )}

      <p className="text-sm text-slate-600 md:hidden">Vue: {section}</p>
    </>
  )
}
