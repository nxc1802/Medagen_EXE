import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCarePlan, generateCarePlan } from '../api/client'
import { useT } from '../contexts/SettingsContext'
import type { CarePlan } from '../types'

export default function CarePlanPage() {
  const t = useT()
  const [plan, setPlan] = useState<CarePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExportPDF = () => {
    document.title = `MedaGen Care Plan - ${new Date().toLocaleDateString('en-US')}`
    window.print()
    document.title = 'MedaGen'
  }

  useEffect(() => { fetchExistingPlan() }, [])

  const fetchExistingPlan = async () => {
    setLoading(true); setError(null)
    try { setPlan(await getCarePlan()) }
    catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleGenerate = async () => {
    setGenerating(true); setError(null)
    try { setPlan(await generateCarePlan()) }
    catch (err: any) { setError(err.message) }
    finally { setGenerating(false) }
  }

  return (
    <>
      {/* Print header */}
      <div className="hidden print:flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 px-10 pt-8">
        <span className="text-2xl font-black text-primary">MedaGen</span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-600 text-sm">{t('carePlan.heroTitle')}</span>
        <span className="ml-auto text-slate-400 text-xs">Exported: {new Date().toLocaleDateString('en-US')}</span>
      </div>

      {/* ── Sticky header ── */}
      <header className="print:hidden h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">account_circle</span>
          <h2 className="text-xl font-bold tracking-tight">{t('carePlan.title')}</h2>
        </div>
        <div className="print:hidden flex gap-2">
          {plan && (
            <button onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:border-primary/40 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-sm">download</span>
              {t('carePlan.exportPDF')}
            </button>
          )}
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm shadow-primary/20">
            {generating
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> {t('carePlan.generating')}</>
              : <><span className="material-symbols-outlined text-sm">auto_awesome</span> {plan ? t('carePlan.regenerate') : t('carePlan.generate')}</>
            }
          </button>
        </div>
      </header>

      {/* ── Hero banner ── */}
      <div className="print:hidden relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary px-8 py-10">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white translate-x-24 -translate-y-24" />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white -translate-x-12 translate-y-12" />
        </div>
        <div className="relative max-w-5xl mx-auto">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">{t('carePlan.heroLabel')}</p>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">{t('carePlan.heroTitle')}</h1>
          {plan?.conditions && plan.conditions.length > 0 ? (
            <p className="text-white/75 text-sm">
              {t('carePlan.tailoredFor')}{' '}
              <span className="font-bold text-white">{plan.conditions.join(' · ')}</span>
            </p>
          ) : (
            <p className="text-white/75 text-sm max-w-xl">{t('carePlan.heroParagraph')}</p>
          )}
          {plan?.created_at && (
            <p className="text-white/50 text-xs mt-2">
              {t('carePlan.lastUpdated')} {new Date(plan.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-12">

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-4 p-5 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30">
            <div className="size-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-base">error</span>
            </div>
            <div>
              <p className="font-bold text-sm text-red-700 dark:text-red-400 mb-0.5">{t('carePlan.errTitle')}</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <Link to="/dashboard" className="text-sm font-bold text-red-700 dark:text-red-300 underline mt-2 inline-block">
                {t('carePlan.errLink')}
              </Link>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{t('carePlan.loadingMsg')}</p>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !plan && !error && (
          <div className="flex flex-col items-center text-center py-20 gap-5">
            <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-4xl">description</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('carePlan.emptyTitle')}</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">{t('carePlan.emptyDesc')}</p>
            </div>
            <button onClick={handleGenerate} disabled={generating}
              className="inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-lg shadow-primary/25">
              {generating
                ? <><span className="material-symbols-outlined animate-spin">progress_activity</span> {t('carePlan.analysing')}</>
                : <><span className="material-symbols-outlined">auto_awesome</span> {t('carePlan.emptyBtn')}</>
              }
            </button>
          </div>
        )}

        {/* ── Plan content ── */}
        {!loading && plan && (
          <>
            {/* Summary */}
            <div className="relative p-6 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10">
              <span className="absolute -top-3 left-6 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                {t('carePlan.aiSummary')}
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm pt-1">{plan.summary}</p>
            </div>

            {/* 1. Lifestyle */}
            {plan.lifestyle?.length > 0 && (
              <section>
                <SectionLabel>{t('carePlan.sec1label')}</SectionLabel>
                <SectionTitle icon="nightlight" iconBg="bg-primary" title={t('carePlan.sec1title')} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plan.lifestyle.map((item, i) => (
                    <div key={i} className="card-print bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-sm">{item.icon}</span>
                        </div>
                        <h3 className="font-bold text-base">{item.title}</h3>
                      </div>
                      <ul className="space-y-2.5">
                        {item.tips.map((tip, j) => (
                          <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                            <span className="material-symbols-outlined text-primary text-sm mt-0.5 shrink-0">check_circle</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Nutrition */}
            {(plan.nutrition?.include?.length > 0 || plan.nutrition?.avoid?.length > 0) && (
              <section>
                <SectionLabel>{t('carePlan.sec2label')}</SectionLabel>
                <SectionTitle icon="restaurant" iconBg="bg-emerald-500" title={t('carePlan.sec2title')} />
                <div className="card-print rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="size-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-sm">add_circle</span>
                        </div>
                        <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{t('carePlan.eatMore')}</h3>
                      </div>
                      <div className="space-y-2.5">
                        {plan.nutrition.include.map((item, i) => (
                          <div key={i} className="flex gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                            <span className="material-symbols-outlined text-emerald-500 text-base shrink-0">{item.icon}</span>
                            <div>
                              <p className="font-semibold text-sm">{item.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="size-7 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                          <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">do_not_disturb_on</span>
                        </div>
                        <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{t('carePlan.avoid')}</h3>
                      </div>
                      <div className="space-y-2">
                        {plan.nutrition.avoid.map((item, i) => (
                          <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-200 dark:border-slate-700 last:border-0">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ml-3 ${
                              item.badgeColor === 'red'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                            }`}>{item.badge}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 3. Exercise */}
            {(plan.exercise?.recommended?.length > 0 || plan.exercise?.avoid?.length > 0) && (
              <section>
                <SectionLabel>{t('carePlan.sec3label')}</SectionLabel>
                <SectionTitle icon="fitness_center" iconBg="bg-blue-500" title={t('carePlan.sec3title')} />
                <div className="card-print grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plan.exercise.recommended.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="size-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">thumb_up</span>
                        </div>
                        <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">{t('carePlan.recommended')}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plan.exercise.recommended.map((act, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 text-sm font-semibold text-blue-700 dark:text-blue-300">
                            <span className="material-symbols-outlined text-xs">check</span>{act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {plan.exercise.avoid.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="size-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-sm">warning</span>
                        </div>
                        <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{t('carePlan.useCaution')}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plan.exercise.avoid.map((act, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 text-sm font-semibold text-amber-700 dark:text-amber-300">
                            <span className="material-symbols-outlined text-xs">warning</span>{act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 4. OTC */}
            {plan.otc_suggestions?.length > 0 && (
              <section>
                <SectionLabel>{t('carePlan.sec4label')}</SectionLabel>
                <SectionTitle icon="medication" iconBg="bg-violet-500" title={t('carePlan.sec4title')} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plan.otc_suggestions.map((item, i) => (
                    <div key={i} className="card-print flex gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                      <div className="size-12 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/30 flex items-center justify-center text-violet-500 shrink-0">
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{item.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 px-1">
                  <span className="material-symbols-outlined text-amber-500 text-sm">info</span>
                  <p className="text-xs text-slate-400">{t('carePlan.otcNote')}</p>
                </div>
              </section>
            )}

            {/* CTA */}
            <div className="print:hidden relative overflow-hidden rounded-2xl bg-slate-900 dark:bg-slate-800 p-8 text-center">
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-primary" />
              </div>
              <div className="relative">
                <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-primary text-2xl">event_available</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{t('carePlan.ctaTitle')}</h3>
                <p className="text-slate-400 text-sm mb-1 max-w-md mx-auto">{t('carePlan.ctaDesc')}</p>
                {plan.next_checkup_date && (
                  <p className="text-primary font-semibold text-sm mb-6">
                    {t('carePlan.ctaBefore')} {new Date(plan.next_checkup_date).toLocaleDateString('en-US', { dateStyle: 'long' })}
                  </p>
                )}
                <Link to="/dashboard"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 transition-colors px-8 py-3 rounded-xl font-bold text-white shadow-lg shadow-primary/30">
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  {t('carePlan.ctaBtn')}
                </Link>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 pb-4">{t('settings.footer')}</p>
          </>
        )}
      </div>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{children}</p>
}

function SectionTitle({ icon, iconBg, title }: { icon: string; iconBg: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`size-10 rounded-xl ${iconBg} flex items-center justify-center text-white shadow-sm`}>
        <span className="material-symbols-outlined text-sm">{icon}</span>
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h2>
    </div>
  )
}
