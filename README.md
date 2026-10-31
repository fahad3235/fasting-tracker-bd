# Fasting Tracker BD

Offline, bilingual (English / বাংলা) fasting (roja) tracker for Bangladesh.
Vanilla HTML/CSS/JS — zero dependencies, zero network requests. All data
lives in the browser's `localStorage` and never leaves the device.

## Problem

People who fast — in Ramadan, on Mondays and Thursdays, the six fasts of
Shawwal, and other voluntary fasts — often lose track of which fasts they
kept, which they missed, and how many Ramadan fasts they still owe (qada).
Existing trackers tend to need accounts, show ads, or bundle prayer times
and religious rulings this app deliberately does not provide.

## Features

1. **Fast log** — date (YYYY-MM-DD, future dates rejected), type
   (Ramadan, Shawwal 6, Monday, Thursday, Ayyamul Bidh, Ashura, Arafah,
   Voluntary, Other), status (Kept / Missed / Excused), optional note
   (max 200 characters). One entry per date; a second entry for the same
   date shows an inline error.
2. **Inline editing** — in History, Edit lets you change an entry's status
   and note (the date and type stay fixed, so the one-entry-per-date rule
   can never be broken by an edit). Delete asks for confirmation first.
3. **Qada tracker** — owed = (missed Ramadan fasts) − (fasts marked
   made up), floored at 0. Buttons: "Made up one qada fast" and
   "Undo last made-up" (also floored at 0). **Missed non-Ramadan fasts
   do NOT count toward qada.**
4. **Dashboard** — total fasts kept, fasts kept this month, qada owed,
   and Shawwal-6 progress as a simple counter: kept "Shawwal 6" entries
   in the current calendar year, shown as n/6. This is a personal
   counter, not a religious ruling (see Limitations).
5. **Month calendar** — current-month grid with prev/next navigation.
   Each logged day shows a dot/badge: green = kept, red = missed,
   grey = excused. Clicking a marked day jumps to that entry in History
   and highlights it.
6. **History** — newest first, with type and status filters and an
   empty state when nothing is logged yet.
7. **Data tab** — JSON export (download), JSON import with strict
   validation, and erase-all that requires typing `DELETE` exactly.
   A rejected import leaves existing data untouched.
8. **Bilingual UI** — English / বাংলা toggle, persisted in
   `localStorage`. In বাংলা mode, numbers render in Bengali digits
   (০–৯). Every UI string exists in both languages.
9. **Responsive & accessible** — no horizontal overflow at 390px width;
   labels on all inputs; buttons carry text.

## Stack

- HTML + CSS + vanilla JavaScript, no build step, no dependencies.
- `js/logic.js` — pure logic (validation, qada math, dashboard,
  calendar grid, import/export validation). It has a
  `module.exports` guard, so the same file runs under Node for tests.
- `js/app.js` — DOM rendering, i18n, and `localStorage` wiring only.
- Tests: Node's built-in `assert` (unit) and raw Chrome DevTools
  Protocol over WebSocket (smoke). No test dependencies.

## Run

Open `index.html` in any modern browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

For testing with a pinned "today" (used by the smoke tests), add
`?asof=YYYY-MM-DD` to the URL. The app also honours
`window.__ASOF__` when set before the page loads.

## Testing

```bash
node tests/unit.test.js   # pure-logic tests, no browser needed
node tests/smoke.mjs      # headless-Chrome UI checks via raw CDP
```

`smoke.mjs` prefers `/opt/meta-chromium/chrome` and falls back to the
cached Playwright `headless_shell` binary when that binary cannot start
(in this VM the Meta build currently refuses to start, reporting that
the image-owned WebGL domain policy supplied by browser-daemon is
required). The fallback is a real Chromium engine over the same CDP
protocol, and the fallback choice is printed at the top of its output.

See [TEST_RESULTS.md](TEST_RESULTS.md) for the hand-verified scenario
and the exact test counts.

## Import format (strict)

```json
{"app": "fasting-tracker-bd", "version": 1, "entries": [], "madeUp": 0}
```

An import is rejected — with existing data kept intact — if the JSON is
malformed, `app` is not `fasting-tracker-bd`, `version` is not `1`,
any entry has a bad date, bad type, bad status, or a note over 200
characters, any date repeats, `madeUp` is not a non-negative integer,
or there are more than 2000 entries.

## Limitations

- **Personal tracker only — not a religious authority.** Qada and
  Shawwal counting here is a simple personal counter, not a religious
  ruling. For religious questions, consult a scholar.
- **No prayer times, no Hijri calendar, no scholarly rulings** are
  included or invented. The Shawwal counter is Hijri-agnostic by design:
  it just counts "Shawwal 6" entries in the current calendar year.
- Data lives only in one browser's `localStorage`. Clearing browser
  data deletes it; use Export to back it up. There is no sync, no
  account, and no recovery.
- One entry per date: you cannot log two fasts on the same day.

## Status

Complete MVP, tested (see TEST_RESULTS.md). Ready to publish as a
static site (e.g. GitHub Pages); no server component exists.
