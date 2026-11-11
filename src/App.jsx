import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, Ctx, getSettings, storageOk, toggleDone, isDone } from './db'
import { S } from './strings'
import { ymd, toMin, nowMin, occursOn } from './lib'
import Today from './Today'
import Week, { Plan } from './Week'
import Settings from './Settings'

async function notify(t, left) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const opts = { body: S.notif.startsIn(left), tag: t.id, icon: 'icon-192.png' }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    reg ? await reg.showNotification(t.title, opts) : new Notification(t.title, opts)
  } catch {}
}

// Checks IndexedDB every 30 s and on focus. Works only while the app is open.
function useReminders(tasks, setAlerts) {
  const ref = useRef(tasks); ref.current = tasks
  useEffect(() => {
    const check = async () => {
      try {
        const d = ymd(), now = nowMin(), ms = Date.now()
        for (const t of ref.current) {
          if (!t.start || t.reminder == null || !occursOn(t, d) || isDone(t, d)) continue
          const s = toMin(t.start)
          if (now < s - t.reminder || now >= s + t.duration) continue
          const key = `${t.id}|${d}`, row = await db.fired.get(key)
          if (row && !(row.state === 'snoozed' && ms >= row.until)) continue
          await db.fired.put({ key, state: 'fired' })
          const left = Math.max(0, s - now)
          notify(t, left)
          setAlerts((a) => (a.some((x) => x.key === key) ? a : [...a, { key, id: t.id, date: d, title: t.title, left }]))
        }
      } catch {}
    }
    const vis = () => document.visibilityState === 'visible' && check()
    check()
    const iv = setInterval(check, 30000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(iv); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', vis) }
  }, [setAlerts])
}

const NAV = [['/', S.nav.today], ['/week', S.nav.week], ['/find', S.nav.find], ['/settings', S.nav.settings]]

export default function App() {
  const settings = useLiveQuery(getSettings, [], null)
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const [day, setDay] = useState(ymd())
  const [alerts, setAlerts] = useState([])
  const [toastObj, setToast] = useState(null)
  const [warn, setWarn] = useState(false)
  const [dp, setDp] = useState(null)
  const [help, setHelp] = useState(false)
  const tt = useRef()

  const toast = useCallback((msg, undo) => {
    clearTimeout(tt.current); setToast({ msg, undo })
    tt.current = setTimeout(() => setToast(null), 6000)
  }, [])

  useReminders(tasks, setAlerts)

  useEffect(() => {
    storageOk().then((ok) => setWarn(!ok))
    navigator.storage?.persist?.()
    const w = () => setWarn(true)
    const bip = (e) => { e.preventDefault(); setDp(e) }
    window.addEventListener('dp-storage-error', w)
    window.addEventListener('beforeinstallprompt', bip)
    window.addEventListener('appinstalled', () => setDp(null))
    return () => { window.removeEventListener('dp-storage-error', w); window.removeEventListener('beforeinstallprompt', bip) }
  }, [])

  useEffect(() => { // theme, motion, boot screen
    if (!settings) return
    const dark = settings.theme !== 'light', r = document.documentElement
    r.classList.toggle('dark', dark)
    r.classList.toggle('reduce-motion', !!settings.reduceMotion)
    try { localStorage.setItem('dp-theme', settings.theme) } catch {}
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0b1020' : '#f8fafc')
    document.getElementById('boot')?.remove()
  }, [settings])

  const install = useMemo(() => ({
    standalone: matchMedia('(display-mode: standalone)').matches || !!navigator.standalone,
    ios: /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    run: async () => { if (dp) { dp.prompt(); await dp.userChoice; setDp(null) } else setHelp(true) }
  }), [dp])

  const drop = (a) => setAlerts((x) => x.filter((y) => y.key !== a.key))
  const act = {
    done: async (a) => { const t = await db.tasks.get(a.id); if (t && !isDone(t, a.date)) await toggleDone(t, a.date); drop(a) },
    snooze: async (a, m) => { await db.fired.put({ key: a.key, state: 'snoozed', until: Date.now() + m * 60000 }); drop(a) }
  }

  if (!settings) return null
  const ctx = { settings, tasks, day, setDay, toast, install }
  const link = ({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`

  return (
    <Ctx.Provider value={ctx}>
      <div className="mx-auto max-w-3xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">
        <header className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">{S.app}</h1>
          <nav className="hidden md:flex gap-1">{NAV.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'} className={link}>{l}</NavLink>)}</nav>
          {!install.standalone && <button className="btn" onClick={install.run}>{S.install.button}</button>}
        </header>
        {warn && <div role="alert" className="card mb-3 border-amber-500 text-sm">{S.storage.blocked}</div>}
        <main>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/week" element={<Week />} />
            <Route path="/find" element={<Plan />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Today />} />
          </Routes>
        </main>
      </div>

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 dark:border-line bg-white/95 dark:bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {NAV.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'} className={(s) => link(s) + ' text-center py-3'}>{l}</NavLink>)}
      </nav>

      <div className="fixed inset-x-2 top-2 z-50 mx-auto max-w-md space-y-2" aria-live="assertive">
        {alerts.map((a) => (
          <div key={a.key} role="alert" className="card border-indigo-400 shadow-lg">
            <p className="font-bold">{a.title}</p>
            <p className="muted">{S.notif.startsIn(a.left)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => act.done(a)}>{S.done}</button>
              <button className="btn" onClick={() => act.snooze(a, 5)}>{S.notif.snooze5}</button>
              <button className="btn" onClick={() => act.snooze(a, 10)}>{S.notif.snooze10}</button>
            </div>
          </div>
        ))}
      </div>

      {toastObj && (
        <div role="status" className="fixed inset-x-4 bottom-20 md:bottom-6 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
          <span>{toastObj.msg}</span>
          {toastObj.undo && <button className="font-bold underline" onClick={() => { toastObj.undo(); setToast(null) }}>{S.undo}</button>}
        </div>
      )}

      {help && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setHelp(false)}>
          <div role="dialog" aria-modal="true" className="card max-w-sm space-y-2" onClick={(e) => e.stopPropagation()}>
            {install.ios
              ? <><h2 className="font-bold">{S.install.iosTitle}</h2><ol className="list-decimal pl-5 text-sm">{S.install.iosSteps.map((s) => <li key={s}>{s}</li>)}</ol></>
              : <p className="text-sm">{S.install.other}</p>}
            <button className="btn" onClick={() => setHelp(false)}>{S.cancel}</button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
