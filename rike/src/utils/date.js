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

export function formatDayTitle(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const weeks = ['日', '一', '二', '三', '四', '五', '六']
  return `${y}年${m}月${d}日 周${weeks[date.getDay()]}`
}

export function weekdayOf(dateKey) {
  const [y, m, d] = String(dateKey || localDateKey()).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getDay() || 7
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
