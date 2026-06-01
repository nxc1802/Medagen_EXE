import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    if (error) {
      navigate(`/login?error=${encodeURIComponent(errorDescription || error)}`, { replace: true })
      return
    }

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          navigate(`/login?error=${encodeURIComponent(error.message)}`, { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      })
      return
    }

    // Fallback: no code in URL, check if session already exists
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="text-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin block mb-4">
          progress_activity
        </span>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Đang xác thực...</p>
      </div>
    </div>
  )
}
