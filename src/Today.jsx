import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Ctx, db, newTask, saveTask, removeTask, restoreTask, toggleDone, isDone, streak } from './db'
import { S } from './strings'
import { ymd, addDays, parseYmd, toMin, toHM, fmtTime, endMin, occursOn, overlapping, parseQuick, nowMin, REM } from './lib'
import { toICS, download, googleUrl, outlookUrl } from './ics'
import { NotifCard } from './Settings'

const PPM = 0.9 // pixels per minute
const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#a855f7']
const F = ({ l, children }) => <label className="block"><span className="muted">{l}</span>{children}</label>

export function Editor({ task, onClose }) {
  const { tasks, toast } = useContext(Ctx)
  const [t, setT] = useState(task)
  const set = (k, v) => setT((x) => ({ ...x, [k]: v }))
  const exists = tasks.some((x) => x.id === task.id)
  const clash = overlapping(t, tasks.filter((x) => occursOn(x, t.date)))
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const save = async (e) => {
    e.preventDefault()
    if (!t.title.trim()) return
    await saveTask({ ...t, title: t.title.trim(), duration: Math.max(5, +t.duration || 30) })
    onClose()
  }
  const del = async () => { await removeTask(t.id); toast(S.deleted, () => restoreTask(t)); onClose() }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form role="dialog" aria-modal="true" aria-label={S.edit} onSubmit={save} className="card max-h-[92vh] w-full space-y-3 overflow-auto rounded-b-none sm:max-w-md sm:rounded-b-xl">
        <F l={S.fields.title}><input autoFocus className="input" value={t.title} onChange={(e) => set('title', e.target.value)} /></F>
        <div className="grid grid-cols-2 gap-2">
          <F l={S.fields.date}><input type="date" className="input" value={t.date} onChange={(e) => e.target.value && set('date', e.target.value)} /></F>
          <F l={S.fields.start}><input type="time" className="input" value={t.start || ''} onChange={(e) => set('start', e.target.value || null)} /></F>
          <F l={S.fields.duration}><input type="number" min="5" step="5" className="input" value={t.duration} onChange={(e) => set('duration', e.target.value)} /></F>
          <F l={S.fields.category}>
            <select className="input" value={t.category} onChange={(e) => set('category', e.target.value)}>{S.categories.map((c) => <option key={c}>{c}</option>)}</select>
          </F>
          <F l={S.fields.priority}>
            <select className="input" value={t.priority} onChange={(e) => set('priority', +e.target.value)}>{S.priority.map((p, i) => <option key={p} value={i}>{p}</option>)}</select>
          </F>
          <F l={S.fields.repeat}>
            <select className="input" value={t.repeat} onChange={(e) => set('repeat', e.target.value)}>{Object.entries(S.repeat).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </F>
        </div>
        <F l={S.fields.reminder}>
          <select className="input" value={t.reminder ?? 'none'} onChange={(e) => set('reminder', e.target.value === 'none' ? null : +e.target.value)}>
            {REM.map((r) => <option key={r ?? 'none'} value={r ?? 'none'}>{S.reminder[r ?? 'none']}</option>)}
          </select>
        </F>
        <div className="flex gap-2" role="radiogroup" aria-label={S.fields.color}>
          {COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={t.color === c} aria-label={c} onClick={() => set('color', c)}
              className={`h-7 w-7 rounded-full ${t.color === c ? 'ring-2 ring-offset-2 ring-indigo-400 dark:ring-offset-panel' : ''}`} style={{ background: c }} />
          ))}
        </div>
        <F l={S.fields.notes}><textarea rows="2" className="input" value={t.notes} onChange={(e) => set('notes', e.target.value)} /></F>
        {clash.length > 0 && <p role="status" className="rounded-lg bg-amber-500/15 p-2 text-sm text-amber-600 dark:text-amber-300">{S.overlap}</p>}
        <p className="muted">{S.notif.closedNote}</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" type="submit">{S.save}</button>
          <button className="btn" type="button" onClick={onClose}>{S.cancel}</button>
          {exists && <button className="btn text-red-500" type="button" onClick={del}>{S.delete}</button>}
        </div>
        {exists && (
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-line">
            <button className="btn" type="button" onClick={() => download(`${t.title || 'task'}.ics`, toICS([t]))}>{S.cal.addOne}</button>
            <a className="btn" href={googleUrl(t)} target="_blank" rel="noreferrer">{S.cal.google}</a>
            <a className="btn" href={outlookUrl(t)} target="_blank" rel="noreferrer">{S.cal.outlook}</a>
          </div>
        )}
      </form>
    </div>
  )
}

