import type { Place, RiskLevel } from '../../types/map.types'
import { PlaceCard } from './PlaceCard'
import { useT } from '../../contexts/SettingsContext'

interface Props {
  places: Place[]
  loading: boolean
  error: string | null
  riskLevel: RiskLevel
  selectedId: string | null
  onSelect: (placeId: string) => void
}

function Skeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-20" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-12" />
      </div>
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-1" />
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2 mb-4" />
      <div className="flex gap-2 mb-4">
        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full w-20" />
        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full w-16" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl flex-1" />
        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl flex-1" />
      </div>
    </div>
  )
}

export function PlaceList({ places, loading, error, riskLevel, selectedId, onSelect }: Props) {
  const t = useT()

  const LABEL_KEY: Record<RiskLevel, 'map.pharmacies' | 'map.medCenters' | 'map.hospitals'> = {
    LOW: 'map.pharmacies', MEDIUM: 'map.medCenters', HIGH: 'map.hospitals',
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-8 text-center">
        <span className="material-symbols-outlined text-red-300 text-4xl mb-3 block">cloud_off</span>
        <p className="text-red-600 dark:text-red-400 font-semibold text-sm mb-1">{error}</p>
        <p className="text-red-400 text-xs">{t('map.checkInternet')}</p>
      </div>
    )
  }

  if (places.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
        <span className="material-symbols-outlined text-slate-300 text-5xl mb-3 block">search_off</span>
        <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm">
          {t('map.noNearby').replace('{label}', t(LABEL_KEY[riskLevel]))}
        </p>
        <p className="text-slate-400 text-xs mt-1">{t('map.noNearbyHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium sticky top-0 bg-slate-50 dark:bg-slate-950 py-2 z-10 px-1">
        {t('map.showing')} <span className="font-bold text-slate-800 dark:text-slate-200">{places.length}</span>{' '}
        {t(LABEL_KEY[riskLevel])} {t('map.nearYou')}
      </p>
      {places.map((place) => (
        <PlaceCard
          key={place.placeId}
          place={place}
          isSelected={selectedId === place.placeId}
          onClick={() => onSelect(place.placeId)}
        />
      ))}
    </div>
  )
}
