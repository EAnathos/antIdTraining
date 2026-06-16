interface StaticPageProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function StaticPage({ title, subtitle, children }: StaticPageProps) {
  return (
    <section className="surface-panel surface-panel--solid p-6">
      <h2 className="text-2xl font-semibold text-[color:var(--app-text)]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
          {subtitle}
        </p>
      )}
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  )
}

interface StaticSectionProps {
  title: string
  children: React.ReactNode
}

export function StaticSection({ title, children }: StaticSectionProps) {
  return (
    <section>
      <h3 className="text-lg font-medium text-[color:var(--app-text)]">
        {title}
      </h3>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  )
}

export function StaticP({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-justify text-[color:var(--app-text-muted)]">
      {children}
    </p>
  )
}
