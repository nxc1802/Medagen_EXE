import type { Place } from '../../types/map.types'
import { formatDistance } from '../../services/maps.service'
import { useT } from '../../contexts/SettingsContext'

interface Props {
  place: Place
  isSelected: boolean
  onClick: () => void
}

const TYPE_ICON = { pharmacy: 'medication', hospital: 'local_hospital' } as const

export function PlaceCard({ place, isSelected, onClick }: Props) {
  const t = useT()
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`
  const typeLabel = place.type === 'pharmacy' ? t('map.pharmacy') : t('map.hospital')

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 cursor-pointer group transition-all hover:shadow-md ${
        isSelected
          ? 'ring-2 ring-primary shadow-md border-primary'
          : 'border-slate-200 dark:border-slate-800 hover:border-primary/30'
      }`}
    >
      {/* Recommended badge + name */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {place.isRecommended && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase mb-2">
              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              {t('map.recommended')}
            </span>
          )}
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors leading-tight">
            {place.name}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-xs">location_on</span>
            {formatDistance(place.distance)} {t('map.away')}
            {place.vicinity && <span className="truncate"> · {place.vicinity}</span>}
          </p>
        </div>
        {place.rating !== undefined && (
          <div className="text-right shrink-0">
            <div className="flex items-center gap-0.5 text-amber-500 font-bold text-sm">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              {place.rating.toFixed(1)}
            </div>
            {place.userRatingsTotal && (
              <p className="text-[10px] text-slate-400 font-medium">
                {place.userRatingsTotal >= 1000
                  ? `${(place.userRatingsTotal / 1000).toFixed(1)}k`
                  : place.userRatingsTotal} {t('map.reviews')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Info chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
          <span className="material-symbols-outlined text-xs">{TYPE_ICON[place.type]}</span>
          {typeLabel}
        </span>
        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
          place.isOpen === undefined
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            : place.isOpen
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400'
        }`}>
          <span className="material-symbols-outlined text-xs">
            {place.isOpen === undefined ? 'schedule' : place.isOpen ? 'check_circle' : 'cancel'}
          </span>
          {place.isOpen === undefined ? t('map.hoursUnknown') : place.isOpen ? t('map.open') : t('map.closed')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onClick() }}
          className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
        >
          {t('map.viewOnMap')}
        </button>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
        >
          <span className="material-symbols-outlined text-xs">near_me</span>
          {t('map.directions')}
        </a>
      </div>
    </div>
  )
}
