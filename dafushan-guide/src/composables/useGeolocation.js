import { app, showToast, userPoint } from '../stores/app'

let watchId = null

function insecurePage() {
  const host = location.hostname
  const local = host === 'localhost' || host === '127.0.0.1'
  return !window.isSecureContext && !local
}

function friendlyError(err) {
  if (insecurePage()) {
    return '当前是普通 http，手机不给定位。请用 https 打开，或到「我的」开室内演示'
  }
  if (err?.code === 1) return '浏览器没有位置权限，请点允许'
  if (err?.code === 2) return '暂时拿不到位置'
  if (err?.code === 3) return '定位超时，请到开阔处再试'
  return err?.message || '定位失败'
}

function applyPosition(pos) {
  app.userLat = pos.coords.latitude
  app.userLng = pos.coords.longitude
  app.gpsAccuracy = pos.coords.accuracy
  app.gpsStatus = 'ready'
  app.locationSource = 'gps'
  app.gpsError = ''
}

function applyError(err) {
  app.gpsStatus = 'error'
  app.gpsError = friendlyError(err)
  if (!app.useMockLocation) app.locationSource = 'none'
  showToast(app.gpsError)
}

export function useGeolocation() {
  function startWatch() {
    if (app.useMockLocation) {
      const p = userPoint()
      if (p) {
        app.userLat = p.lat
        app.userLng = p.lng
      }
      app.locationSource = 'mock'
      app.gpsStatus = 'ready'
      app.gpsError = ''
      return
    }
    if (!navigator.geolocation) {
      applyError(new Error('这台设备不支持定位'))
      return
    }
    if (insecurePage()) {
      applyError(new Error('insecure'))
      return
    }
    app.gpsStatus = 'locating'
    navigator.geolocation.getCurrentPosition(applyPosition, applyError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    })
    if (watchId != null) return
    watchId = navigator.geolocation.watchPosition(applyPosition, applyError, {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 15000,
    })
  }

  function stopWatch() {
    if (watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId)
    }
    watchId = null
  }

  function restartWatch() {
    stopWatch()
    startWatch()
  }

  return { startWatch, stopWatch, restartWatch }
}
