/**
 * ============================================================
 * 定位模块：获取用户当前位置（GPS / 演示定位二合一）
 * ============================================================
 * 职责：向全局状态 app 里写入用户位置（userLat / userLng），
 * 供下游消费：首页"您当前位于"、自动语音讲解、园内导航。
 *
 * 定位有两个来源，优先级如下：
 *   1. 演示定位（mock）：用户在"我的"页手动选的景点，室内测试用
 *   2. 真实 GPS：浏览器的 Geolocation API
 *
 * 为什么封装成 composable 而不是直接在组件里写？
 *   定位是"全局只有一份"的状态（GPS 硬件只有一个），
 *   如果每个页面各自 watchPosition，会开多个监听互相打架。
 *   所以由 App.vue 挂载时调一次 startWatch()，全应用共享结果。
 * ============================================================
 */
import { app, showToast, userPoint } from '../stores/app'

// watchPosition 返回的监听 id，全局只保存一个（模块级变量）。
// 用于 stopWatch 时清除监听，以及防止重复开启。
let watchId = null

/**
 * 判断当前页面是否处于"非安全上下文"。
 * 浏览器规定：只有 https 页面（或 localhost 调试）才允许访问 GPS，
 * 普通 http 页面调 geolocation 会直接失败。
 * 这就是为什么部署到 GitHub Pages（强制 https）后手机才能定位。
 */
function insecurePage() {
  const host = location.hostname
  const local = host === 'localhost' || host === '127.0.0.1'
  return !window.isSecureContext && !local
}

/**
 * 把浏览器冷冰冰的错误码翻译成老年人能看懂的话（适老化设计）。
 * err.code 是 Geolocation API 的标准错误码：
 *   1 = PERMISSION_DENIED（用户点了"拒绝"）
 *   2 = POSITION_UNAVAILABLE（信号差，拿不到）
 *   3 = TIMEOUT（超时）
 */
function friendlyError(err) {
  if (insecurePage()) {
    return '当前是普通 http，手机不给定位。请用 https 打开，或到「我的」开室内演示'
  }
  if (err?.code === 1) return '浏览器没有位置权限，请点允许'
  if (err?.code === 2) return '暂时拿不到位置'
  if (err?.code === 3) return '定位超时，请到开阔处再试'
  return err?.message || '定位失败'
}

/** 定位成功：把经纬度和精度写入全局状态，下游组件自动响应 */
function applyPosition(pos) {
  app.userLat = pos.coords.latitude
  app.userLng = pos.coords.longitude
  app.gpsAccuracy = pos.coords.accuracy // 精度（米），可用于提示"定位不太准"
  app.gpsStatus = 'ready'
  app.locationSource = 'gps'
  app.gpsError = ''
}

/** 定位失败：记录友好错误并弹 toast。开了演示定位则不覆盖位置来源 */
function applyError(err) {
  app.gpsStatus = 'error'
  app.gpsError = friendlyError(err)
  if (!app.useMockLocation) app.locationSource = 'none'
  showToast(app.gpsError)
}

export function useGeolocation() {
  /**
   * 启动定位。App.vue 挂载时调用一次；切换演示定位开关后也会重新调用。
   *
   * 流程分支：
   *   A. 演示模式 → 直接从 userPoint() 拿 mock 坐标写入，不碰 GPS 硬件
   *   B. 真实 GPS → 先做两项前置检查，再先拿一次 + 持续监听
   */
  function startWatch() {
    // ── 分支 A：演示定位 ──
    if (app.useMockLocation) {
      const p = userPoint() // userPoint 内部已判空，拿不到时返回 null
      if (p) {
        app.userLat = p.lat
        app.userLng = p.lng
      }
      app.locationSource = 'mock'
      app.gpsStatus = 'ready'
      app.gpsError = ''
      return
    }

    // ── 分支 B：真实 GPS，两项前置检查 ──
    // 检查 1：设备/浏览器根本不支持 geolocation（极少数老旧设备）
    if (!navigator.geolocation) {
      applyError(new Error('这台设备不支持定位'))
      return
    }
    // 检查 2：非 https 页面，浏览器会静默拒绝定位请求，提前给出明确提示
    if (insecurePage()) {
      applyError(new Error('insecure'))
      return
    }

    // ── 真正开始定位：先拿一次 + 持续监听 ──
    app.gpsStatus = 'locating'
    // getCurrentPosition：立即拿一次当前位置，让页面尽快有内容显示
    navigator.geolocation.getCurrentPosition(applyPosition, applyError, {
      enableHighAccuracy: true, // 请求高精度（调用 GPS 芯片而非基站/WiFi 粗定位）
      timeout: 10000,           // 10 秒拿不到就算超时
      maximumAge: 5000,         // 允许使用 5 秒内的缓存位置，省电省时
    })
    // watchPosition：持续监听位置变化（用户在园内走动时自动更新）。
    // 重复调用 startWatch 时用这个判断避免开多个监听。
    if (watchId != null) return
    watchId = navigator.geolocation.watchPosition(applyPosition, applyError, {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 15000,
    })
  }

  /** 停止持续监听（比如页面销毁、或切换到演示模式前） */
  function stopWatch() {
    if (watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId)
    }
    watchId = null
  }

  /** 重启定位：先停后开。用户在"我的"页切换开关、或手动点"重新定位"时用 */
  function restartWatch() {
    stopWatch()
    startWatch()
  }

  return { startWatch, stopWatch, restartWatch }
}
