// All UI text lives here.
export const S = {
  app: 'Day Planner',
  nav: { today: 'Today', week: 'Week', find: 'Find a time', settings: 'Settings' },
  today: 'Today',
  unscheduled: 'Unscheduled',
  emptyDay: 'Nothing planned. Add a task above.',
  quickPlaceholder: 'Gym 18:00 1h daily',
  quickHint: 'Try: "Call mum tomorrow 9am 15m" or "Report 14:00 2h !!"',
  add: 'Add', save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
  done: 'Done', undo: 'Undo', deleted: 'Task deleted', marked: 'Marked done',
  fields: {
    title: 'Title', date: 'Date', start: 'Start time', duration: 'Duration (min)',
    category: 'Category', color: 'Color', notes: 'Notes', priority: 'Priority',
    repeat: 'Repeat', reminder: 'Reminder'
  },
  priority: ['Low', 'Normal', 'High'],
  repeat: { none: 'Does not repeat', daily: 'Every day', weekdays: 'Weekdays', weekly: 'Every week' },
  reminder: { none: 'No reminder', 5: '5 min before', 10: '10 min before', 30: '30 min before', 60: '1 hour before' },
  categories: ['General', 'Work', 'Health', 'Home', 'Study', 'Social'],
  overlap: 'This overlaps with another task. You can keep it, or move it.',
  summary: { title: 'Today at a glance', planned: 'Planned', done: 'Done', hours: 'Hours planned', streak: 'Day streak' },
  find: {
    title: 'Find a time', length: 'Task length (minutes)', day: 'Day',
    go: 'Show free slots', none: 'No free slot fits inside your waking hours that day.',
    use: 'Plan here'
  },
  week: { title: 'This week' },
  templates: {
    title: 'Routines', apply: 'Add routine', added: 'Routine added',
    list: {
      Morning: [['Wake up & stretch', '07:00', 15], ['Breakfast', '07:30', 30], ['Plan the day', '08:00', 15]],
      'Work day': [['Deep work', '09:00', 120], ['Lunch', '12:30', 45], ['Emails & admin', '14:00', 60], ['Wrap up', '17:00', 30]]
    }
  },
  settings: {
    title: 'Settings', wake: 'Wake time', sleep: 'Sleep time', reminder: 'Default reminder',
    hour12: '12-hour time', weekStart: 'Week starts on', days: ['Sunday', 'Monday', 'Saturday'],
    dark: 'Dark mode', reduceMotion: 'Reduce motion',
    data: 'Your data', exportJson: 'Export backup (JSON)', importJson: 'Import backup (JSON)',
    importDone: 'Imported. Existing tasks were merged by id.', importFail: 'That file could not be read.'
  },
  cal: {
    title: 'Calendar', addOne: 'Add to calendar (.ics)', google: 'Add to Google Calendar',
    outlook: 'Add to Outlook', exportDay: 'Export day', exportWeek: 'Export week', exportAll: 'Export all',
    importIcs: 'Import .ics', imported: (n) => `Imported ${n} new event(s).`,
    honest:
      'Live two-way sync needs an account and a server, and this app has neither. ' +
      'Instead, export or import .ics files. They work with Apple, Google and Outlook calendars, ' +
      'and the alarms inside them fire even when this app is closed.',
    outlookNote: 'Outlook links do not carry repeat rules. Use .ics for repeating tasks.'
  },
  notif: {
    title: 'Reminders', why:
      'Allow notifications so the app can alert you before tasks start. ' +
      'Nothing leaves your device.',
    enable: 'Allow notifications', denied: 'Notifications are blocked. Enable them in your browser settings.',
    unsupported: 'This browser does not support notifications.',
    closedNote:
      'Browsers cannot run reminders when the app is fully closed. ' +
      'Add tasks to your calendar as .ics so your phone alerts you anyway.',
    snooze5: 'Snooze 5 min', snooze10: 'Snooze 10 min', startsIn: (m) => (m ? `Starts in ${m} min` : 'Starting now')
  },
  install: {
    button: 'Install app', iosTitle: 'Install on iPhone or iPad',
    iosSteps: ['Open this page in Safari.', 'Tap Share.', 'Choose "Add to Home Screen".', 'Tap Add.'],
    installed: 'Installed',
    other: 'Open your browser menu and choose "Install app" or "Add to Home Screen".'
  },
  android: {
    title: 'Android app',
    download: 'Download Android APK',
    note: 'Open the downloaded file on your phone and allow installs from this source. The app loads this site, so updates arrive automatically.'
  },
  storage: {
    blocked:
      'Storage is blocked or this is a private window. Tasks will not be saved. ' +
      'Open the app in a normal window and allow site data.'
  }
}
