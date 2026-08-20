import { watch } from 'vue'
import { POIS } from '../data/pois'
import { haversine } from '../utils/geo'
import { app, showToast, userPoint } from '../stores/app'
import { clipForPoi, speak } from '../utils/voice'

const ENTER_M = 55
const EXIT_M = 90

export function useProximityGuide() {
  watch(
    () => [app.userLat, app.userLng, app.useMockLocation, app.mockPoiId, app.voiceEnabled],
    () => {
      if (!app.onboarded || !app.voiceEnabled) return
      const here = userPoint()
      if (!here) return

      for (const poi of POIS) {
        if (poi.type !== 'attraction') continue
        const d = haversine(here, poi)
        const state = app.playedVoices[poi.id] || 'idle'
        if (state === 'idle' && d <= ENTER_M) {
          app.playedVoices[poi.id] = 'played'
          const ok = speak(poi.voice || poi.intro, { clip: clipForPoi(poi.id) })
          showToast(ok ? `附近到了「${poi.name}」，正在讲解` : `附近到了「${poi.name}」，点详情可听讲解`)
        } else if (state === 'played' && d > EXIT_M) {
          app.playedVoices[poi.id] = 'idle'
        }
      }
    },
  )
}
