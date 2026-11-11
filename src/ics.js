import { db, newTask } from './db'
import { pad, ymd, parseYmd, addDays, toMin, endMin, occursOn, weekStartOf } from './lib'

// Floating local times (no TZID/Z): calendars apply the device zone, so RRULE repeats stay DST-correct.
const CRLF = '\r\n'
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&')
const stamp = () => new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function fold(l) { // 75-octet lines, continuation starts with a space
  const e = new TextEncoder(); const parts = []; let cur = '', n = 0, lim = 75
  for (const ch of l) {
    const b = e.encode(ch).length
    if (n + b > lim) { parts.push(cur); cur = ''; n = 0; lim = 74 }
    cur += ch; n += b
  }
  parts.push(cur)
  return parts.join(CRLF + ' ')
}

// Local date+minutes (minutes may pass midnight) -> YYYYMMDDTHHMMSS
const dt = (d, m) => addDays(d, Math.floor(m / 1440)).replace(/-/g, '') + 'T' + pad(Math.floor((m % 1440) / 60)) + pad(m % 60) + '00'

// "Weekdays" starting on a weekend: begin on Monday so the first instance is valid.
function firstDate(t) {
  if (t.repeat !== 'weekdays') return t.date
  let d = t.date
  while ([0, 6].includes(parseYmd(d).getDay())) d = addDays(d, 1)
  return d
}

export const rrule = (t) => ({
  daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  weekly: `FREQ=WEEKLY;BYDAY=${BYDAY[parseYmd(t.date).getDay()]}`
}[t.repeat] || '')

function eventLines(t) {
  const d = firstDate(t)
  const L = ['BEGIN:VEVENT', `UID:${t.id}@dayplanner`, `DTSTAMP:${stamp()}`, `SUMMARY:${esc(t.title)}`]
  if (t.start) {
    L.push(`DTSTART:${dt(d, toMin(t.start))}`, `DTEND:${dt(d, endMin(t))}`)
  } else {
    L.push(`DTSTART;VALUE=DATE:${d.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(d, 1).replace(/-/g, '')}`)
  }
  if (t.repeat !== 'none') L.push(`RRULE:${rrule(t)}`)
  if (t.notes) L.push(`DESCRIPTION:${esc(t.notes)}`)
  if (t.category) L.push(`CATEGORIES:${esc(t.category)}`)
  L.push(`PRIORITY:${[9, 5, 1][t.priority] ?? 5}`)
  if (t.start && t.reminder != null) {
    L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(t.title)}`, `TRIGGER:-PT${t.reminder}M`, 'END:VALARM')
  }
  L.push('END:VEVENT')
  return L
}

export function toICS(tasks) {
  const body = tasks.flatMap(eventLines)
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Day Planner//EN', 'CALSCALE:GREGORIAN', ...body, 'END:VCALENDAR']
    .map(fold).join(CRLF) + CRLF
}

export function download(name, text, type = 'text/calendar') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// scope: 'day' | 'week' | 'all'
export function tasksForScope(scope, tasks, day, weekStart) {
  if (scope === 'all') return tasks
  const days = scope === 'day' ? [day] : Array.from({ length: 7 }, (_, i) => addDays(weekStartOf(day, weekStart), i))
  return tasks.filter((t) => days.some((d) => occursOn(t, d)))
}

export const exportICS = (scope, tasks, day, ws) =>
  download(`day-planner-${scope}.ics`, toICS(tasksForScope(scope, tasks, day, ws)))

export const googleUrl = (t) => {
  const d = firstDate(t)
  const dates = t.start ? `${dt(d, toMin(t.start))}/${dt(d, endMin(t))}`
    : `${d.replace(/-/g, '')}/${addDays(d, 1).replace(/-/g, '')}`
  const p = new URLSearchParams({ action: 'TEMPLATE', text: t.title, dates, details: t.notes || '' })
  if (t.repeat !== 'none') p.set('recur', `RRULE:${rrule(t)}`)
  return `https://calendar.google.com/calendar/render?${p}`
}

