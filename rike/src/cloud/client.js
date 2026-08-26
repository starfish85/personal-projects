import { createClient } from '@supabase/supabase-js'

const LS = 'rike.cloud'
let client = null
let bound = ''

export function getCloudConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (url && anonKey) return { url, anonKey, fromEnv: true }
  try {
    const saved = JSON.parse(localStorage.getItem(LS) || 'null')
    if (saved?.url && saved?.anonKey) return { ...saved, fromEnv: false }
  } catch {
    /* ignore */
  }
  return null
}

export function setCloudConfig(url, anonKey) {
  localStorage.setItem(LS, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }))
  client = null
  bound = ''
}

const AUTH_HASH_KEY = 'rike.auth.hash'
let memoryAuthHash = ''

function isAuthHash(hash) {
  const text = String(hash || '')
  return (
    text.includes('access_token=') ||
    text.includes('refresh_token=') ||
    text.includes('error_description=') ||
    text.includes('error=')
  )
}

export function captureAuthHash() {
  const hash = String(location.hash || '')
  if (!isAuthHash(hash)) return
  try {
    sessionStorage.setItem(AUTH_HASH_KEY, hash)
  } catch {
    memoryAuthHash = hash
  }
  history.replaceState({}, '', `${location.pathname}${location.search}#/`)
}

export function takeAuthHash() {
  let stored = memoryAuthHash
  memoryAuthHash = ''
  try {
    stored = sessionStorage.getItem(AUTH_HASH_KEY) || stored
    sessionStorage.removeItem(AUTH_HASH_KEY)
  } catch {
    /* private mode */
  }
  return stored || ''
}

export function getClient() {
  const config = getCloudConfig()
  if (!config) return null
  const stamp = config.url + config.anonKey
  if (!client || bound !== stamp) {
    client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
    })
    bound = stamp
  }
  return client
}

export function redirectTo() {
  const clean = `${location.origin}${location.pathname}`.replace(/index\.html$/i, '')
  const withSlash = clean.endsWith('/') ? clean : `${clean}/`
  return `${withSlash}index.html`
}
