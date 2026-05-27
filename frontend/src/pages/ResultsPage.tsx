import { useLocation, useNavigate, Link } from 'react-router-dom'
import type { TriageResult } from '../types'
import type { RiskLevel } from '../types/map.types'
import { useT } from '../contexts/SettingsContext'

function triageToRisk(triage: string): RiskLevel {
  if (triage === 'emergency') return 'HIGH'
  if (triage === 'urgent') return 'MEDIUM'
  return 'LOW'
}

const TRIAGE_COLOR: Record<string, string> = {
  emergency: 'text-red-600 bg-red-100 border-red-200',
  urgent: 'text-orange-600 bg-orange-100 border-orange-200',
  routine: 'text-green-600 bg-green-100 border-green-200',
  'self-care': 'text-blue-600 bg-blue-100 border-blue-200',
}

export default function ResultsPage() {
  const t = useT()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { result: TriageResult; imageUrl?: string } | null

  const TRIAGE_LABEL: Record<string, string> = {
    emergency: t('triage.emergency'),
    urgent:    t('triage.urgent'),
    routine:   t('triage.routine'),
    'self-care': t('triage.selfCare'),
  }

  const RISK_BADGE: Record<RiskLevel, { label: string; cls: string }> = {
    LOW:    { label: t('results.riskLow'),    cls: 'bg-emerald-100 text-emerald-700' },
    MEDIUM: { label: t('results.riskMedium'), cls: 'bg-amber-100 text-amber-700' },
    HIGH:   { label: t('results.riskHigh'),   cls: 'bg-red-100 text-red-700' },
  }

  if (!state?.result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-500">{t('results.noResults')}</p>
        <Link to="/dashboard" className="text-primary font-bold hover:underline">{t('results.startNew')}</Link>
      </div>
    )
  }

  const { result, imageUrl } = state
  const triageColor = TRIAGE_COLOR[result.triage_level] || TRIAGE_COLOR.routine
  const triageLabel = TRIAGE_LABEL[result.triage_level] || result.triage_level
  const riskLevel = triageToRisk(result.triage_level)
  const riskBadge = RISK_BADGE[riskLevel]

  const topCondition = result.suspected_conditions?.[0]
  const confidence = result.cv_findings?.raw_output?.top_predictions?.[0]?.probability
  const confidencePct = confidence ? Math.round(confidence * 100) : null

  const riskDesc =
    riskLevel === 'HIGH'   ? t('results.riskHighDesc') :
    riskLevel === 'MEDIUM' ? t('results.riskMedDesc')  : t('results.riskLowDesc')

  return (
    <>
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
        <h2 className="text-xl font-bold tracking-tight">{t('results.title')}</h2>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          {t('results.newAnalysis')}
        </button>
      </header>

      <main className="flex flex-1 justify-center py-8 px-4 md:px-0">
        <div className="flex flex-col max-w-[800px] w-full gap-6">

          {/* Image + main result */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
            {imageUrl && (
              <div className="h-[260px] w-full bg-slate-100 dark:bg-slate-800">
                <img src={imageUrl} alt="Analyzed" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-slate-900 dark:text-slate-100 text-3xl font-black leading-tight tracking-tight">
                    {topCondition?.name || t('results.title')}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-base font-normal mt-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                    {t('results.complete')}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg border font-bold text-sm uppercase tracking-wider ${triageColor}`}>
                  {triageLabel}
                </div>
              </div>

              {confidencePct !== null && (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex gap-6 justify-between items-center">
                    <p className="text-slate-900 dark:text-slate-100 text-base font-semibold leading-normal">{t('results.confidence')}</p>
                    <p className="text-primary text-xl font-bold leading-normal">{confidencePct}%</p>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                    <div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${confidencePct}%` }} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs italic">
                    {t('results.confidenceNote')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI markdown response */}
          {result.message && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight mb-4">{t('results.assessment')}</h2>
              <div
                className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(result.message) }}
              />
            </div>
          )}

          {/* Next Steps + Red flags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recommendation */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="flex items-center gap-3 mb-4 text-primary">
                <span className="material-symbols-outlined">clinical_notes</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('results.recommendation')}</h3>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex gap-3 text-slate-600 dark:text-slate-300">
                  <span className="material-symbols-outlined text-primary text-sm mt-1">arrow_forward</span>
                  <span>{result.recommendation.action}</span>
                </li>
                {result.recommendation.home_care_advice && (
                  <li className="flex gap-3 text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined text-primary text-sm mt-1">arrow_forward</span>
                    <span>{result.recommendation.home_care_advice}</span>
                  </li>
                )}
                {result.recommendation.timeframe && (
                  <li className="flex gap-3 text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined text-primary text-sm mt-1">schedule</span>
                    <span>{t('results.timeframe')} <strong>{result.recommendation.timeframe}</strong></span>
                  </li>
                )}
              </ul>
              <Link
                to="/care-plan"
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">description</span>
                {t('results.viewCarePlan')}
              </Link>
            </div>

            {/* Red flags */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="flex items-center gap-3 mb-4 text-primary">
                <span className="material-symbols-outlined">warning</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('results.warnings')}</h3>
              </div>
              <div className="space-y-3 flex-1">
                {result.red_flags.length > 0 ? (
                  result.red_flags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                      <span className="material-symbols-outlined text-red-500 text-sm mt-0.5">error</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{flag}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('results.noFlags')}</p>
                )}
                {result.recommendation.warning_signs && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{result.recommendation.warning_signs}</p>
                )}
              </div>
              {result.nearest_clinic && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">
                    <span className="material-symbols-outlined text-sm align-middle mr-1 text-primary">local_hospital</span>
                    {t('results.nearestClinic')}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{result.nearest_clinic.name}</p>
                  <p className="text-xs text-slate-500">{result.nearest_clinic.distance_km}km · {result.nearest_clinic.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Nearby medical support CTA */}
          <div className={`rounded-xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${riskBadge.cls} border-current/20`}>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-2xl shrink-0">
                {riskLevel === 'HIGH' ? 'emergency' : riskLevel === 'MEDIUM' ? 'local_hospital' : 'medication'}
              </span>
              <div>
                <p className="font-bold text-sm">
                  {t('results.riskLevel')} <span className={`px-2 py-0.5 rounded-full text-xs font-black ${riskBadge.cls}`}>{riskBadge.label}</span>
                </p>
                <p className="text-xs mt-0.5 opacity-80">{riskDesc}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/map-recommendation', { state: { riskLevel, triageLevel: result.triage_level } })}
              className="shrink-0 flex items-center gap-2 bg-white/80 hover:bg-white border border-current/20 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-base">map</span>
              {t('results.mapBtn')}
            </button>
          </div>

          {/* Disclaimer */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-500">warning</span>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>{t('results.disclaimer')}</strong> {t('results.disclaimerText')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-black mt-6 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="space-y-1 my-2">$&</ul>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/^(?!<[h|u|l])(.+)$/gm, '<p>$1</p>')
}
