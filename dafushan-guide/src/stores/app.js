import { reactive } from 'vue'
import { getPoi } from '../data/pois'

const KEY = 'dafushan-guide-settings'

export const app = reactive({
  onboarded: false,
  fontSize: 'standard',
  language: 'zh',
  voiceEnabled: true,
  volume: 0.9,
  useMockLocation: false,
  mockPoiId: 'visitor-center',
  userLat: null,
  userLng: null,
  gpsStatus: 'idle',
  locationSource: 'none',
  gpsAccuracy: null,
  gpsError: '',
  playedVoices: {},
  toast: '',
})

export const FONT_OPTIONS = [
  { id: 'standard', label: '标准字体' },
  { id: 'large', label: '超大字体' },
  { id: 'xlarge', label: '特大字体' },
]

export function applyFontToDocument() {
  document.documentElement.dataset.font = app.fontSize
  document.documentElement.style.height = '100%'
  document.documentElement.style.overflow = 'hidden'
  document.body.style.height = '100%'
  document.body.style.overflow = 'hidden'
  const root = document.getElementById('app')
  if (root) {
    root.style.height = '100%'
    root.style.overflow = 'hidden'
  }
}

export function persistSettings() {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      onboarded: app.onboarded,
      fontSize: app.fontSize,
      language: app.language,
      voiceEnabled: app.voiceEnabled,
      volume: app.volume,
      useMockLocation: app.useMockLocation,
      mockPoiId: app.mockPoiId,
    }),
  )
}

export function restoreSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const data = JSON.parse(raw)
      Object.assign(app, data)
    }
  } catch {
    /* ignore */
  }
  applyFontToDocument()
}

export function setFontSize(id) {
  app.fontSize = id
  applyFontToDocument()
  persistSettings()
}

export function finishOnboarding() {
  app.onboarded = true
  persistSettings()
}

export function userPoint() {
  if (app.useMockLocation) {
    const poi = getPoi(app.mockPoiId) || getPoi('visitor-center')
    return { lat: poi.lat, lng: poi.lng, source: 'mock' }
  }
  if (app.locationSource === 'gps' && app.userLat != null && app.userLng != null) {
    return {
      lat: app.userLat,
      lng: app.userLng,
      source: 'gps',
      accuracy: app.gpsAccuracy,
    }
  }
  return null
}

let toastTimer = 0
export function showToast(text, ms = 2600) {
  app.toast = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    if (app.toast === text) app.toast = ''
  }, ms)
}
