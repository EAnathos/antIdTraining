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
    suggestions: 'Contribuer',
    points: 'Points',
    stats: 'Statistiques',
    database: 'Outils',
    history: 'Historique',
  }

  const sectionOptions: { id: AdminSection; label: string }[] = [
    { id: 'taxons', label: 'Taxons' },
    { id: 'references', label: 'Références' },
    { id: 'entries', label: 'Entrées' },
    { id: 'suggestions', label: 'Contribuer' },
    { id: 'points', label: 'Points' },
    { id: 'database', label: 'Outils' },
  ]

  return (
    <div className="relative md:hidden">
      <button
        className="ui-button ui-button--secondary inline-flex items-center gap-2 px-3 py-2 text-sm"
        onClick={() => setAdminMenuOpen((open) => !open)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M3 12h18" />
          <path d="M3 18h18" />
        </svg>
        <span className="font-medium">{sectionLabelById[section]}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {adminMenuOpen ? (
            <path d="m18 15-6-6-6 6" />
          ) : (
            <path d="m6 9 6 6 6-6" />
          )}
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

          <div className="surface-panel surface-panel--solid absolute left-0 top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] space-y-2 p-3 shadow-lg">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-text-soft)]">
              Section
            </p>

            <div className="space-y-1">
              {sectionOptions.map((option) => (
                <button
                  key={option.id}
                  className={`ui-tab w-full justify-start ${section === option.id ? 'ui-tab--active' : ''}`}
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
