import { useState, useEffect } from 'react'
import type { Place, RiskLevel } from '../types/map.types'
import { fetchNearbyPlaces } from '../services/places.service'

interface PlacesState {
  places: Place[]
  loading: boolean
  error: string | null
}

export function usePlaces(
  lat: number | null,
  lng: number | null,
  riskLevel: RiskLevel,
): PlacesState {
  const [state, setState] = useState<PlacesState>({ places: [], loading: false, error: null })

  useEffect(() => {
    if (lat === null || lng === null) return
    setState({ places: [], loading: true, error: null })
    fetchNearbyPlaces(null, lat, lng, riskLevel)
      .then(places => setState({ places, loading: false, error: null }))
      .catch((err: Error) => setState({ places: [], loading: false, error: err.message }))
  }, [lat, lng, riskLevel])

  return state
}
