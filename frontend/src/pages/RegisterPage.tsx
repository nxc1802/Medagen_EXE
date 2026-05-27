import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (!agreed) {
      setError('Please accept the Terms of Service and Privacy Policy.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(true)
  }

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setError(error.message)
  }

  const handleFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setError(error.message)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-10 max-w-md w-full text-center">
          <div className="size-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-green-600 text-3xl">mark_email_read</span>
          </div>
          <h2 className="text-2xl font-black mb-2">Check your email</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            We sent a confirmation link to <strong className="text-slate-900 dark:text-white">{email}</strong>. Click the link to activate your account.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      {/* Navigation */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 md:px-10 py-3 bg-white dark:bg-background-dark">
        <Link to="/" className="flex items-center gap-4">
          <div className="size-8 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z" fill="currentColor" />
              <path clipRule="evenodd" d="M39.998 35.764C39.9944 35.7463 39.9875 35.7155 39.9748 35.6706C39.9436 35.5601 39.8949 35.4259 39.8346 35.2825C39.8168 35.2403 39.7989 35.1993 39.7813 35.1602C38.5103 34.2887 35.9788 33.0607 33.7095 32.5189C30.9875 31.8691 27.6413 31.4783 24 31.4783C20.3587 31.4783 17.0125 31.8691 14.2905 32.5189C12.0012 33.0654 9.44505 34.3104 8.18538 35.1832C8.17384 35.2075 8.16216 35.233 8.15052 35.2592C8.09919 35.3751 8.05721 35.4886 8.02977 35.589C8.00356 35.6848 8.00039 35.7333 8.00004 35.7388C8.00004 35.739 8 35.7393 8.00004 35.7388C8.00004 35.7641 8.0104 36.0767 8.68485 36.6314C9.34546 37.1746 10.4222 37.7531 11.9291 38.2772C14.9242 39.319 19.1919 40 24 40C28.8081 40 33.0758 39.319 36.0709 38.2772C37.5778 37.7531 38.6545 37.1746 39.3151 36.6314C39.9006 36.1499 39.9857 35.8511 39.998 35.764Z" fill="currentColor" fillRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold leading-tight tracking-tight">MedaGen</h2>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-sm text-slate-500 dark:text-slate-400">Already have an account?</span>
          <Link
            to="/login"
            className="flex items-center justify-center rounded-lg h-10 px-4 border border-primary text-primary hover:bg-primary/10 text-sm font-bold transition-colors"
          >
            Log In
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-10">
        <div className="w-full max-w-[1000px] flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">

          {/* Left: Branding */}
          <div className="hidden md:flex flex-1 flex-col justify-between p-12 bg-primary text-white relative">
            <div className="z-10">
              <h1 className="text-4xl font-black mb-6 leading-tight">Secure Health Management Starts Here.</h1>
              <p className="text-lg opacity-90 leading-relaxed mb-8">
                Join thousands of healthcare professionals and patients using MedaGen for private, encrypted medical record storage and management.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: 'verified_user', label: 'HIPAA Compliant Security' },
                  { icon: 'sync', label: 'Real-time Data Syncing' },
                  { icon: 'family_restroom', label: 'Family Access Controls' },
                ].map(({ icon, label }) => (
                  <li key={label} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-white">{icon}</span>
                    <span className="font-medium text-base">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="z-10 mt-12 border-t border-white/20 pt-8">
              <p className="text-sm italic opacity-80">
                "MedaGen has revolutionized how we handle patient data privacy. Highly recommended for any modern practice."
              </p>
              <p className="text-sm font-bold mt-2">— Dr. Sarah Jenkins, Chief of Medicine</p>
            </div>
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
            />
          </div>

          {/* Right: Form */}
          <div className="flex-1 p-8 md:p-12">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create your account</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Enter your details to get started with your secure dashboard.</p>
            </div>

            {error && (
              <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="fullname">Full Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">person</span>
                  <input
                    id="fullname"
                    type="text"
                    required
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="email">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl z-10">lock</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="confirm-password">Confirm Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl z-10">shield_lock</span>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 py-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400 leading-normal cursor-pointer">
                  By clicking "Create Account", I agree to MedaGen's{' '}
                  <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !agreed}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><span className="material-symbols-outlined animate-spin">progress_activity</span> Creating account...</>
                ) : (
                  <><span>Create Account</span><span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span></>
                )}
              </button>
            </form>

            {/* Social */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or continue with</span>
                </div>
              </div>
              <div className="mt-6 flex gap-4">
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="text-sm font-semibold">Google</span>
                </button>
                <button
                  type="button"
                  onClick={handleFacebook}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="text-sm font-semibold">Facebook</span>
                </button>
              </div>
            </div>

            <div className="mt-8 text-center md:hidden">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-bold hover:underline">Log In</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-10 py-6 text-center text-slate-400 dark:text-slate-600 text-xs">
        <p>© 2024 MedaGen Health Solutions Inc. All rights reserved. HIPAA &amp; GDPR Compliant.</p>
      </footer>
    </div>
  )
}
