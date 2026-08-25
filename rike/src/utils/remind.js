import { dayComplete, practice, taskOnDate } from '../stores/practice'
import { toast } from '../stores/ui'
import { localDateKey } from './date'

function pad(n) {
  return String(n).padStart(2, '0')
}

function nowHm() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function key(date, taskId) {
  return `rike.reminded.${date}.${taskId}`
}

function already(date, taskId) {
  try {
    return localStorage.getItem(key(date, taskId)) === '1'
  } catch {
    return false
  }
}

function mark(date, taskId) {
  try {
    localStorage.setItem(key(date, taskId), '1')
  } catch {
    /* ignore */
  }
}

function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0.07
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
    window.setTimeout(() => ctx.close(), 500)
  } catch {
    /* ignore */
  }
}

function fire(task) {
  const date = localDateKey()
  mark(date, task.id)
  toast(task.title)
  try {
    navigator.vibrate?.([180, 70, 180])
  } catch {
    /* ignore */
  }
  beep()
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const note = new Notification(task.title, {
      body: '日课',
      tag: `rike-${task.id}`,
      icon: './favicon.svg',
    })
    note.onclick = () => {
      window.focus()
      location.hash = `#/task/${task.id}`
      note.close()
    }
  } catch {
    /* ignore */
  }
}

function due(task, hm, date) {
  // 只跟当前调度：归档/暂停不提醒；长期按现在的周几。不补发过去，不预告未来。
  if (!taskOnDate(task, date)) return false
  if (!task.reminder) return false
  if (hm < task.reminder) return false
  if (already(date, task.id)) return false
  if (dayComplete(task, practice.todayByTask[task.id])) return false
  return true
}

function tick() {
  if (!practice.ready) return
  const date = localDateKey()
  const hm = nowHm()
  for (const task of practice.tasks) {
    if (due(task, hm, date)) fire(task)
  }
}

export function startReminders() {
  tick()
  window.setInterval(tick, 15000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick()
  })
}

export async function ensureNotifyPermission() {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}
