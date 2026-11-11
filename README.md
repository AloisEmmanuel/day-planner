# Day Planner

A free, local-only daily schedule app. No account, no server, no tracking: tasks live in your browser's IndexedDB. Installs as an app on phone, tablet and desktop, and works offline.

## Features
- Today timeline with a current-time line, drag or long-press to move, done/delete with undo
- Quick add: type `Gym 18:00 1h daily`
- Find a free time, week view, routine templates
- Reminders while the app is open; `.ics` export/import (with repeats and alarms) for alerts when it is closed
- Add to Google Calendar / Outlook links, JSON backup and restore
- Dark mode by default, 12/24-hour time, reduced motion

## Stack
React 18, Vite, Tailwind CSS 3, Dexie (IndexedDB), vite-plugin-pwa, HashRouter.

## Develop
```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve the build
```

## Deploy
- **Vercel:** import this repo (framework Vite). No environment variables.
- **Android APK:** set the repository variable `APP_URL` to your Vercel URL, then run *Actions > Build Android APK*. The APK is published under *Releases* as `day-planner.apk`, and the in-app Settings page links to it.
- **Full-screen Android app:** paste the JSON from that run's summary into `public/.well-known/assetlinks.json` and push.
- **Stable APK signing:** add secrets `KEYSTORE_B64` (base64 of a `.keystore`, alias `android`) and `KEYSTORE_PASSWORD`.

## Limits
- Live two-way calendar sync is not possible without an account; use `.ics` files.
- Browsers cannot run reminders when the app is fully closed.

## Project layout
`src/` app code (`db.js` storage, `lib.js` parsing and scheduling, `ics.js` calendar files, views), `public/` icons and Android link file, `android/` APK build workspace (CI only).

## License
MIT
