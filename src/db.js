import Dexie from 'dexie'
import { ymd, addDays } from './lib'

export const db = new Dexie('dayplanner')
db.version(1).stores({ tasks: 'id,date,updated_at', settings: 'key', fired: 'key' })
// fired: { key: "id|date|start|offset", until?: ms }  (until = snoozed-to time)

export const DEFAULTS = {
  wake: '07:00', sleep: '23:00', reminder: 10, hour12: false,
  weekStart: 1, theme: 'dark', reduceMotion: false
}

// Report any storage failure to the UI instead of crashing.
export async function safe(fn) {
  try { return await fn() }
  catch (e) { window.dispatchEvent(new CustomEvent('dp-storage-error', { detail: e })); return null }
}

export async function storageOk() {
  try {
    await db.open()
    await db.settings.put({ key: '_probe', value: 1 })
    await db.settings.delete('_probe')
    return true
  } catch { return false }
}

export async function getSettings() {
  const rows = (await safe(() => db.settings.toArray())) || []
  return { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) }
}

export async function setSetting(k, v) {
  await safe(() => db.settings.put({ key: k, value: v }))
  if (k === 'theme') { try { localStorage.setItem('dp-theme', v) } catch {} } // read by index.html pre-paint
}

export const newTask = (o = {}) => ({
  id: crypto.randomUUID(), title: '', date: ymd(), start: null, duration: 30,
  category: 'General', color: '#6366f1', notes: '', priority: 1,
  repeat: 'none', reminder: null, done: false, doneOn: [], updated_at: Date.now(), ...o
})

export const saveTask = (t) => safe(() => db.tasks.put({ ...t, updated_at: Date.now() }))
export const removeTask = (id) => safe(() => db.tasks.delete(id))
export const restoreTask = (t) => safe(() => db.tasks.put(t))

// Repeating tasks track completion per date; one-off tasks use `done`.
export const isDone = (t, d) => (t.repeat === 'none' ? t.done : (t.doneOn || []).includes(d))
export function toggleDone(t, d) {
  if (t.repeat === 'none') return saveTask({ ...t, done: !t.done })
  const on = new Set(t.doneOn || [])
  on.has(d) ? on.delete(d) : on.add(d)
  return saveTask({ ...t, doneOn: [...on] })
}

// Consecutive days (ending today, or yesterday if today is empty) with >=1 done task.
export function streak(tasks, today = ymd()) {
  const days = new Set()
  for (const t of tasks) {
    if (t.repeat === 'none') t.done && days.add(t.date)
    else (t.doneOn || []).forEach((d) => days.add(d))
  }
  let d = days.has(today) ? today : addDays(today, -1), n = 0
  while (days.has(d)) { n++; d = addDays(d, -1) }
  return n
}

export async function exportJSON() {
  const [tasks, settings] = await Promise.all([db.tasks.toArray(), db.settings.toArray()])
  return JSON.stringify({ app: 'day-planner', v: 1, tasks, settings }, null, 2)
}

// Merge by id: newer updated_at wins, so repeat imports never duplicate.
export async function importJSON(text) {
  const data = JSON.parse(text)
  if (!Array.isArray(data.tasks)) throw new Error('bad file')
  let n = 0
  await db.transaction('rw', db.tasks, async () => {
    for (const t of data.tasks) {
      if (!t || !t.id || !t.title) continue
      const cur = await db.tasks.get(t.id)
      if (!cur || (t.updated_at || 0) > (cur.updated_at || 0)) { await db.tasks.put({ ...newTask(), ...t }); n++ }
    }
  })
  return n
}

// Shared app context (settings, tasks, day, toast, install)
import { createContext } from 'react'
export const Ctx = createContext(null)
