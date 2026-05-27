import type { RiskLevel } from '../../types/map.types'
import { RISK_CONFIG } from '../../services/places.service'
import { useT } from '../../contexts/SettingsContext'

const RISK_STYLE: Record<RiskLevel, { wrapper: string; icon: string; iconCls: string; labelKey: 'map.riskLow' | 'map.riskMedium' | 'map.riskHigh' }> = {
  LOW:    { wrapper: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30', icon: 'check_circle', iconCls: 'bg-emerald-500 text-white', labelKey: 'map.riskLow' },
  MEDIUM: { wrapper: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30',         icon: 'warning',      iconCls: 'bg-amber-500 text-white',   labelKey: 'map.riskMedium' },
  HIGH:   { wrapper: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30',                 icon: 'emergency',    iconCls: 'bg-red-500 text-white',     labelKey: 'map.riskHigh' },
}

export function RiskBanner({ riskLevel }: { riskLevel: RiskLevel }) {
  const t = useT()
  const style = RISK_STYLE[riskLevel]
  const config = RISK_CONFIG[riskLevel]

  return (
    <div className={`border rounded-2xl p-4 flex items-start gap-4 ${style.wrapper}`}>
      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${style.iconCls}`}>
        <span className={`material-symbols-outlined text-base ${riskLevel === 'HIGH' ? 'animate-pulse' : ''}`}>
          {style.icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-0.5">
          {t(style.labelKey)} · {t('map.riskStep')}
        </p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
          {config.recommendation}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {config.specialtyHint}
        </p>
      </div>
    </div>
  )
}
