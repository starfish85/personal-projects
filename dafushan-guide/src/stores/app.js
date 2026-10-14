import { reactive } from 'vue'
import { getPoi, POIS } from '../data/pois'

const KEY = 'dafushan-guide-settings'

export const app = reactive({
  onboarded: false,
  fontSize: 'standard',
  language: 'zh',
  voiceEnabled: true,
  volume: 0.9,
  useMockLocation: false,
  // 默认值必须是 pois.js 里真实存在的 id（旧的 visitor-center 已不存在）
  mockPoiId: 'nanmen-guangchang',
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
    // mockPoiId 可能是 localStorage 里存的旧值（如已删除的 visitor-center），
    // 两个 getPoi 都可能返回 null，必须判空，否则读 poi.lat 会直接崩掉整个页面
    const poi = getPoi(app.mockPoiId) || getPoi('nanmen-guangchang') || POIS[0]
    if (!poi) return null
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
export function showToast(text, ms = 4200) {
  app.toast = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    if (app.toast === text) app.toast = ''
  }, ms)
}
