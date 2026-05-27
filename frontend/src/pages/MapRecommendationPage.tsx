import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { RiskLevel } from '../types/map.types'
import type { TriageLevel } from '../types'
import { useGeolocation } from '../hooks/useGeolocation'
import { usePlaces } from '../hooks/usePlaces'
import { RISK_CONFIG } from '../services/places.service'
import { MapView } from '../components/map/MapView'
import { PlaceList } from '../components/map/PlaceList'
import { RiskBanner } from '../components/map/RiskBanner'
import { LocationError } from '../components/map/LocationError'
import { useT, useSettings } from '../contexts/SettingsContext'

function triageToRisk(triage: TriageLevel | undefined): RiskLevel {
  if (triage === 'emergency') return 'HIGH'
  if (triage === 'urgent') return 'MEDIUM'
  return 'LOW'
}

interface Suggestion {
  lat: number
  lng: number
  display: string
}

async function searchAddress(query: string): Promise<Suggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=vn`
  const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } })
  const data = await res.json()
  return data.map((d: any) => ({
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    display: d.display_name,
  }))
}

type FilterKey = 'pharmacy' | 'hospital'

interface NavState {
  riskLevel?: RiskLevel
  triageLevel?: TriageLevel
}

const RISK_COLOR: Record<RiskLevel, string> = {
  LOW:    'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/30',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/30',
  HIGH:   'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/30',
}

export default function MapRecommendationPage() {
  const t = useT()
  useSettings()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: NavState | null }

  const riskLevel: RiskLevel = state?.riskLevel ?? triageToRisk(state?.triageLevel) ?? 'MEDIUM'

  const { lat: geoLat, lng: geoLng, error: geoError, loading: geoLoading } = useGeolocation()

  const [manualLoc, setManualLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [addrInput, setAddrInput] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [sugLoading, setSugLoading] = useState(false)
  const [showSug, setShowSug] = useState(false)
  const addrWrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lat = manualLoc?.lat ?? geoLat
  const lng = manualLoc?.lng ?? geoLng

  const handleAddrInput = useCallback((value: string) => {
    setAddrInput(value)
    setShowSug(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 3) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      setSugLoading(true)
      try { setSuggestions(await searchAddress(value.trim())) }
      catch { setSuggestions([]) }
      finally { setSugLoading(false) }
    }, 400)
  }, [])

  const pickSuggestion = (s: Suggestion) => {
    setManualLoc({ lat: s.lat, lng: s.lng })
    setAddrInput(s.display.split(',').slice(0, 3).join(', '))
    setSuggestions([])
    setShowSug(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addrWrapRef.current && !addrWrapRef.current.contains(e.target as Node)) setShowSug(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { places, loading: placesLoading, error: placesError } = usePlaces(lat, lng, riskLevel)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)

  const center = lat !== null && lng !== null ? { lat, lng } : { lat: 10.762622, lng: 106.660172 }
  const isUrgent = riskLevel === 'HIGH'
  const loading = geoLoading || placesLoading

  const filteredPlaces = places
    .filter(p => {
      const q = searchQuery.toLowerCase()
      return !q || p.name.toLowerCase().includes(q) || p.vicinity.toLowerCase().includes(q)
    })
    .filter(p => !activeFilter || p.type === activeFilter)

  const legendItems = [
    { color: 'bg-amber-400', label: t('map.yourLocation') },
    { color: 'bg-primary', label: t('map.recommended') },
    ...(RISK_CONFIG[riskLevel].placeTypes.includes('pharmacy') ? [{ color: 'bg-green-500', label: t('map.pharmacy') }] : []),
    ...(RISK_CONFIG[riskLevel].placeTypes.includes('hospital') ? [{ color: 'bg-red-500', label: t('map.hospital') }] : []),
  ]

  const FILTERS: { key: FilterKey; icon: string; labelKey: 'map.pharmacy' | 'map.hospital' }[] = [
    { key: 'pharmacy', icon: 'medication',     labelKey: 'map.pharmacy' },
    { key: 'hospital', icon: 'local_hospital', labelKey: 'map.hospital' },
  ]

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col font-display text-slate-900 dark:text-slate-100">

      {/* ── Emergency bar ── */}
      {isUrgent && (
        <div className="bg-red-600 text-white text-center text-xs font-bold py-2.5 px-4 flex items-center justify-center gap-2 tracking-wide">
          <span className="material-symbols-outlined text-sm animate-pulse">emergency</span>
          {t('map.urgentBanner')}
          <span className="material-symbols-outlined text-sm animate-pulse">emergency</span>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="size-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">location_on</span>
            <h2 className="text-lg font-bold tracking-tight">{t('map.title')}</h2>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${RISK_COLOR[riskLevel]}`}>
          {riskLevel === 'HIGH' ? t('map.riskHigh') : riskLevel === 'MEDIUM' ? t('map.riskMedium') : t('map.riskLow')}
        </span>
      </header>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary px-6 md:px-10 py-8">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white translate-x-16 -translate-y-16" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white -translate-x-10 translate-y-10" />
        </div>
        <div className="relative max-w-5xl mx-auto">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">{t('map.heroLabel')}</p>
          <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">
            {t('map.heroTitle')}
          </h1>
          <p className="text-white/75 text-sm max-w-lg leading-relaxed">
            {t('map.heroParagraph')}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 text-white border border-white/20">
              <span className="material-symbols-outlined text-xs">my_location</span>
              {t('map.badge')}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 text-white border border-white/20">
              <span className="material-symbols-outlined text-xs">local_hospital</span>
              {places.length > 0 ? `${places.length} ${t('map.nearYou')}` : t('map.loadingLocation')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-4">

        {/* Controls card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">

          {/* Search + type filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('map.searchPh')}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(activeFilter === f.key ? null : f.key)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0 transition-all border ${
                    activeFilter === f.key
                      ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{f.icon}</span>
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Address autocomplete */}
          <div className="flex gap-2 items-start">
            <div ref={addrWrapRef} className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">home_pin</span>
              <input
                type="text"
                value={addrInput}
                onChange={e => handleAddrInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSug(true)}
                placeholder={t('map.addrPh')}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {showSug && addrInput.trim().length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[2000] overflow-hidden">
                  {sugLoading ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
                      <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                      {t('map.searching')}
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-400">{t('map.noAddress')}</div>
                  ) : (
                    suggestions.map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={() => pickSuggestion(s)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-primary/5 flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors"
                      >
                        <span className="material-symbols-outlined text-primary text-base mt-0.5 shrink-0">location_on</span>
                        <span className="line-clamp-2 text-slate-700 dark:text-slate-300">{s.display}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {manualLoc && (
              <button
                onClick={() => { setManualLoc(null); setAddrInput(''); setSuggestions([]) }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-sm">my_location</span>
                {t('map.gpsReset')}
              </button>
            )}
          </div>
          {manualLoc && (
            <p className="text-xs text-primary flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-xs">check_circle</span>
              {t('map.usingCustom')}
            </p>
          )}

          {/* Risk banner */}
          <RiskBanner riskLevel={riskLevel} />
        </div>

        {/* Map + list */}
        {geoError ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <LocationError message={geoError} onRetry={() => window.location.reload()} />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4" style={{ height: 'calc(100vh - 420px)', minHeight: 560 }}>

            {/* Place list */}
            <div className="w-full lg:w-80 xl:w-96 shrink-0 overflow-y-auto pr-0.5 space-y-0" style={{ scrollbarWidth: 'thin' }}>
              <PlaceList
                places={filteredPlaces}
                loading={loading}
                error={placesError}
                riskLevel={riskLevel}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>

            {/* Map */}
            <div className="flex-1 h-[400px] lg:h-full relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              {geoLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 gap-3 text-slate-400">
                  <span className="material-symbols-outlined text-5xl animate-spin">progress_activity</span>
                  <span className="text-sm font-medium">{t('map.loadingLocation')}</span>
                </div>
              ) : (
                <MapView
                  center={center}
                  places={filteredPlaces}
                  selectedId={selectedId}
                  onMarkerClick={setSelectedId}
                />
              )}

              {/* Reset view button */}
              {!geoLoading && (
                <div className="absolute right-3 bottom-3 z-[1000]">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="size-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-primary rounded-xl shadow-lg flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all"
                    title={t('map.resetView')}
                  >
                    <span className="material-symbols-outlined text-base">my_location</span>
                  </button>
                </div>
              )}

              {/* Legend */}
              {!geoLoading && places.length > 0 && (
                <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-slate-200 dark:border-slate-700 z-[1000]">
                  <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-2">{t('map.legend')}</p>
                  <div className="space-y-1.5">
                    {legendItems.map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <div className={`size-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 shrink-0 ${color}`} />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