export const outlookUrl = (t) => {
  const d = firstDate(t)
  const iso = (day, m) => `${addDays(day, Math.floor(m / 1440))}T${pad(Math.floor((m % 1440) / 60))}:${pad(m % 60)}:00`
  const p = new URLSearchParams({
    path: '/calendar/action/compose', rru: 'addevent', subject: t.title, body: t.notes || ''
  })
  if (t.start) { p.set('startdt', iso(d, toMin(t.start))); p.set('enddt', iso(d, endMin(t))) }
  else { p.set('startdt', d); p.set('enddt', addDays(d, 1)); p.set('allday', 'true') }
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p}`
}

// ---- Import ----
const unesc = (s) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1')

function parseDT(v) {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/)
  if (!m) return null
  const date = `${m[1]}-${m[2]}-${m[3]}`
  if (m[4] === undefined) return { date, allDay: true }
  if (m[7]) { // UTC -> device local
    const d = new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]))
    return { date: ymd(d), min: d.getHours() * 60 + d.getMinutes() }
  }
  return { date, min: +m[4] * 60 + +m[5] } // floating or TZID: treated as local
}

function eventToTask(ev) {
  const s = ev.DTSTART && parseDT(ev.DTSTART.val)
  if (!s || !ev.UID || !ev.SUMMARY) return null
  const e = ev.DTEND && parseDT(ev.DTEND.val)
  let duration = 60
  if (e && !s.allDay && !e.allDay) duration = Math.round((parseYmd(e.date) - parseYmd(s.date)) / 864e5) * 1440 + e.min - s.min
  else if (ev.DURATION) { const m = ev.DURATION.val.match(/PT(?:(\d+)H)?(?:(\d+)M)?/); if (m) duration = (+m[1] || 0) * 60 + (+m[2] || 0) }
  if (!(duration > 0)) duration = 60
  const rr = ev.RRULE ? ev.RRULE.val : ''
  const freq = (rr.match(/FREQ=(\w+)/) || [])[1]
  const by = (rr.match(/BYDAY=([\w,]+)/) || [1, ''])[1].split(',').filter(Boolean)
  const repeat = freq === 'DAILY' ? 'daily'
    : freq === 'WEEKLY' ? (by.length === 5 && !by.includes('SA') && !by.includes('SU') ? 'weekdays' : 'weekly') : 'none'
  const tr = ev.trigger && ev.trigger.match(/^-PT(\d+)([MH])$/)
  const mins = tr ? +tr[1] * (tr[2] === 'H' ? 60 : 1) : null
  const uid = ev.UID.val
  return newTask({
    id: uid.endsWith('@dayplanner') ? uid.slice(0, -11) : uid,
    title: unesc(ev.SUMMARY.val), date: s.date,
    start: s.allDay ? null : `${pad(Math.floor(s.min / 60))}:${pad(s.min % 60)}`,
    duration, repeat, notes: ev.DESCRIPTION ? unesc(ev.DESCRIPTION.val) : '',
    reminder: [5, 10, 30, 60].includes(mins) ? mins : null
  })
}

export function parseICS(text) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const out = []; let ev = null, alarm = false
  for (const l of lines) {
    if (l === 'BEGIN:VEVENT') { ev = {}; continue }
    if (l === 'END:VEVENT') { if (ev) out.push(eventToTask(ev)); ev = null; continue }
    if (!ev) continue
    if (l === 'BEGIN:VALARM') { alarm = true; continue }
    if (l === 'END:VALARM') { alarm = false; continue }
    const i = l.indexOf(':'); if (i < 0) continue
    const key = l.slice(0, i).split(';')[0].toUpperCase(), val = l.slice(i + 1)
    if (alarm) { if (key === 'TRIGGER' && !ev.trigger) ev.trigger = val; continue }
    if (!(key in ev)) ev[key] = { val }
  }
  return out.filter(Boolean)
}

// Merge: dedupe by UID (= task id); existing tasks are left untouched.
export async function importICS(text) {
  const tasks = parseICS(text)
  let n = 0
  await db.transaction('rw', db.tasks, async () => {
    for (const t of tasks) if (!(await db.tasks.get(t.id))) { await db.tasks.put(t); n++ }
  })
  return n
}
