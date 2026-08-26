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

export function getClient() {
  const config = getCloudConfig()
  if (!config) return null
  const stamp = config.url + config.anonKey
  if (!client || bound !== stamp) {
    client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
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
