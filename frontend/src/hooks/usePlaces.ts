import { useState, useEffect, useCallback } from 'react'
import type { Place, RiskLevel } from '../types/map.types'
import { fetchNearbyPlaces } from '../services/places.service'

interface PlacesState {
  places: Place[]
  loading: boolean
  error: string | null
  retry: () => void
}

export function usePlaces(
  lat: number | null,
  lng: number | null,
  riskLevel: RiskLevel,
): PlacesState {
  const [state, setState] = useState<Omit<PlacesState, 'retry'>>({ places: [], loading: false, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (lat === null || lng === null) return
    setState({ places: [], loading: true, error: null })
    fetchNearbyPlaces(null, lat, lng, riskLevel)
      .then(places => setState({ places, loading: false, error: null }))
      .catch(() => setState({ places: [], loading: false, error: 'failed' }))
  }, [lat, lng, riskLevel, tick])

  const retry = useCallback(() => setTick(t => t + 1), [])

  return { ...state, retry }
}
