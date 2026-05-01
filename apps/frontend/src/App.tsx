import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'

const GamePage = lazy(() => import('./pages/GamePage').then((module) => ({ default: module.GamePage })))
const TaxonsPage = lazy(() => import('./pages/TaxonsPage').then((module) => ({ default: module.TaxonsPage })))
const ReferencesPage = lazy(() => import('./pages/ReferencesPage').then((module) => ({ default: module.ReferencesPage })))
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })))

function App() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Chargement de la page…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<GamePage />} />
          <Route path="/jeu" element={<Navigate to="/" replace />} />
          <Route path="/taxons" element={<TaxonsPage />} />
          <Route path="/references" element={<ReferencesPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

export default App
