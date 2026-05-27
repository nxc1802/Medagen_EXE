import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessions } from '../api/client'
import type { Session } from '../types'
import { useSettings, useT } from '../contexts/SettingsContext'

const TRIAGE_CONFIG: Record<string, {
  labelKey: 'triage.emergency' | 'triage.urgent' | 'triage.routine' | 'triage.selfCare'
  icon: string; badgeCls: string; borderCls: string; dotCls: string; heroCls: string
}> = {
  emergency: {
    labelKey: 'triage.emergency', icon: 'emergency',
    badgeCls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    borderCls: 'border-l-red-500', dotCls: 'bg-red-400',
    heroCls: 'bg-red-400/20 text-white border border-red-300/30',
  },
  urgent: {
    labelKey: 'triage.urgent', icon: 'warning',
    badgeCls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    borderCls: 'border-l-orange-400', dotCls: 'bg-orange-400',
    heroCls: 'bg-orange-400/20 text-white border border-orange-300/30',
  },
  routine: {
    labelKey: 'triage.routine', icon: 'check_circle',
    badgeCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    borderCls: 'border-l-emerald-500', dotCls: 'bg-emerald-400',
    heroCls: 'bg-emerald-400/20 text-white border border-emerald-300/30',
  },
  'self-care': {
    labelKey: 'triage.selfCare', icon: 'self_care',
    badgeCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    borderCls: 'border-l-blue-400', dotCls: 'bg-blue-400',
    heroCls: 'bg-blue-400/20 text-white border border-blue-300/30',
  },
}

