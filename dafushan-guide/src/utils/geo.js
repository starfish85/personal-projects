/** 规划图可见范围（北朝上）。点位按图面比例换算，景区确认后可再校准。 */
export const MAP_BOUNDS = {
  south: 22.935968,
  north: 22.969383,
  west: 113.285833,
  east: 113.325694,
}

/** OpenStreetMap 公园范围，用来判断人在不在园内 */
export const PARK_BBOX = {
  south: 22.93998,
  north: 22.96943,
  west: 113.28698,
  east: 113.31925,
}

export function isInsidePark(point, pad = 0.003) {
  if (!point || point.lat == null || point.lng == null) return false
  return (
    point.lat >= PARK_BBOX.south - pad &&
    point.lat <= PARK_BBOX.north + pad &&
    point.lng >= PARK_BBOX.west - pad &&
    point.lng <= PARK_BBOX.east + pad
  )
}

export function externalMapUrl(poi) {
  const name = encodeURIComponent(`大夫山森林公园${poi.name}`)
  return `https://uri.amap.com/marker?position=${poi.lng},${poi.lat}&name=${name}&src=dafushan&coordinate=gaode&callnative=1`
}

export function xyToLatLng(x, y) {
  return {
    lat: MAP_BOUNDS.north - y * (MAP_BOUNDS.north - MAP_BOUNDS.south),
    lng: MAP_BOUNDS.west + x * (MAP_BOUNDS.east - MAP_BOUNDS.west),
  }
}

export function latLngToXy(point) {
  return {
    x: (point.lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west),
    y: (MAP_BOUNDS.north - point.lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south),
  }
}

export function leafletBounds() {
  return [
    [MAP_BOUNDS.south, MAP_BOUNDS.west],
    [MAP_BOUNDS.north, MAP_BOUNDS.east],
  ]
}

export function haversine(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function bearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const toDeg = (r) => (r * 180) / Math.PI
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.cos(toRad(b.lng - a.lng))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function turnLabel(fromDeg, toDeg) {
  let delta = ((toDeg - fromDeg + 540) % 360) - 180
  const abs = Math.abs(delta)
  if (abs < 28) return '直行'
  if (abs > 145) return '掉头'
  return delta > 0 ? '右转' : '左转'
}

export function compassLabel(deg) {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  return dirs[Math.round(deg / 45) % 8]
}

/** 老年游客步行约 60 米/分钟 */
export const WALK_M_PER_MIN = 60

export function walkMinutes(meters) {
  return Math.max(1, Math.round(meters / WALK_M_PER_MIN))
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}米`
  return `${(meters / 1000).toFixed(1)}公里`
}
