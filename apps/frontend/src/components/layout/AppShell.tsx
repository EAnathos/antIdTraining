import { NavLink } from 'react-router-dom'

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
  }`
}

function adminNavClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
  }`
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <header className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Ant ID Training</h1>
        <nav className="mt-3 flex flex-wrap gap-2">
          <NavLink className={navClass} to="/" end>
            Jeu
          </NavLink>
          <NavLink className={navClass} to="/taxons">
            Taxons
          </NavLink>
          <NavLink className={navClass} to="/references">
            Références
          </NavLink>
          <NavLink className={adminNavClass} to="/admin/login">
            Admin
          </NavLink>
        </nav>
      </header>
      {children}
      <footer className="mt-8 rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600 shadow-sm">
        <p>
          Site conçu et maintenu par{' '}
          <a className="font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-4" href="https://anathos.me/" target="_blank" rel="noreferrer">
            Anathos
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
