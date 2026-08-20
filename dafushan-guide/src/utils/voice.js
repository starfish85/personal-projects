import { app, showToast } from '../stores/app'

const base = import.meta.env.BASE_URL || './'

let bound = null
let speakingKey = ''

const AUDIO_VER = '3'

export function audioUrl(clip) {
  const ext = String(clip || '').startsWith('poi/') ? 'm4a' : 'wav'
  return `${base}audio/${clip}.${ext}?v=${AUDIO_VER}`
}

export function clipForPoi(id) {
  return id ? `poi/${id}` : 'test'
}

export function clipForGuide(guide) {
  if (!guide) return 'nav-plan'
  if (guide.arrived) return 'nav-arrived'
  if (guide.text === '正在规划路线') return 'nav-plan'
  if (guide.text === '即将到达目的地') return 'nav-soon'
  if (guide.nextTurn === '左转') return 'nav-left'
  if (guide.nextTurn === '右转') return 'nav-right'
  if (guide.nextTurn === '掉头') return 'nav-uturn'
  return 'nav-forward'
}

export function bindPlayer(el) {
  if (el) bound = el
}

export function unbindPlayer(el) {
  if (bound === el) bound = null
}

function isWeixin() {
  return typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)
}

function weixinReady(fn) {
  if (window.WeixinJSBridge) {
    fn()
    return
  }
  if (isWeixin()) {
    document.addEventListener('WeixinJSBridgeReady', fn, false)
    return
  }
  fn()
}

function withWeixinAudio(fn) {
  weixinReady(() => {
    if (window.WeixinJSBridge && typeof window.WeixinJSBridge.invoke === 'function') {
      window.WeixinJSBridge.invoke('getNetworkType', {}, () => fn())
      return
    }
    fn()
  })
}

export function unlockVoice() {
  withWeixinAudio(() => {})
}

function finish(key, onEnd) {
  if (speakingKey === key) speakingKey = ''
  onEnd?.()
}

export function stopVoice() {
  speakingKey = ''
  const a = playerEl()
  if (!a) return
  a.onended = null
  a.onerror = null
  try {
    a.pause()
    a.currentTime = 0
  } catch {
    /* ignore */
  }
}

export function isSpeaking(text) {
  const a = bound
  const on = !!(a && !a.paused && !a.ended && a.currentTime > 0)
  if (text) return speakingKey === text && on
  return on
}

function playerEl() {
  if (bound) return bound
  let el = document.getElementById('guide-audio')
  if (!el) {
    el = document.createElement('audio')
    el.id = 'guide-audio'
    el.setAttribute('playsinline', 'true')
    el.setAttribute('webkit-playsinline', 'true')
    el.preload = 'auto'
    document.body.appendChild(el)
  }
  return el
}

export function speak(text, { force = false, onEnd, clip } = {}) {
  if (!force && !app.voiceEnabled) return false
  const file = clip || 'test'
  const key = text || file
  const a = playerEl()

  speakingKey = key
  a.muted = false
  a.volume = Math.min(1, Math.max(0.2, Number(app.volume) || 0.9))
  const url = audioUrl(file)
  a.src = url
  try {
    a.load()
    a.currentTime = 0
  } catch {
    /* ignore */
  }

  a.onended = () => finish(key, onEnd)
  a.onerror = () => {
    showToast('语音加载失败，请检查网络后重试')
    finish(key, onEnd)
  }

  const start = () => {
    const play = a.play()
    if (play && play.catch) {
      play.catch((err) => {
        const name = err && err.name
        if (name === 'NotAllowedError') {
          showToast('请点下面播放条上的三角形')
        } else {
          showToast('播放失败，请点下面的播放条')
        }
        finish(key, onEnd)
      })
    }
  }

  withWeixinAudio(start)
  return true
}

if (typeof document !== 'undefined') {
  weixinReady(() => {})
}
