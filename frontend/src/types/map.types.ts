export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Place {
  placeId: string
  name: string
  vicinity: string
  location: { lat: number; lng: number }
  rating?: number
  userRatingsTotal?: number
  type: 'pharmacy' | 'hospital'
  isOpen?: boolean
  distance: number // metres
  isRecommended: boolean
}

export interface RiskConfig {
  placeTypes: Array<'pharmacy' | 'hospital'>
  radius: number
  topPicks: { pharmacy: number; hospital: number }
  specialtyHint: string
  recommendation: string
}
