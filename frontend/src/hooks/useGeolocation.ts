import { useState, useEffect } from 'react'

interface GeoState {
  lat: number | null
  lng: number | null
  error: string | null
  loading: boolean
}

const GEO_ERRORS: Record<number, string> = {
  1: 'Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền và tải lại trang.',
  2: 'Không thể lấy vị trí của bạn. Vui lòng thử lại.',
  3: 'Yêu cầu vị trí bị timeout. Vui lòng thử lại.',
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({ lat: null, lng: null, error: null, loading: true })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ lat: null, lng: null, error: 'Trình duyệt không hỗ trợ định vị.', loading: false })
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setState({ lat: coords.latitude, lng: coords.longitude, error: null, loading: false }),
      (err) =>
        setState({ lat: null, lng: null, error: GEO_ERRORS[err.code] ?? 'Không lấy được vị trí.', loading: false }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )
  }, [])

  return state
}
