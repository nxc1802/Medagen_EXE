import { useT } from '../../contexts/SettingsContext'

interface Props {
  message: string
  onRetry: () => void
}

export function LocationError({ message, onRetry }: Props) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center px-4">
      <div className="size-20 bg-red-50 dark:bg-red-950/20 rounded-2xl flex items-center justify-center border border-red-100 dark:border-red-900/30">
        <span className="material-symbols-outlined text-red-400 text-4xl">location_off</span>
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t('map.locationRequired')}</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm leading-relaxed">{message || t('map.locationHint')}</p>
      </div>
      <button
        onClick={onRetry}
        className="mt-1 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm shadow-primary/20"
      >
        <span className="material-symbols-outlined text-sm">refresh</span>
        {t('map.tryAgain')}
      </button>
    </div>
  )
}
