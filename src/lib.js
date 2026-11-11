// Date/time helpers, recurrence, quick-add parser, free-slot finder. All local time.
export const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d) }
export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const toHM = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() }
export const endMin = (t) => toMin(t.start) + t.duration

export function fmtTime(t, h12) {
  if (!h12) return t
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}

// ws: 0=Sun, 1=Mon, 6=Sat
export const weekStartOf = (s, ws) => addDays(s, -((parseYmd(s).getDay() - ws + 7) % 7))

export function occursOn(t, d) {
  if (d < t.date) return false
  const dow = parseYmd(d).getDay()
  switch (t.repeat) {
    case 'daily': return true
    case 'weekdays': return dow > 0 && dow < 6
    case 'weekly': return dow === parseYmd(t.date).getDay()
    default: return d === t.date
  }
}

// Other timed tasks on the same day that overlap t (warn only, never block).
export function overlapping(t, list) {
  if (!t.start) return []
  const a = toMin(t.start), b = a + t.duration
  return list.filter((o) => o.id !== t.id && o.start && a < endMin(o) && toMin(o.start) < b)
}

// Free start times (step minutes) that fit len minutes between wake and sleep.
export function freeSlots(list, len, wake, sleep, { step = 15, max = 6, from = 0 } = {}) {
  const busy = list.filter((t) => t.start).map((t) => [toMin(t.start), endMin(t)])
  const out = []
  const first = Math.max(toMin(wake), Math.ceil(from / step) * step)
  for (let s = first; s + len <= toMin(sleep) && out.length < max; s += step) {
    if (!busy.some(([a, b]) => s < b && s + len > a)) out.push(toHM(s))
  }
  return out
}

// "Gym 18:00 1h daily" -> partial task. Priority: "!" high-ish, "!!" high, none normal.
export function parseQuick(input, today = ymd()) {
  let s = ` ${input} `
  const o = {}
  const take = (re, fn) => { const m = s.match(re); if (m) { fn(m); s = s.replace(re, ' ') } }
  take(/\s(daily|weekdays|weekly)(?=\s)/i, (m) => (o.repeat = m[1].toLowerCase()))
  take(/\s(today|tomorrow)(?=\s)/i, (m) => (o.date = m[1].toLowerCase() === 'tomorrow' ? addDays(today, 1) : today))
  take(/\s(!{1,2})(?=\s)/, (m) => (o.priority = m[1].length === 2 ? 2 : 1))
  take(
    /\s(?:(\d+)\s*h(?:rs?|ours?)?\s*(\d+)\s*m(?:in)?|(\d+(?:\.\d+)?)\s*h(?:rs?|ours?)?|(\d+)\s*m(?:ins?|inutes?)?)(?=\s)/i,
    (m) => (o.duration = m[1] ? +m[1] * 60 + +m[2] : m[3] ? Math.round(+m[3] * 60) : +m[4])
  )
  take(/\s(?:(\d{1,2}):(\d{2})\s*(am|pm)?|(\d{1,2})\s*(am|pm))(?=\s)/i, (m) => {
    let h = +(m[1] || m[4]); const mi = +(m[2] || 0); const ap = (m[3] || m[5] || '').toLowerCase()
    if (ap === 'pm' && h < 12) h += 12
    if (ap === 'am' && h === 12) h = 0
    if (h < 24 && mi < 60) o.start = `${pad(h)}:${pad(mi)}`
  })
  o.title = s.replace(/\s+/g, ' ').trim()
  return o
}

export const REM = [null, 5, 10, 30, 60] // reminder offsets in minutes (null = none)
