import { getClient, getCloudConfig } from './client'
import { toast } from '../stores/ui'

function appRootUrl() {
  const base = import.meta.env.BASE_URL || './'
  if (base.startsWith('/')) return new URL(base, window.location.origin)
  const path = window.location.pathname
  const dir = path.endsWith('/') ? path : path.replace(/\/[^/]+$/, '/')
  return new URL(dir, window.location.origin)
}

function swUrl() {
  return new URL('sw.js', appRootUrl()).href
}

function swScope() {
  return appRootUrl().href
}

async function dropStolenScopes() {
  const origin = window.location.origin
  const mine = swScope().endsWith('/') ? swScope() : `${swScope()}/`
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      regs
        .filter((reg) => {
          const scope = reg.scope.endsWith('/') ? reg.scope : `${reg.scope}/`
          if (scope === mine) return false
          return scope === `${origin}/` || scope.startsWith(`${origin}/personal-projects/`)
        })
        .map((reg) => reg.unregister()),
    )
  } catch {
    /* ignore */
  }
}

export async function registerShellWorker() {
  if (!('serviceWorker' in navigator)) return null
  if (import.meta.env.DEV) return null
  try {
    await dropStolenScopes()
    return await navigator.serviceWorker.register(swUrl(), { scope: swScope() })
  } catch {
    return null
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export function pushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    window.isSecureContext
  )
}

async function readVapidPublic(client) {
  const config = getCloudConfig()
  if (!config) return ''
  const session = (await client.auth.getSession()).data.session
  const res = await fetch(`${config.url.replace(/\/$/, '')}/functions/v1/push-config`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${session?.access_token || config.anonKey}`,
    },
  })
  if (!res.ok) throw new Error('读不到推送配置')
  const data = await res.json()
  return data?.publicKey || ''
}

export async function enablePush(user) {
  if (!pushSupported()) {
    toast('当前浏览器不能网页推送。把日课加到主屏幕后再试；微信里一般不行。')
    return false
  }
  const client = getClient()
  if (!client || !user) {
    toast('先登录云同步')
    return false
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    toast('没有通知权限')
    return false
  }
  const key = await readVapidPublic(client)
  if (!key) {
    toast('还没配置 VAPID，见 docs/04-云同步.md')
    return false
  }
  const registration = await registerShellWorker()
  if (!registration) {
    toast('后台脚本注册失败')
    return false
  }
  const ready = await navigator.serviceWorker.ready
  let subscription = await ready.pushManager.getSubscription()
  if (!subscription) {
    subscription = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    })
  }
  const json = subscription.toJSON()
  const { error } = await client.from('rike_push_subs').upsert({
    endpoint: json.endpoint,
    user_id: user.id,
    p256dh: json.keys?.p256dh || '',
    auth: json.keys?.auth || '',
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
    updated_at: new Date().toISOString(),
  })
  if (error) {
    toast(error.message || '提醒订阅失败')
    return false
  }
  toast('到点会推送。页面关掉也可以，微信里除外。')
  return true
}

export async function currentPushOn() {
  if (!pushSupported()) return 'unsupported'
  try {
    const ready = await navigator.serviceWorker.ready
    const sub = await ready.pushManager.getSubscription()
    return sub ? 'on' : 'off'
  } catch {
    return 'off'
  }
}