type FilterKey = 'all' | 'emergency' | 'urgent' | 'routine' | 'self-care'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const t = useT()
  const { language } = useSettings()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function relativeDate(iso: string) {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
    if (days === 0) return t('history.today')
    if (days === 1) return t('history.yesterday')
    if (days < 7) return t('history.daysAgo').replace('{n}', String(days))
    const weeks = Math.floor(days / 7)
    if (weeks === 1) return t('history.weekAgo').replace('{n}', '1')
    if (days < 30) return t('history.weeksAgo').replace('{n}', String(weeks))
    return new Date(iso).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' })
  }

  function groupByDate(sessions: Session[]): { label: string; items: Session[] }[] {
    const map = new Map<string, Session[]>()
    for (const s of sessions) {
      const key = relativeDate(s.created_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: sessions.length }
    for (const s of sessions) c[s.triage_level] = (c[s.triage_level] ?? 0) + 1
    return c
  }, [sessions])

  const filtered = useMemo(() =>
    filter === 'all' ? sessions : sessions.filter(s => s.triage_level === filter),
    [sessions, filter]
  )

  const groups = useMemo(() => groupByDate(filtered), [filtered, language])

  const handleView = (session: Session) =>
    navigate('/results', { state: { result: session.triage_result, imageUrl: session.image_url } })

  const recordText = (n: number) => `${n} ${n === 1 ? t('history.record') : t('history.records')}`

  return (
    <>
      {/* ── Sticky header ── */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">history</span>
          <h2 className="text-xl font-bold tracking-tight">{t('history.title')}</h2>
          {!loading && sessions.length > 0 && (
            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {sessions.length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          {t('history.newDiagnosis')}
        </button>
      </header>

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary px-8 py-10">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white translate-x-24 -translate-y-24" />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white -translate-x-12 translate-y-12" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">{t('history.badge')}</p>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
            {loading ? t('history.heroTitle') : sessions.length > 0
              ? `${sessions.length} ${t('history.title')}`
              : t('history.emptyTitle')
            }
          </h1>
          {!loading && sessions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(Object.entries(TRIAGE_CONFIG) as [string, typeof TRIAGE_CONFIG[string]][])
                .filter(([key]) => counts[key])
                .map(([key, cfg]) => (
                  <span key={key} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${cfg.heroCls}`}>
                    <span className="material-symbols-outlined text-[12px]">{cfg.icon}</span>
                    {counts[key]} {t(cfg.labelKey)}
                  </span>
                ))
              }
            </div>
          ) : (
            <p className="text-white/75 text-sm max-w-md">{t('history.heroParagraph')}</p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-10">

        {/* ── Filter tabs ── */}
        {!loading && sessions.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {(['all', 'emergency', 'urgent', 'routine', 'self-care'] as FilterKey[]).map(key => {
              const cfg = key === 'all' ? null : TRIAGE_CONFIG[key]
              const count = counts[key] ?? 0
              if (key !== 'all' && !count) return null
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    filter === key
                      ? 'bg-primary text-white shadow-sm shadow-primary/25'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  {cfg && <span className={`size-1.5 rounded-full inline-block ${filter === key ? 'bg-white' : cfg.dotCls}`} />}
                  {key === 'all' ? t('triage.all') : t(cfg!.labelKey)}
                  <span className={`text-xs font-bold ml-0.5 ${filter === key ? 'text-white/70' : 'text-slate-400'}`}>{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{t('history.loadingMsg')}</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-4 p-5 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30">
            <div className="size-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-base">error</span>
            </div>
            <div>
              <p className="font-bold text-sm text-red-700 dark:text-red-400">{t('history.errTitle')}</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && sessions.length === 0 && (
          <div className="flex flex-col items-center text-center py-24 gap-5">
            <div className="size-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl">history</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">{t('history.emptyTitle')}</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">{t('history.emptyDesc')}</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              {t('history.emptyAction')}
            </button>
          </div>
        )}

        {/* ── No filter results ── */}
        {!loading && sessions.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center text-center py-16 gap-3">
            <div className="size-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-2xl">filter_list_off</span>
            </div>
            <p className="text-sm text-slate-400">
              {t('history.noFilter').replace('{label}', t(TRIAGE_CONFIG[filter]?.labelKey ?? 'triage.routine'))}
            </p>
            <button onClick={() => setFilter('all')} className="text-sm text-primary font-semibold hover:underline">
              {t('history.clearFilter')}
            </button>
          </div>
        )}

        {/* ── Session groups ── */}
        {!loading && groups.length > 0 && (
          <div className="space-y-10">
            {groups.map(({ label, items }) => (
              <div key={label}>
                <div className="flex items-center gap-3 mb-5">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest shrink-0">{label}</p>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  <p className="text-xs text-slate-300 dark:text-slate-600 shrink-0">{recordText(items.length)}</p>
                </div>

                <div className="space-y-3">
                  {items.map((session) => {
                    const cfg = TRIAGE_CONFIG[session.triage_level] ?? TRIAGE_CONFIG.routine
                    const topCondition = session.triage_result?.suspected_conditions?.[0]
                    const redFlagCount = session.triage_result?.red_flags?.length ?? 0
                    const confidence = session.triage_result?.cv_findings?.raw_output?.top_predictions?.[0]?.probability
                    const confidencePct = confidence ? Math.round(confidence * 100) : null

                    return (
                      <button
                        key={session.id}
                        onClick={() => handleView(session)}
                        className={`w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 ${cfg.borderCls} rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group`}
                      >
                        <div className="flex">
                          {session.image_url ? (
                            <div className="w-24 shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
                              <img src={session.image_url} alt="Diagnosis"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                          ) : (
                            <div className="w-16 shrink-0 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-xl">image_not_supported</span>
                            </div>
                          )}

                          <div className="flex-1 p-4 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badgeCls}`}>
                                  <span className="material-symbols-outlined text-[11px]">{cfg.icon}</span>
                                  {t(cfg.labelKey)}
                                </span>
                                {redFlagCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/30">
                                    <span className="material-symbols-outlined text-[11px]">flag</span>
                                    {redFlagCount} red flag{redFlagCount > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-base shrink-0">chevron_right</span>
                            </div>

                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-2 mb-2">
                              {session.input_text || t('history.noDiagnosisProvided')}
                            </p>

                            <div className="flex items-center gap-4 flex-wrap">
                              {topCondition && (
                                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="material-symbols-outlined text-[12px] text-primary">diagnosis</span>
                                  <span className="font-semibold text-slate-600 dark:text-slate-300">{topCondition.name}</span>
                                  {confidencePct !== null && <span className="text-slate-400">· {confidencePct}%</span>}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-slate-400 ml-auto shrink-0">
                                <span className="material-symbols-outlined text-[12px]">schedule</span>
                                {formatDateTime(session.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <p className="text-center text-xs text-slate-400 pb-4">{t('settings.footer')}</p>
        )}
      </div>
    </>
  )
}
