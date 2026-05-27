import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
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
            <h1 className="text-3xl font-black leading-tight tracking-tight mb-2">Forgot Password</h1>
            <p className="text-slate-500 dark:text-slate-400 text-base font-normal">
              Enter your email and we'll send you a reset link
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="size-16 flex items-center justify-center bg-green-100 dark:bg-green-950/30 rounded-full">
              <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400">mark_email_read</span>
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Check your inbox</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We sent a password reset link to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>
              </p>
            </div>
            <Link
              to="/login"
              className="mt-2 text-sm text-primary font-medium hover:underline"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="flex flex-col w-full">
                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">
                  Email Address
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    mail
                  </span>
                  <input
                    className="flex w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 pl-12 pr-4 text-base font-normal placeholder:text-slate-400 outline-none transition-all"
                    placeholder="name@company.com"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-primary font-medium hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
