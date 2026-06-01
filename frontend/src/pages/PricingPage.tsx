import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../contexts/SettingsContext'

export default function PricingPage() {
  const t = useT()
  const navigate = useNavigate()
  const [annual, setAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const PLANS = [
    {
      name: 'Free',
      badge: t('pricing.plan.free.badge'),
      badgeStyle: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
      badgeIcon: 'stars',
      monthly: 0,
      annual: 0,
      desc: t('pricing.plan.free.desc'),
      color: 'border-slate-200 dark:border-slate-700',
      headerBg: 'bg-slate-50 dark:bg-slate-800/50',
      priceColor: 'text-slate-900 dark:text-white',
      descColor: 'text-slate-500 dark:text-slate-400',
      cta: t('pricing.plan.free.cta'),
      ctaStyle: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700',
      onCta: () => navigate('/login'),
      features: [
        { icon: 'check', text: t('pricing.feat.allPro'), highlight: true },
        { icon: 'check', text: t('pricing.feat.noCard'), highlight: true },
        { icon: 'check', text: t('pricing.feat.analyses') },
        { icon: 'check', text: t('pricing.feat.basicReport') },
        { icon: 'check', text: t('pricing.feat.map') },
        { icon: 'check', text: t('pricing.feat.history7') },
        { icon: 'close', text: t('pricing.feat.carePlanAfter'), muted: true },
        { icon: 'close', text: t('pricing.feat.pdfAfter'), muted: true },
      ],
    },
    {
      name: 'Pro',
      badge: t('pricing.plan.pro.badge'),
      badgeStyle: 'bg-white/20 text-white',
      badgeIcon: null,
      monthly: 9,
      annual: 7,
      desc: t('pricing.plan.pro.desc'),
      color: 'border-primary shadow-xl shadow-primary/10',
      headerBg: 'bg-primary',
      priceColor: 'text-white',
      descColor: 'text-white/70',
      cta: t('pricing.plan.pro.cta'),
      ctaStyle: 'bg-primary text-white hover:bg-primary/90',
      onCta: () => navigate('/upgrade'),
      features: [
        { icon: 'check', text: t('pricing.feat.unlimited') },
        { icon: 'check', text: t('pricing.feat.detailedReport') },
        { icon: 'check', text: t('pricing.feat.map') },
        { icon: 'check', text: t('pricing.feat.fullHistory') },
        { icon: 'check', text: t('pricing.feat.carePlan') },
        { icon: 'check', text: t('pricing.feat.pdf') },
        { icon: 'check', text: t('pricing.feat.telehealth') },
        { icon: 'close', text: t('pricing.feat.prioritySupport'), muted: true },
      ],
    },
    {
      name: 'Enterprise',
      badge: null,
      badgeStyle: '',
      badgeIcon: null,
      monthly: null,
      annual: null,
      desc: t('pricing.plan.ent.desc'),
      color: 'border-slate-800 dark:border-slate-600',
      headerBg: 'bg-slate-900',
      priceColor: 'text-white',
      descColor: 'text-white/70',
      cta: t('pricing.plan.ent.cta'),
      ctaStyle: 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800',
      onCta: () => navigate('/contact'),
      features: [
        { icon: 'check', text: t('pricing.feat.entUnlimited') },
        { icon: 'check', text: t('pricing.feat.customModel') },
        { icon: 'check', text: t('pricing.feat.ehr') },
        { icon: 'check', text: t('pricing.feat.hipaa') },
        { icon: 'check', text: t('pricing.feat.whiteLabel') },
        { icon: 'check', text: t('pricing.feat.accountManager') },
        { icon: 'check', text: t('pricing.feat.unlimitedTelehealth') },
        { icon: 'check', text: t('pricing.feat.support247') },
      ],
    },
  ]

  const FAQS = [
    { q: t('pricing.faq.0.q'), a: t('pricing.faq.0.a') },
    { q: t('pricing.faq.1.q'), a: t('pricing.faq.1.a') },
    { q: t('pricing.faq.2.q'), a: t('pricing.faq.2.a') },
    { q: t('pricing.faq.3.q'), a: t('pricing.faq.3.a') },
    { q: t('pricing.faq.4.q'), a: t('pricing.faq.4.a') },
  ]

  const TRUST = [
    { icon: 'credit_card_off', title: t('pricing.trust.trial'), desc: t('pricing.trust.trialDesc') },
    { icon: 'sync', title: t('pricing.trust.cancel'), desc: t('pricing.trust.cancelDesc') },
    { icon: 'security', title: t('pricing.trust.security'), desc: t('pricing.trust.securityDesc') },
  ]

  return (
    <>
      {/* Sticky header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-14 md:top-0 z-10 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">payments</span>
          <h2 className="text-xl font-bold tracking-tight">{t('pricing.title')}</h2>
        </div>
        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full p-1">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${!annual ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {t('pricing.monthly')}
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${annual ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {t('pricing.annual')}
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">-22%</span>
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-12">

        {/* Intro */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
            <span className="material-symbols-outlined text-sm">payments</span>
            {t('pricing.badge')}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{t('pricing.heading')}</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">{t('pricing.tagline')}</p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border-2 ${plan.color} overflow-hidden flex flex-col`}>
              <div className={`${plan.headerBg} px-6 pt-7 pb-5`}>
                {plan.badge && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3 ${plan.badgeStyle}`}>
                    {plan.badgeIcon && <span className="material-symbols-outlined text-xs">{plan.badgeIcon}</span>}
                    {plan.badge}
                  </div>
                )}
                <h3 className={`text-xl font-black mb-1 ${plan.priceColor}`}>{plan.name}</h3>
                <div className="mb-3">
                  {plan.monthly === null ? (
                    <p className={`text-3xl font-black ${plan.priceColor}`}>{t('pricing.custom')}</p>
                  ) : plan.monthly === 0 ? (
                    <p className={`text-3xl font-black ${plan.priceColor}`}>{t('pricing.free')}</p>
                  ) : (
                    <>
                      <p className={`text-3xl font-black ${plan.priceColor}`}>
                        ${annual ? plan.annual : plan.monthly}
                        <span className="text-base font-medium opacity-70"> / mo</span>
                      </p>
                      {annual && (
                        <p className={`text-xs mt-0.5 opacity-60 ${plan.priceColor}`}>
                          {t('pricing.billedAnnually').replace('${0}', String(plan.annual! * 12))}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <p className={`text-sm leading-relaxed ${plan.descColor}`}>{plan.desc}</p>
              </div>

              <div className="px-6 py-5 flex-1 bg-white dark:bg-slate-900">
                <ul className="space-y-3 mb-5">
                  {(plan.features as { icon: string; text: string; muted?: boolean; highlight?: boolean }[]).map(({ icon, text, muted, highlight }) => (
                    <li key={text} className={`flex items-center gap-2.5 text-sm ${muted ? 'opacity-40' : ''} ${highlight ? 'font-semibold' : ''}`}>
                      <span className={`material-symbols-outlined text-base shrink-0 ${icon === 'check' ? (highlight ? 'text-primary' : 'text-emerald-500') : 'text-slate-400'}`}>
                        {icon}
                      </span>
                      <span className={muted ? 'line-through text-slate-400' : highlight ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}>
                        {text}
                      </span>
                    </li>
                  ))}
                </ul>
                <button onClick={plan.onCta} className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.ctaStyle}`}>
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Trust strip */}
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl py-8 px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {TRUST.map(({ icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <section>
          <div className="mb-6">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{t('pricing.faqLabel')}</p>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{t('pricing.faqTitle')}</h2>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {FAQS.map((faq, i) => (
              <div key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 px-6 text-left group"
                >
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">{faq.q}</span>
                  <span className={`material-symbols-outlined text-slate-400 text-base shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-primary' : ''}`}>
                    expand_more
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-48' : 'max-h-0'}`}>
                  <p className="px-6 pb-5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="pb-4 text-center text-xs text-slate-400">
          {t('pricing.contactNote')}{' '}
          <a href="mailto:hello@medagen.ai" className="text-primary hover:underline">hello@medagen.ai</a>
        </div>
      </div>
    </>
  )
}
