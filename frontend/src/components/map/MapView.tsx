import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Place } from '../../types/map.types'

// Fix default icon paths broken by Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function circleIcon(color: string, size: number) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function placeIcon(place: Place, selected: boolean) {
  const color = place.isRecommended ? '#1392ec' : place.type === 'pharmacy' ? '#22c55e' : '#ef4444'
  const size = selected ? 22 : place.isRecommended ? 18 : 14
  return circleIcon(color, size)
}

// Sub-component to react to external selectedId changes
function FlyToSelected({ places, selectedId }: { places: Place[]; selectedId: string | null }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId) return
    const p = places.find(x => x.placeId === selectedId)
    if (p) map.flyTo([p.location.lat, p.location.lng], 16, { duration: 0.8 })
  }, [selectedId, places, map])
  return null
}

interface Props {
  center: { lat: number; lng: number }
  places: Place[]
  selectedId: string | null
  onMarkerClick: (placeId: string) => void
}

export function MapView({ center, places, selectedId, onMarkerClick }: Props) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <FlyToSelected places={places} selectedId={selectedId} />

      {/* User location */}
      <Marker position={[center.lat, center.lng]} icon={circleIcon('#f59e0b', 18)} zIndexOffset={1000}>
        <Popup>Vị trí của bạn</Popup>
      </Marker>

      {places.map(p => (
        <Marker
          key={p.placeId}
          position={[p.location.lat, p.location.lng]}
          icon={placeIcon(p, selectedId === p.placeId)}
          zIndexOffset={p.isRecommended ? 100 : 0}
          eventHandlers={{ click: () => onMarkerClick(p.placeId) }}
        >
          <Popup>
            <div style={{ minWidth: 160 }}>
              <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 2px', color: '#0f172a' }}>{p.name}</p>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{p.vicinity}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
