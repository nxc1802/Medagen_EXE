import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/dashboard')
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setError(error.message)
  }

  const handleGitHubLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-background-light dark:bg-background-dark p-4 font-display text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 md:p-10">

        {/* Header */}
        <header className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-3 text-primary mb-6">
            <div className="size-10 flex items-center justify-center bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined text-3xl">medical_services</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight tracking-tight">MedaGen</h2>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black leading-tight tracking-tight mb-2">Welcome Back</h1>
            <p className="text-slate-500 dark:text-slate-400 text-base font-normal">
              Log in to your healthcare dashboard
            </p>
          </div>
        </header>

        {/* Error message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* Email */}
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

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="flex flex-col w-full">
              <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">
                Password
              </span>
              <div className="relative flex w-full items-stretch">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  lock
                </span>
                <input
                  className="flex w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 pl-12 pr-12 text-base font-normal placeholder:text-slate-400 outline-none transition-all"
                  placeholder="Enter your password"
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
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-primary text-sm font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2 -mt-2">
            <input
              className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label
              className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer"
              htmlFor="remember"
            >
              Keep me logged in
            </label>
          </div>

          {/* Submit */}
          <button
            className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary text-white text-base font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading}
          >
            {loading && (
              <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
            )}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white dark:bg-slate-900 px-4 text-slate-500">Or continue with</span>
          </div>
        </div>

        {/* OAuth buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-2 h-12 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            type="button"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm font-medium">Google</span>
          </button>

          <button
            onClick={handleGitHubLogin}
            className="flex items-center justify-center gap-2 h-12 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            type="button"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            <span className="text-sm font-medium">GitHub</span>
          </button>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline">
              Sign Up
            </Link>
          </p>
        </footer>
      </div>

      {/* Bottom links */}
      <div className="mt-8 flex gap-6 text-slate-400 text-xs">
        <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        <Link to="/help" className="hover:text-primary transition-colors">Help Center</Link>
      </div>
    </div>
  )
}
