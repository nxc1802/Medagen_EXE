import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase sets session from the URL hash after redirect
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true)
      } else {
        setError('Invalid or expired reset link. Please request a new one.')
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-background-light dark:bg-background-dark p-4 font-display text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 md:p-10">

        <header className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-3 text-primary mb-6">
            <div className="size-10 flex items-center justify-center bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined text-3xl">medical_services</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight tracking-tight">MedaGen</h2>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black leading-tight tracking-tight mb-2">Reset Password</h1>
            <p className="text-slate-500 dark:text-slate-400 text-base font-normal">
              Enter your new password below
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        {ready ? (
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="flex flex-col w-full">
                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">
                  New Password
                </span>
                <div className="relative flex w-full items-stretch">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    lock
                  </span>
                  <input
                    className="flex w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 pl-12 pr-12 text-base font-normal placeholder:text-slate-400 outline-none transition-all"
                    placeholder="At least 6 characters"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col w-full">
                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">
                  Confirm Password
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    lock_reset
                  </span>
                  <input
                    className="flex w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 pl-12 pr-4 text-base font-normal placeholder:text-slate-400 outline-none transition-all"
                    placeholder="Re-enter your password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </label>
            </div>

            <button
              className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary text-white text-base font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading && (
                <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              )}
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        ) : !error ? (
          <div className="flex justify-center py-8">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
