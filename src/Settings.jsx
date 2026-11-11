import { useContext, useState } from 'react'
import { Ctx, setSetting, exportJSON, importJSON } from './db'
import { S } from './strings'
import { REM } from './lib'
import { download, exportICS, importICS } from './ics'

export function NotifCard({ full }) {
  const [p, setP] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'))
  if (!full && p !== 'default') return null
  return (
    <section className="card space-y-2">
      <h2 className="font-bold">{S.notif.title}</h2>
      <p className="muted">{p === 'unsupported' ? S.notif.unsupported : p === 'denied' ? S.notif.denied : S.notif.why}</p>
      {p === 'default' && <button className="btn btn-primary" onClick={async () => setP(await Notification.requestPermission())}>{S.notif.enable}</button>}
      <p className="muted">{S.notif.closedNote}</p>
    </section>
  )
}

const Row = ({ l, children }) => <label className="flex items-center justify-between gap-3 py-1.5 text-sm"><span>{l}</span>{children}</label>

const APK = __APK_URL__

export default function Settings() {
  const { settings: st, tasks, day, toast, install } = useContext(Ctx)
  const set = (k, v) => setSetting(k, v)
  const readFile = (fn) => async (e) => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    try { await fn(await f.text()) } catch { toast(S.settings.importFail) }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{S.settings.title}</h2>
      <section className="card">
        <Row l={S.settings.wake}><input type="time" className="input !w-auto" value={st.wake} onChange={(e) => e.target.value && set('wake', e.target.value)} /></Row>
        <Row l={S.settings.sleep}><input type="time" className="input !w-auto" value={st.sleep} onChange={(e) => e.target.value && set('sleep', e.target.value)} /></Row>
        <Row l={S.settings.reminder}>
          <select className="input !w-auto" value={st.reminder ?? 'none'} onChange={(e) => set('reminder', e.target.value === 'none' ? null : +e.target.value)}>
            {REM.map((r) => <option key={r ?? 'none'} value={r ?? 'none'}>{S.reminder[r ?? 'none']}</option>)}
          </select>
        </Row>
        <Row l={S.settings.weekStart}>
          <select className="input !w-auto" value={st.weekStart} onChange={(e) => set('weekStart', +e.target.value)}>
            {[0, 1, 6].map((v, i) => <option key={v} value={v}>{S.settings.days[i]}</option>)}
          </select>
        </Row>
        <Row l={S.settings.hour12}><input type="checkbox" className="h-5 w-5" checked={st.hour12} onChange={(e) => set('hour12', e.target.checked)} /></Row>
        <Row l={S.settings.dark}><input type="checkbox" className="h-5 w-5" checked={st.theme !== 'light'} onChange={(e) => set('theme', e.target.checked ? 'dark' : 'light')} /></Row>
        <Row l={S.settings.reduceMotion}><input type="checkbox" className="h-5 w-5" checked={st.reduceMotion} onChange={(e) => set('reduceMotion', e.target.checked)} /></Row>
      </section>

      <NotifCard full />

      <section className="card space-y-3">
        <h2 className="font-bold">{S.cal.title}</h2>
        <p className="muted">{S.cal.honest}</p>
        <div className="flex flex-wrap gap-2">
          {['day', 'week', 'all'].map((k) => (
            <button key={k} className="btn" onClick={() => exportICS(k, tasks, day, st.weekStart)}>{S.cal['export' + k[0].toUpperCase() + k.slice(1)]}</button>
          ))}
          <label className="btn cursor-pointer">{S.cal.importIcs}
            <input type="file" accept=".ics,text/calendar" className="sr-only" onChange={readFile(async (t) => toast(S.cal.imported(await importICS(t))))} />
          </label>
        </div>
        <p className="muted">{S.cal.outlookNote}</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">{S.settings.data}</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={async () => download('day-planner-backup.json', await exportJSON(), 'application/json')}>{S.settings.exportJson}</button>
          <label className="btn cursor-pointer">{S.settings.importJson}
            <input type="file" accept=".json,application/json" className="sr-only" onChange={readFile(async (t) => { await importJSON(t); toast(S.settings.importDone) })} />
          </label>
        </div>
      </section>

      {APK && !install.standalone && (
        <section className="card space-y-2">
          <h2 className="font-bold">{S.android.title}</h2>
          <a className="btn btn-primary inline-block" href={APK}>{S.android.download}</a>
          <p className="muted">{S.android.note}</p>
        </section>
      )}

      {!install.standalone && (
        <section className="card space-y-2">
          <button className="btn btn-primary" onClick={install.run}>{S.install.button}</button>
          {install.ios && <ol className="list-decimal pl-5 text-sm">{S.install.iosSteps.map((s) => <li key={s}>{s}</li>)}</ol>}
        </section>
      )}
    </div>
  )
}
