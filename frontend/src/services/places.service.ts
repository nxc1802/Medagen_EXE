import type { Place, RiskConfig, RiskLevel } from '../types/map.types'
import { calcDistance } from './maps.service'

export const RISK_CONFIG: Record<RiskLevel, RiskConfig> = {
  LOW: {
    placeTypes: ['pharmacy'],
    radius: 2000,
    topPicks: { pharmacy: 1, hospital: 0 },
    specialtyHint: 'Nhà thuốc',
    recommendation:
      'Tình trạng của bạn nhẹ. Nhà thuốc gần nhất có thể cung cấp thuốc hoặc sản phẩm chăm sóc da bạn cần.',
  },
  MEDIUM: {
    placeTypes: ['pharmacy', 'hospital'],
    radius: 5000,
    topPicks: { pharmacy: 1, hospital: 1 },
    specialtyHint: 'Phòng khám hoặc Bác sĩ Da liễu',
    recommendation:
      'Dựa trên chẩn đoán, chúng tôi khuyên bạn nên đến phòng khám và mua thuốc tại nhà thuốc gần nhất.',
  },
  HIGH: {
    placeTypes: ['hospital'],
    radius: 10000,
    topPicks: { pharmacy: 0, hospital: 3 },
    specialtyHint: 'Cấp cứu hoặc Chuyên khoa',
    recommendation:
      'Tình trạng của bạn cần được chăm sóc y tế khẩn cấp. Hãy đến bệnh viện gần nhất ngay lập tức.',
  },
}

// OSM amenity tags mapped to our type system
const TYPE_MAP: Record<string, 'pharmacy' | 'hospital'> = {
  pharmacy: 'pharmacy',
  hospital: 'hospital',
  clinic: 'hospital',
  doctors: 'hospital',
}

async function queryOverpass(lat: number, lng: number, amenities: string[], radius: number): Promise<any[]> {
  const parts = amenities
    .map(a => `node["amenity"="${a}"](around:${radius},${lat},${lng});way["amenity"="${a}"](around:${radius},${lat},${lng});`)
    .join('')
  const query = `[out:json][timeout:25];(${parts});out center;`
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('Không thể lấy dữ liệu địa điểm. Vui lòng thử lại.')
  const data = await res.json()
  return data.elements ?? []
}

export async function fetchNearbyPlaces(
  _unused: HTMLDivElement | null,
  userLat: number,
  userLng: number,
  riskLevel: RiskLevel,
): Promise<Place[]> {
  const config = RISK_CONFIG[riskLevel]

  const amenities: string[] = []
  if (config.placeTypes.includes('hospital')) amenities.push('hospital', 'clinic', 'doctors')
  if (config.placeTypes.includes('pharmacy')) amenities.push('pharmacy')

  const elements = await queryOverpass(userLat, userLng, amenities, config.radius)

  const places: Place[] = elements
    .filter(el => el.tags?.name)
    .map((el): Place | null => {
      const lat = el.type === 'way' ? el.center?.lat : el.lat
      const lng = el.type === 'way' ? el.center?.lon : el.lon
      if (lat == null || lng == null) return null

      const amenity: string = el.tags?.amenity ?? 'hospital'
      const mapped = TYPE_MAP[amenity] ?? 'hospital'
      const type = config.placeTypes.includes(mapped) ? mapped : config.placeTypes[0]

      const parts = [
        el.tags?.['addr:housenumber'],
        el.tags?.['addr:street'],
        el.tags?.['addr:city'] ?? el.tags?.['addr:suburb'],
      ].filter(Boolean)
      const vicinity = parts.length ? parts.join(', ') : 'Xem trên bản đồ'

      return {
        placeId: String(el.id),
        name: el.tags.name,
        vicinity,
        location: { lat, lng },
        type,
        isOpen: el.tags?.opening_hours === '24/7' ? true : undefined,
        distance: calcDistance(userLat, userLng, lat, lng),
        isRecommended: false,
      }
    })
    .filter((p): p is Place => p !== null)

  places.sort((a, b) => a.distance - b.distance)

  const { topPicks } = config
  let pharmCount = 0
  let hospCount = 0

  return places.map(p => {
    if (p.type === 'pharmacy' && pharmCount < topPicks.pharmacy) { pharmCount++; return { ...p, isRecommended: true } }
    if (p.type === 'hospital' && hospCount < topPicks.hospital) { hospCount++; return { ...p, isRecommended: true } }
    return p
  })
}
