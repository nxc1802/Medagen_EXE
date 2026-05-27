import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Status = 'verifying' | 'success' | 'error'

export default function EmailConfirmedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('verifying')
  const [countdown, setCountdown] = useState(5)

  // Step 1: verify the token from URL
  useEffect(() => {
    async function verify() {
      // PKCE flow: ?token_hash=...&type=email
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type') as 'email' | 'signup' | null

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        setStatus(error ? 'error' : 'success')
        return
      }

      // Implicit flow: #access_token=...&type=signup already processed by supabase-js
      const { data } = await supabase.auth.getSession()
      setStatus(data.session ? 'success' : 'error')
    }

    verify()
  }, [searchParams])

  // Step 2: countdown then auto-redirect on success
  useEffect(() => {
    if (status !== 'success') return

    const interval = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) {
          clearInterval(interval)
          navigate('/login')
        }
        return n - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [status, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-10 max-w-md w-full text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 text-primary mb-8">
          <div className="size-9 flex items-center justify-center bg-primary/10 rounded-lg">
            <span className="material-symbols-outlined text-2xl">medical_services</span>
          </div>
          <span className="text-xl font-bold">MedaGen</span>
        </div>

        {/* Verifying */}
        {status === 'verifying' && (
          <>
            <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
            </div>
            <h1 className="text-2xl font-black mb-2">Đang xác thực...</h1>
            <p className="text-slate-500 dark:text-slate-400">Vui lòng chờ trong giây lát.</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="size-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-once">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-3xl">verified</span>
            </div>
            <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Email đã xác thực!</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Tài khoản của bạn đã được kích hoạt thành công. Bạn có thể đăng nhập ngay bây giờ.
            </p>

            {/* Countdown progress ring */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="relative size-16">
                <svg className="size-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800" strokeWidth="5" />
                  <circle cx="32" cy="32" r="28" fill="none"
                    stroke="currentColor" className="text-primary transition-all duration-1000"
                    strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - countdown / 5)}`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-primary">
                  {countdown}
                </span>
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Tự động chuyển về trang đăng nhập sau <span className="font-semibold text-slate-600 dark:text-slate-300">{countdown}s</span>
              </p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">login</span>
              Đăng nhập ngay
            </button>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="size-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
            </div>
            <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Liên kết không hợp lệ</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Liên kết xác thực đã hết hạn hoặc đã được sử dụng. Vui lòng đăng ký lại hoặc yêu cầu gửi lại email.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                Về trang đăng nhập
              </button>
              <button
                onClick={() => navigate('/register')}
                className="w-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Đăng ký lại
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
