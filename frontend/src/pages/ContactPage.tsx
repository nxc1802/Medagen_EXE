import { useState } from 'react'
import { useT } from '../contexts/SettingsContext'

const ADDRESS = 'FPT University, Khu đô thị FPT, Phường Ngũ Hành Sơn, TP. Đà Nẵng'

export default function ContactPage() {
  const t = useT()
  const [subject, setSubject]   = useState('general')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [message, setMessage]   = useState('')
  const [sent, setSent]         = useState(false)
  const [tooltip, setTooltip]   = useState(false)

  const SUBJECTS = [
    { value: 'general',     label: t('contact.subject.general'),     icon: 'chat_bubble' },
    { value: 'support',     label: t('contact.subject.support'),     icon: 'build' },
    { value: 'medical',     label: t('contact.subject.medical'),     icon: 'medical_information' },
    { value: 'partnership', label: t('contact.subject.partnership'), icon: 'handshake' },
    { value: 'privacy',     label: t('contact.subject.privacy'),     icon: 'gavel' },
    { value: 'press',       label: t('contact.subject.press'),       icon: 'newspaper' },
  ]

  const CONTACT_INFO = [
    { icon: 'mail',          label: t('contact.info.general'), value: 'hello@medagen.ai',   href: 'mailto:hello@medagen.ai', isAddress: false },
    { icon: 'security',      label: t('contact.info.privacy'), value: 'privacy@medagen.ai', href: 'mailto:privacy@medagen.ai', isAddress: false },
    { icon: 'support_agent', label: t('contact.info.support'), value: 'support@medagen.ai', href: 'mailto:support@medagen.ai', isAddress: false },
    { icon: 'location_on',   label: t('contact.info.address'), value: ADDRESS,              href: 'https://maps.google.com/?q=FPT+University+Da+Nang', isAddress: true },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) return
    setSent(true)
  }

  return (
    <>
      {/* Sticky header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-14 md:top-0 z-10 flex items-center px-4 md:px-8 gap-3">
        <span className="material-symbols-outlined text-primary">mail</span>
        <h2 className="text-xl font-bold tracking-tight">{t('contact.title')}</h2>
        <span className="ml-auto text-xs text-slate-400 hidden sm:block">{t('contact.subtitle')}</span>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Contact info sidebar */}
        <aside className="space-y-4">
          <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('contact.details')}</h2>

          {CONTACT_INFO.map(({ icon, label, value, href, isAddress }) => (
            <div key={label} className="relative">
              <a
                href={isAddress ? href : href}
                target={isAddress ? '_blank' : undefined}
                rel={isAddress ? 'noopener noreferrer' : undefined}
                className="flex gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary/40 transition-colors group"
                onMouseEnter={() => isAddress && setTooltip(true)}
                onMouseLeave={() => isAddress && setTooltip(false)}
              >
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-base">{icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors truncate">{value}</p>
                </div>
                {isAddress && (
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-base self-center shrink-0">open_in_new</span>
                )}
              </a>

              {/* Tooltip for address */}
              {isAddress && tooltip && (
                <div className="absolute left-0 right-0 bottom-full mb-2 z-20 pointer-events-none">
                  <div className="bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-xl px-4 py-3 shadow-xl leading-relaxed">
                    <p className="font-semibold mb-0.5">📍 {label}</p>
                    <p className="text-slate-300">{ADDRESS}</p>
                    <p className="text-primary/80 mt-1 text-[11px]">Click để mở Google Maps</p>
                  </div>
                  {/* Arrow */}
                  <div className="w-3 h-3 bg-slate-900 dark:bg-slate-700 rotate-45 mx-auto -mt-1.5" />
                </div>
              )}
            </div>
          ))}

          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4 flex gap-3">
            <span className="material-symbols-outlined text-emerald-500 text-base shrink-0 mt-0.5">schedule</span>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{t('contact.responseTime')}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">{t('contact.responseDesc')}</p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 flex gap-3">
            <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">warning</span>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{t('contact.disclaimer')}</p>
          </div>
        </aside>

        {/* Form */}
        <div className="lg:col-span-2">
          {sent ? (
            <div className="flex flex-col items-center justify-center gap-5 py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center px-8">
              <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-3xl">check_circle</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('contact.successTitle')}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">
                  {name.split(' ')[0]} — {t('contact.successDesc')}
                </p>
              </div>
              <button
                onClick={() => { setSent(false); setName(''); setEmail(''); setMessage('') }}
                className="text-sm text-primary font-semibold hover:underline"
              >
                {t('contact.sendAnother')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 space-y-5">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('contact.subjectLabel')}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SUBJECTS.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSubject(s.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left ${
                          subject === s.value
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm shrink-0">{s.icon}</span>
                        <span className="leading-tight">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('contact.nameLabel')}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={t('contact.namePh')}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('contact.emailLabel')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('contact.emailPh')}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('contact.msgLabel')}</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                    placeholder={t('contact.msgPh')}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-400 mt-1 text-right">{message.length} / 1000</p>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">lock</span>
                  {t('contact.privacy')}
                </p>
                <button
                  type="submit"
                  disabled={!name.trim() || !email.trim() || !message.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  {t('contact.sendBtn')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
