import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'

const GamePage = lazy(() =>
  import('./pages/GamePage').then((module) => ({ default: module.GamePage })),
)
const TaxonsPage = lazy(() =>
  import('./pages/TaxonsPage').then((module) => ({
    default: module.TaxonsPage,
  })),
)
const ReferencesPage = lazy(() =>
  import('./pages/ReferencesPage').then((module) => ({
    default: module.ReferencesPage,
  })),
)
const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })),
)
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
)
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  })),
)
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
)
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  })),
)
const LeaderboardPage = lazy(() =>
  import('./pages/LeaderboardPage').then((module) => ({
    default: module.LeaderboardPage,
  })),
)
const ContributionPage = lazy(() =>
  import('./pages/ContributionPage').then((module) => ({
    default: module.ContributionPage,
  })),
)
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((module) => ({ default: module.default })),
)

function App() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="surface-panel surface-panel--compact text-sm text-[color:var(--app-text-muted)]">
            Chargement de la page…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<GamePage />} />
          <Route path="/jeu" element={<Navigate to="/" replace />} />
          <Route path="/taxons" element={<TaxonsPage />} />
          <Route path="/references" element={<ReferencesPage />} />
          <Route path="/contribution" element={<ContributionPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/classement" element={<LeaderboardPage />} />
          <Route path="/connexion" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/profil" element={<ProfilePage />} />
          <Route
            path="/admin/login"
            element={<Navigate to="/connexion" replace />}
          />
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

export default App