export default function Today() {
  const { settings: st, tasks, day, setDay, toast } = useContext(Ctx)
  const [edit, setEdit] = useState(null)
  const [q, setQ] = useState('')
  const [now, setNow] = useState(nowMin())
  const [drag, setDrag] = useState(null)
  const dragRef = useRef(null)
  const box = useRef(null)
  const today = ymd(), isToday = day === today

  useEffect(() => { const i = setInterval(() => setNow(nowMin()), 30000); return () => clearInterval(i) }, [])
  useEffect(() => { // block page scroll while dragging a task
    const el = box.current
    const h = (e) => dragRef.current?.active && e.preventDefault()
    el?.addEventListener('touchmove', h, { passive: false })
    return () => el?.removeEventListener('touchmove', h)
  })

  const list = useMemo(() => tasks.filter((t) => occursOn(t, day)), [tasks, day])
  const timed = useMemo(() => list.filter((t) => t.start).sort((a, b) => toMin(a.start) - toMin(b.start)), [list])
  const loose = list.filter((t) => !t.start)

  const from = Math.floor(Math.min(toMin(st.wake), ...timed.map((t) => toMin(t.start))) / 60) * 60
  const to = Math.max(from + 60, Math.min(1440, Math.ceil(Math.max(toMin(st.sleep), ...timed.map(endMin)) / 60) * 60))

  const laid = useMemo(() => { // side-by-side columns for overlapping tasks
    const out = []; let cols = [], cl = []
    const flush = () => { cl.forEach((x) => (x.n = cols.length)); cl = []; cols = [] }
    for (const t of timed) {
      const s = toMin(t.start), e = Math.max(endMin(t), s + 30)
      if (cols.every((x) => x <= s)) flush()
      let c = cols.findIndex((x) => x <= s)
      if (c < 0) { c = cols.length; cols.push(0) }
      cols[c] = e
      const it = { t, c, s, n: 1 }; cl.push(it); out.push(it)
    }
    flush()
    return out
  }, [timed])

  const add = async (e) => {
    e.preventDefault()
    const p = parseQuick(q, day)
    if (!p.title) return
    const t = newTask({ ...p, date: p.date || day, reminder: p.start ? st.reminder : null, color: COLORS[tasks.length % COLORS.length] })
    await saveTask(t); setQ('')
    if (overlapping(t, list).length) toast(S.overlap)
  }
  const flip = async (t) => {
    const was = isDone(t, day)
    await toggleDone(t, day)
    if (!was) toast(S.marked, async () => { const f = await db.tasks.get(t.id); f && toggleDone(f, day) })
  }
  const del = async (t) => { await removeTask(t.id); toast(S.deleted, () => restoreTask(t)) }

  // Long-press (touch) or drag (mouse) to move; tap to edit; Alt+Arrow moves 15 min.
  const down = (e, t) => {
    if (e.target.closest('[data-act]')) return
    const r = { id: t.id, y: e.clientY, start: toMin(t.start), min: toMin(t.start), pid: e.pointerId, el: e.currentTarget, active: false, moved: false }
    r.timer = setTimeout(() => { r.active = true; r.el.setPointerCapture?.(r.pid); setDrag({ id: r.id, min: r.start }); navigator.vibrate?.(15) }, 350)
    dragRef.current = r
  }
  const move = (e) => {
    const r = dragRef.current
    if (!r || e.pointerId !== r.pid) return
    const dy = e.clientY - r.y
    if (!r.active) {
      if (e.pointerType === 'mouse' && Math.abs(dy) > 4) { clearTimeout(r.timer); r.active = true; r.el.setPointerCapture?.(r.pid) }
      else { if (Math.abs(dy) > 8) { clearTimeout(r.timer); r.moved = true } return }
    }
    r.min = Math.max(0, Math.min(1410, Math.round((r.start + dy / PPM) / 5) * 5))
    setDrag({ id: r.id, min: r.min })
  }
  const up = async (t) => {
    const r = dragRef.current
    if (!r) return
    clearTimeout(r.timer); dragRef.current = null
    if (r.active) { setDrag(null); if (r.min !== r.start) await saveTask({ ...t, start: toHM(r.min) }) }
    else if (!r.moved) setEdit(t)
  }
  const cancel = () => { const r = dragRef.current; if (r) clearTimeout(r.timer); dragRef.current = null; setDrag(null) }
  const key = (e, t) => {
    if (e.key === 'Enter') setEdit(t)
    else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      const m = Math.max(0, Math.min(1410, toMin(t.start) + (e.key === 'ArrowUp' ? -15 : 15)))
      saveTask({ ...t, start: toHM(m) })
    }
  }

  const planned = list.length, doneN = list.filter((t) => isDone(t, day)).length
  const hours = (list.reduce((a, t) => a + t.duration, 0) / 60).toFixed(1)
  const label = isToday ? S.today : parseYmd(day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  const hoursMarks = Array.from({ length: (to - from) / 60 + 1 }, (_, i) => from + i * 60)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="btn" aria-label="Previous day" onClick={() => setDay(addDays(day, -1))}>‹</button>
        <h2 className="flex-1 text-center text-xl font-bold">{label}</h2>
        <button className="btn" aria-label="Next day" onClick={() => setDay(addDays(day, 1))}>›</button>
        {!isToday && <button className="btn" onClick={() => setDay(today)}>{S.today}</button>}
      </div>

      <section className="card grid grid-cols-4 gap-2 text-center" aria-label={S.summary.title}>
        {[[S.summary.planned, planned], [S.summary.done, doneN], [S.summary.hours, hours], [S.summary.streak, streak(tasks, today)]].map(([l, v]) => (
          <div key={l}><div className="text-xl font-bold">{v}</div><div className="muted !text-xs">{l}</div></div>
        ))}
      </section>

      <form onSubmit={add} className="flex gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={S.quickPlaceholder} aria-label={S.quickPlaceholder} />
        <button className="btn btn-primary" type="submit">{S.add}</button>
      </form>
      <p className="muted -mt-2">{S.quickHint}</p>

      <NotifCard />

      {list.length === 0 && <p className="muted">{S.emptyDay}</p>}

      <div ref={box} className="relative" style={{ height: (to - from) * PPM + 8 }}>
        {hoursMarks.map((m) => (
          <div key={m} className="absolute inset-x-0 border-t border-slate-200 dark:border-line" style={{ top: (m - from) * PPM }}>
            <span className="muted -mt-2.5 block w-12 bg-slate-50 pr-1 text-xs dark:bg-ink">{fmtTime(toHM(m), st.hour12)}</span>
          </div>
        ))}
        {isToday && now >= from && now <= to && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500" style={{ top: (now - from) * PPM }}>
            <span className="absolute -left-1 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
          </div>
        )}
        {laid.map(({ t, c, n }) => {
          const live = drag?.id === t.id ? drag.min : toMin(t.start), done = isDone(t, day)
          return (
            <div key={t.id} role="button" tabIndex={0} aria-label={`${t.title}, ${fmtTime(t.start, st.hour12)}`}
              onPointerDown={(e) => down(e, t)} onPointerMove={move} onPointerUp={() => up(t)} onPointerCancel={cancel}
              onContextMenu={(e) => e.preventDefault()} onKeyDown={(e) => key(e, t)}
              className={`absolute touch-pan-y select-none overflow-hidden rounded-md px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 ${done ? 'opacity-50' : ''} ${drag?.id === t.id ? 'z-10 ring-2 ring-indigo-400' : ''}`}
              style={{ top: (live - from) * PPM, height: Math.max(28, t.duration * PPM) - 2, left: `calc(3.25rem + (100% - 3.25rem) * ${c / n})`, width: `calc((100% - 3.25rem) / ${n} - 4px)`, background: t.color + '33', borderLeft: `4px solid ${t.color}` }}>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <div className={`truncate font-bold ${done ? 'line-through' : ''}`}>{t.title}</div>
                  <div className="muted !text-[11px]">{fmtTime(toHM(live), st.hour12)} · {t.duration}m</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button data-act aria-label={S.done} className="h-6 w-6 rounded bg-black/10 dark:bg-white/10" onClick={() => flip(t)}>✓</button>
                  <button data-act aria-label={S.delete} className="h-6 w-6 rounded bg-black/10 dark:bg-white/10" onClick={() => del(t)}>✕</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {loose.length > 0 && (
        <section className="card space-y-1">
          <h3 className="font-bold">{S.unscheduled}</h3>
          {loose.map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-1">
              <button aria-label={S.done} className="h-6 w-6 rounded border border-slate-400" style={{ background: isDone(t, day) ? t.color : 'transparent' }} onClick={() => flip(t)} />
              <button className={`flex-1 text-left ${isDone(t, day) ? 'line-through opacity-50' : ''}`} onClick={() => setEdit(t)}>{t.title}</button>
              <button aria-label={S.delete} className="btn !px-2 !py-1" onClick={() => del(t)}>✕</button>
            </div>
          ))}
        </section>
      )}

      {edit && <Editor task={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}
