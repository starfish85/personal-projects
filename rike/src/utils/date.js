export function localDateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const start = (first.getDay() + 6) % 7
  const lastDate = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < start; i += 1) cells.push(null)
  for (let day = 1; day <= lastDate; day += 1) {
    cells.push(localDateKey(new Date(year, month, day)))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const CN_MONTH = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
const CN_WEEK = ['日', '一', '二', '三', '四', '五', '六']
const CN_DIGIT = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

export function chineseDay(n) {
  const day = Number(n)
  if (day <= 10) return day === 10 ? '十' : CN_DIGIT[day]
  if (day < 20) return `十${CN_DIGIT[day - 10]}`
  if (day === 20) return '二十'
  if (day < 30) return `廿${CN_DIGIT[day - 20]}`
  if (day === 30) return '三十'
  return '卅一'
}

export function formatCoverDate(dateKey = localDateKey()) {
  const [y, m, d] = String(dateKey || localDateKey()).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const week = CN_WEEK[date.getDay()]
  return {
    year: y,
    month: `${CN_MONTH[m]}月`,
    day: chineseDay(d),
    weekday: `星期${week}`,
    weekdayShort: `周${week}`,
  }
}

export function formatDayTitle(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${y}年${m}月${d}日 周${CN_WEEK[date.getDay()]}`
}

export function weekdayOf(dateKey) {
  const [y, m, d] = String(dateKey || localDateKey()).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getDay() || 7
}

export function dateMode(date, today = localDateKey()) {
  if (date > today) return 'future'
  if (date < today) return 'past'
  return 'today'
}

export function shiftDateKey(dateKey, days) {
  const [y, m, d] = String(dateKey || localDateKey()).split('-').map(Number)
  return localDateKey(new Date(y, m - 1, d + days))
}

export function weekStart(dateKey) {
  const [y, m, d] = String(dateKey || localDateKey()).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return localDateKey(date)
}

export function weekGrid(dateKey) {
  const start = weekStart(dateKey)
  return Array.from({ length: 7 }, (_, i) => shiftDateKey(start, i))
}

export function formatPracticeTime(seconds) {
  const s = Math.round(Number(seconds) || 0)
  if (s <= 0) return ''
  const m = Math.round(s / 60)
  if (m < 1) return '不足 1 分钟'
  return `${m} 分钟`
}

export function formatClock(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function tapPulse() {
  try {
    navigator.vibrate?.(12)
  } catch {
    /* ignore */
  }
}
