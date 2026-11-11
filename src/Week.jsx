import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ctx, newTask, saveTask, isDone } from './db'
import { S } from './strings'
import { ymd, addDays, parseYmd, toMin, fmtTime, weekStartOf, occursOn, freeSlots, nowMin } from './lib'
import { Editor } from './Today'

export default function Week() {
  const { settings: st, tasks, day, setDay } = useContext(Ctx)
  const nav = useNavigate()
  const start = weekStartOf(day, st.weekStart)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className="btn" aria-label="Previous week" onClick={() => setDay(addDays(day, -7))}>‹</button>
        <h2 className="flex-1 text-center text-xl font-bold">{S.week.title}</h2>
        <button className="btn" aria-label="Next week" onClick={() => setDay(addDays(day, 7))}>›</button>
      </div>
      {days.map((d) => {
        const list = tasks.filter((t) => occursOn(t, d)).sort((a, b) => toMin(a.start || '00:00') - toMin(b.start || '00:00'))
        return (
          <section key={d} className={`card ${d === ymd() ? 'border-indigo-400' : ''}`}>
            <button className="mb-1 font-bold" onClick={() => { setDay(d); nav('/') }}>
              {parseYmd(d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
            </button>
            {list.length === 0 && <p className="muted">—</p>}
            {list.map((t) => (
              <div key={t.id} className={`flex items-center gap-2 py-0.5 text-sm ${isDone(t, d) ? 'line-through opacity-50' : ''}`}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
                <span className="muted w-20 shrink-0">{t.start ? fmtTime(t.start, st.hour12) : S.unscheduled}</span>
                <span className="truncate">{t.title}</span>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

// Find a time + routine templates
export function Plan() {
  const { settings: st, tasks, toast } = useContext(Ctx)
  const [len, setLen] = useState(30)
  const [d, setD] = useState(ymd())
  const [slots, setSlots] = useState(null)
  const [edit, setEdit] = useState(null)
  const L = Math.max(5, +len || 30)

  const go = () => setSlots(freeSlots(tasks.filter((t) => occursOn(t, d)), L, st.wake, st.sleep, { from: d === ymd() ? nowMin() : 0 }))
  const apply = async (items) => {
    for (const [title, start, duration] of items) await saveTask(newTask({ title, date: d, start, duration, reminder: st.reminder }))
    toast(S.templates.added)
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <h2 className="text-xl font-bold">{S.find.title}</h2>
        <div className="grid grid-cols-2 gap-2">
          <label><span className="muted">{S.find.length}</span><input type="number" min="5" step="5" className="input" value={len} onChange={(e) => setLen(e.target.value)} /></label>
          <label><span className="muted">{S.find.day}</span><input type="date" className="input" value={d} onChange={(e) => e.target.value && setD(e.target.value)} /></label>
        </div>
        <button className="btn btn-primary" onClick={go}>{S.find.go}</button>
        {slots && slots.length === 0 && <p className="muted">{S.find.none}</p>}
        {slots && slots.map((s) => (
          <div key={s} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-line">
            <span className="font-medium">{fmtTime(s, st.hour12)}</span>
            <button className="btn" onClick={() => setEdit(newTask({ date: d, start: s, duration: L, reminder: st.reminder }))}>{S.find.use}</button>
          </div>
        ))}
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">{S.templates.title}</h2>
        <p className="muted">{S.find.day}: {d}</p>
        {Object.entries(S.templates.list).map(([name, items]) => (
          <div key={name} className="flex items-center justify-between gap-2">
            <div><div className="font-medium">{name}</div><div className="muted">{items.map((i) => i[0]).join(', ')}</div></div>
            <button className="btn shrink-0" onClick={() => apply(items)}>{S.templates.apply}</button>
          </div>
        ))}
      </section>

      {edit && <Editor task={edit} onClose={() => { setEdit(null); setSlots(null) }} />}
    </div>
  )
}
