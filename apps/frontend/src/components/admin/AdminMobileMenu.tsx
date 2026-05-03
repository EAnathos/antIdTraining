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
  const sectionLabelById: Record<AdminSection, string> = {
    taxons: 'Taxons',
    references: 'Références',
    entries: 'Entrées',
    suggestions: 'Suggestions',
    stats: 'Statistiques',
    database: 'Base de données',
    history: 'Historique',
  }

  const sectionOptions: { id: AdminSection; label: string }[] = [
    { id: 'taxons', label: 'Taxons' },
    { id: 'references', label: 'Références' },
    { id: 'entries', label: 'Entrées' },
    { id: 'suggestions', label: 'Suggestions' },
    { id: 'stats', label: 'Statistiques' },
    { id: 'database', label: 'Base de données' },
    { id: 'history', label: 'Historique' },
  ]

  return (
    <div className="relative md:hidden">
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        onClick={() => setAdminMenuOpen((open) => !open)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M3 12h18" />
          <path d="M3 18h18" />
        </svg>
        <span className="font-medium">{sectionLabelById[section]}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {adminMenuOpen ? <path d="m18 15-6-6-6 6" /> : <path d="m6 9 6 6 6-6" />}
        </svg>
      </button>

      {adminMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu admin"
            className="fixed inset-0 z-10 bg-transparent"
            onClick={() => setAdminMenuOpen(false)}
          />

          <div className="absolute left-0 top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Section</p>

            <div className="space-y-1">
              {sectionOptions.map((option) => (
                <button
                  key={option.id}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${section === option.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                  onClick={() => {
                    setSection(option.id)
                    setAdminMenuOpen(false)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
