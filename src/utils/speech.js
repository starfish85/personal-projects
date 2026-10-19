/**
 * ============================================================
 * 浏览器语音合成（TTS, Text-To-Speech）
 * ============================================================
 * 职责：把 AI 实时生成的讲解文字"读出来"。
 *
 * 与 utils/voice.js 的分工：
 *   voice.js  → 播放本地真人录音文件（景点讲解，音质好、提前录好）
 *   speech.js → 朗读任意动态文本（AI 回答，内容无法提前录音）
 *
 * 用的是浏览器内置的 Web Speech API（window.speechSynthesis），
 * 零成本、免流量、不用任何第三方服务；缺点是音色是系统合成的机械音。
 * ============================================================
 */
import { app } from '../stores/app'

/**
 * 从系统可用音色里挑一个最合适的。
 * 不同设备音色列表不同（Windows/安卓/iOS 都不一样），
 * 所以按优先级逐级降级：普通话 → 任意中文 → 当前语言 → 放弃（用默认）。
 */
function pickVoice() {
  // ?. 可选链：某些老浏览器没有 getVoices 方法，避免抛错
  const voices = window.speechSynthesis?.getVoices?.() || []
  if (!voices.length) return null
  const lang = app.language === 'en' ? 'en-' : 'zh-'
  return (
    voices.find((v) => v.lang === 'zh-CN') ||
    voices.find((v) => v.lang?.startsWith('zh')) ||
    voices.find((v) => v.lang?.startsWith(lang)) ||
    null
  )
}

/** 检测当前浏览器是否支持语音合成（极少数老浏览器不支持） */
export function ttsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * 朗读一段文本。
 * @returns {boolean} 是否真的开始朗读了（false 表示不支持或文本为空）
 *
 * 关键点：每次朗读前先 cancel() —— speechSynthesis 内部是个队列，
 * 不取消的话新文本会排在旧文本后面，用户会觉得"怎么还在念上一段"。
 */
export function speakText(text) {
  if (!ttsSupported() || !text) return false
  window.speechSynthesis.cancel()
  // SpeechSynthesisUtterance = "一段话的朗读任务"，可设置语言/语速/音量/音色
  const u = new SpeechSynthesisUtterance(text)
  u.lang = app.language === 'en' ? 'en-US' : 'zh-CN'
  u.rate = 0.95 // 语速稍慢一点点，照顾老年用户
  const v = pickVoice()
  if (v) u.voice = v
  // 跟着全局设置里的音量走，并限制在 0.2~1 之间防止静音
  u.volume = Math.min(1, Math.max(0.2, Number(app.volume) || 0.9))
  window.speechSynthesis.speak(u)
  return true
}

/** 停止朗读（离开页面/点停止按钮时调用） */
export function stopSpeak() {
  if (ttsSupported()) window.speechSynthesis.cancel()
}
