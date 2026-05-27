import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MapRecommendationPage from './pages/MapRecommendationPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import HistoryPage from './pages/HistoryPage'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import ResultsPage from './pages/ResultsPage'
import CarePlanPage from './pages/CarePlanPage'
import HealthProfilePage from './pages/HealthProfilePage'
import EmailConfirmedPage from './pages/EmailConfirmedPage'
import ChatPage from './pages/ChatPage'
import HelpPage from './pages/HelpPage'
import SettingsPage from './pages/SettingsPage'
import { SettingsProvider } from './contexts/SettingsContext'

// Nếu đã login → vào /dashboard thẳng, không qua landing
function RootRedirect() {
  const [checked, setChecked] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
      setChecked(true)
    })
  }, [])

  if (!checked) return null // tránh flash
  return loggedIn ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

function App() {
  return (
    <SettingsProvider>
    <BrowserRouter>
      <Routes>
        {/* Landing — tự redirect nếu đã login */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/confirm" element={<EmailConfirmedPage />} />
        <Route path="/map-recommendation" element={<MapRecommendationPage />} />

        {/* Protected: sidebar layout */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/care-plan" element={<CarePlanPage />} />
          <Route path="/health-profile" element={<HealthProfilePage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </SettingsProvider>
  )
}

export default App
