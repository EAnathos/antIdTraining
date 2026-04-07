import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { GamePage } from './pages/GamePage'
import { TaxonsPage } from './pages/TaxonsPage'
import { ReferencesPage } from './pages/ReferencesPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/jeu" element={<Navigate to="/" replace />} />
        <Route path="/taxons" element={<TaxonsPage />} />
        <Route path="/references" element={<ReferencesPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>
    </AppShell>
  )
}

export default App
