/**
 * ============================================================
 * 自动语音讲解模块（定位的下游消费者）
 * ============================================================
 * 职责：监听用户位置变化，走进某个景点附近时自动播放讲解语音。
 *
 * 工作流程：
 *   位置变化 → 遍历所有景点算距离 → 进入 55 米触发讲解 → 走出 90 米重置
 *
 * 由 App.vue 挂载时调用一次，全局生效，不需要每个页面单独引入。
 * ============================================================
 */
import { watch } from 'vue'
import { POIS } from '../data/pois'
import { haversine } from '../utils/geo'
import { app, showToast, userPoint } from '../stores/app'
import { clipForPoi, speak } from '../utils/voice'

// ── 迟滞（hysteresis）双阈值 ──
// 为什么进入和走出不用同一个距离？
//   GPS 定位有几米到十几米的抖动，如果只用一个阈值（比如 55 米），
//   用户站在景点边缘时距离会在 54/56 之间来回跳，导致语音反复触发又反复重置。
//   用"进 55 米、出 90 米"两个阈值形成一个缓冲区：进了 55 米开始讲，
//   要走出 90 米才算离开，中间这段距离抖动不会引起状态翻转。
const ENTER_M = 55
const EXIT_M = 90

export function useProximityGuide() {
  // watch 监听位置相关的所有响应式数据：任一变化就重新检查一遍附近景点。
  // 数组形式 = 同时监听多个源（GPS 经纬度、演示定位开关、演示点选择、语音开关）
  watch(
    () => [app.userLat, app.userLng, app.useMockLocation, app.mockPoiId, app.voiceEnabled],
    () => {
      // 前置条件：未完成新手引导 或 语音开关关闭时，什么都不做
      if (!app.onboarded || !app.voiceEnabled) return
      const here = userPoint() // 统一位置出口：演示定位优先，其次真实 GPS
      if (!here) return // 还没定位成功，跳过

      // 遍历所有 POI，逐个计算与用户的距离
      for (const poi of POIS) {
        if (poi.type !== 'attraction') continue // 厕所/出口/餐饮不讲解
        const d = haversine(here, poi) // 球面距离（米）

        // playedVoices 记录每个景点的讲解状态：idle（未讲）/ played（已讲）
        const state = app.playedVoices[poi.id] || 'idle'

        if (state === 'idle' && d <= ENTER_M) {
          // 进入触发圈：标记为已讲，然后播放语音
          app.playedVoices[poi.id] = 'played'
          // speak() 优先播放预录音频 clip，没有就降级用 TTS 朗读文字介绍
          const ok = speak(poi.voice || poi.intro, { clip: clipForPoi(poi.id) })
          showToast(ok ? `附近到了「${poi.name}」，正在讲解` : `附近到了「${poi.name}」，点详情可听讲解`)
        } else if (state === 'played' && d > EXIT_M) {
          // 走出重置圈：恢复为未讲状态，下次再来还会自动讲
          app.playedVoices[poi.id] = 'idle'
        }
      }
    },
  )
}
