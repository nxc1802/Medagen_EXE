import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../contexts/SettingsContext'
import { createPaymentOrder } from '../api/client'

const PRO_FEATURES = [
  'Unlimited AI skin analyses',
  'Detailed diagnosis report with confidence scores',
  'Personalised AI Care Plan',
  'PDF export',
  'Full diagnosis history',
  'Telehealth referral (1/month)',
]

export default function UpgradePage() {
  const t = useT()
  const navigate = useNavigate()
  const [annual, setAnnual] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const price = annual ? 7 : 9
  const total = annual ? 84 : 9

  const handlePay = async () => {
    setLoading(true)
    setError('')
    try {
      const { checkoutUrl } = await createPaymentOrder(annual ? 'pro_annual' : 'pro_monthly')
      window.location.href = checkoutUrl
    } catch (err: any) {
      setError(err.message || 'Could not create payment order. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      {/* Sticky header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-14 md:top-0 z-10 flex items-center px-4 md:px-8 gap-3">
        <button
          onClick={() => navigate('/pricing')}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="material-symbols-outlined text-primary">workspace_premium</span>
        <h2 className="text-xl font-bold tracking-tight">{t('upgrade.title')}</h2>
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Order summary */}
        <aside className="lg:col-span-2 space-y-5">
          <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('upgrade.summary')}</h3>

          {/* Plan card */}
          <div className="bg-primary rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
              <div className="w-32 h-32 rounded-full bg-white translate-x-8 -translate-y-8" />
            </div>
            <div className="relative">
              <div className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider mb-3">
                {t('pricing.plan.pro.badge')}
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-black">${price}</span>
                <span className="text-white/70 text-sm mb-1">/ mo</span>
              </div>
              {annual && (
                <p className="text-white/60 text-xs">
                  {t('pricing.billedAnnually').replace('${0}', String(total))}
                </p>
              )}
            </div>
          </div>

          {/* Billing toggle */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{t('upgrade.billingLabel')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setAnnual(false)}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${!annual ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/40'}`}
              >
                {t('upgrade.monthly')} — $9/mo
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${annual ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/40'}`}
              >
                {t('upgrade.annual')} — $7/mo
                <span className="ml-1 text-[10px] text-emerald-600 font-black">{t('upgrade.annualSave')}</span>
              </button>
            </div>
          </div>

          {/* Features included */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Included in Pro</p>
            <ul className="space-y-2">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <span className="material-symbols-outlined text-emerald-500 text-sm">check</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Payment form */}
        <div className="lg:col-span-3">
            {/* PayOS redirect card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">account_balance</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Thanh toán qua PayOS</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Chuyển khoản ngân hàng · QR Code · ATM / Visa / Mastercard</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">MedaGen Pro</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {annual ? '1.690.000 ₫ / năm' : '229.000 ₫ / tháng'}
                  </span>
                </div>
                {annual && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tương đương</span>
                    <span className="text-slate-500">~140.833 ₫ / tháng</span>
                  </div>
                )}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5 flex justify-between font-bold">
                  <span className="text-slate-900 dark:text-white">Tổng cộng</span>
                  <span className="text-primary">{annual ? '1.690.000 ₫' : '229.000 ₫'}</span>
                </div>
              </div>

              {/* Accepted banks */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Phương thức thanh toán hỗ trợ</p>
                <div className="flex flex-wrap gap-2">
                  {['Vietcombank', 'Techcombank', 'MB Bank', 'VPBank', 'BIDV', 'Agribank', 'VietinBank', 'QR Code'].map(b => (
                    <span key={b} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">{b}</span>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl">
                  <span className="material-symbols-outlined text-red-500 text-sm shrink-0">error</span>
                  <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    Đang tạo đơn hàng…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">lock</span>
                    {t('upgrade.payBtn')} — {annual ? '1.690.000 ₫' : '229.000 ₫'}
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-4 mt-3">
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">security</span>
                  {t('upgrade.secure')}
                </p>
                <span className="text-slate-300">·</span>
                <p className="text-[11px] text-slate-400">{t('upgrade.cancel')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
