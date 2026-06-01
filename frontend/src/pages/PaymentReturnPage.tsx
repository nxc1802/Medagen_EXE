import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getPaymentStatus } from '../api/client'

type Status = 'loading' | 'success' | 'failed' | 'pending'

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')

  const orderCode = Number(searchParams.get('orderCode'))
  // PayOS also passes ?status=PAID or ?code=00 in the return URL
  const payosCode  = searchParams.get('code')
  const payosStatus = searchParams.get('status')

  useEffect(() => {
    const check = async () => {
      // Quick check from URL params first
      if (payosCode === '00' || payosStatus === 'PAID') {
        setStatus('success')
        return
      }
      if (payosCode && payosCode !== '00') {
        setStatus('failed')
        return
      }

      // Fallback: poll backend for order status
      if (!orderCode || isNaN(orderCode)) {
        setStatus('failed')
        return
      }

      try {
        const info = await getPaymentStatus(orderCode)
        if (info.status === 'PAID') setStatus('success')
        else if (info.status === 'CANCELLED' || info.status === 'EXPIRED') setStatus('failed')
        else setStatus('pending')
      } catch {
        setStatus('pending')
      }
    }

    check()
  }, [orderCode, payosCode, payosStatus])

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center">

        {status === 'loading' && (
          <>
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Đang xác nhận thanh toán…</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Vui lòng chờ trong giây lát.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-3xl">check_circle</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Thanh toán thành công!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Tài khoản của bạn đã được nâng cấp lên <span className="font-bold text-primary">Pro</span>. Hưởng thụ toàn bộ tính năng ngay bây giờ.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all"
              >
                Về trang chính
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Xem chi tiết gói
              </button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="size-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-500 dark:text-red-400 text-3xl">cancel</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Thanh toán không thành công</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Giao dịch đã bị huỷ hoặc xảy ra lỗi. Bạn chưa bị trừ tiền.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/upgrade')}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all"
              >
                Thử lại
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Về trang chính
              </button>
            </div>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="size-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-amber-500 text-3xl">schedule</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Đang chờ xác nhận</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Giao dịch đang được xử lý. Tài khoản Pro sẽ được kích hoạt tự động sau khi ngân hàng xác nhận (thường trong vài phút).
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all"
            >
              Về trang chính
            </button>
          </>
        )}

        {orderCode > 0 && (
          <p className="text-[11px] text-slate-400 mt-4">Mã đơn hàng: #{orderCode}</p>
        )}
      </div>
    </div>
  )
}
