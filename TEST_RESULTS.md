# TEST_RESULTS — fasting-tracker-bd

Run date: 2026-10-31 (Asia/Dhaka). "Today" pinned to 2026-10-31 in smoke
tests via `?asof=2026-10-31` and `window.__ASOF__`.

## Automated results

- **Unit tests: 22/22 passed** — `node tests/unit.test.js`
  (pure logic in `js/logic.js`, Node built-in `assert`, zero deps).
- **Smoke tests: 22/22 passed** — `node tests/smoke.mjs`
  (headless Chromium UI checks via raw CDP, zero deps).
  - First smoke run after the dialog-handler fix: 20/22 — the
    future-date and history-count checks failed once, then passed on
    the immediate re-run with no code change, and passed again after
    two short waits were lengthened (300/400ms → 600ms). Judged a
    headless-shell warm-up timing flake, not an app bug: the same
    future-date rejection was reproduced in isolation, and the
    re-runs are stable (22/22 twice in a row).
  - One repair cycle was used in the smoke harness: an upfront
    `Page.handleJavaScriptDialog` call errored ("No dialog is showing")
    and was replaced with a dialog handler that answers only when a
    dialog actually opens.
  - Browser note: `/opt/meta-chromium/chrome` would not start in this
    VM ("Hatch WebGL domain policy is required for browser startup");
    the smoke script therefore fell back to the cached Playwright
    `headless_shell-1187` Chromium over the same CDP protocol. The
    fallback is printed at the top of smoke output. The app itself
    needs no browser feature beyond standard DOM APIs.

## Hand-verified scenario (exact numbers, via the real logic)

Seed (10 entries) + 1 made-up fast, evaluated at today = 2026-10-31:

| Entry | Type | Status |
|---|---|---|
| 2026-03-02, 2026-03-03, 2026-03-04 | Ramadan | Missed (×3) |
| 2026-10-26 | Monday | Missed (×1) |
| 2026-10-05 | Ramadan | Kept |
| 2026-10-12 | Monday | Kept |
| 2026-04-01 … 2026-04-04 | Shawwal 6 | Kept (×4) |

Dashboard result (verified by running `js/logic.js`):

- **Total fasts kept: 6** (2 in October + 4 Shawwal)
- **Kept this month (Oct 2026): 2**
- **Missed Ramadan: 3; made up: 1 → Qada owed: 2**
- **Missed Monday fast does NOT change qada** (owed stays 2, not 3)
- **Shawwal progress: 4/6**
- Future date `2026-11-02` → rejected with `future_date`
- Second entry for `2026-10-05` → rejected with `duplicate_date`
- Export → import round-trip: accepted, data restored exactly

The same fixture shapes are asserted in the smoke tests in the browser:
5 kept total / 2 kept this month / qada owed 1 (6-entry fixture without
Shawwal), then 4/6 Shawwal and total 9 after adding the 4 Shawwal
entries; export → erase (totals 0) → import restores total 9;
বাংলা toggle shows `৯` for 9 and survives a reload; 390px viewport
shows no horizontal overflow on any of the 5 tabs; zero console/page
errors throughout.

## Coverage checklist (all required cases)

- [x] Qada: 3 missed Ramadan + 1 made-up = 2; over-make-up floors at 0;
      missed Monday does not count
- [x] Future date rejected; duplicate date rejected; bad status/type
      rejected (plus bad date and >200-char note)
- [x] Dashboard fixture renders exact numbers (5 total / 2 this month
      in smoke; 6 total / 2 this month in the hand scenario above)
- [x] Shawwal counter: 4 kept → "4/6"
- [x] Calendar kept marker on a logged date; prev/next change the
      month label (October ↔ November 2026)
- [x] Export → erase → import round-trip restores data; malformed
      import rejected with data intact
- [x] BN toggle renders Bengali digits and persists across reload;
      390px no-overflow on all tabs
- [x] Zero console/page errors in smoke

## Known limitations (not failures)

- No prayer times, Hijri dates, or religious rulings are included —
  by design (see README Limitations).
- Smoke tests need a Chromium that can start in the current VM; the
  Meta Chromium binary is currently blocked by its WebGL-policy
  requirement, so the script uses the Playwright headless_shell
  fallback. If the Meta binary works in the publishing environment,
  `node tests/smoke.mjs /opt/meta-chromium/chrome` runs against it.
- No failures outstanding. Total source: ~58 KB across 6 files
  (index, CSS, 2 JS, 2 test files), under the ~90 KB single-push
  budget; README/.gitignore/TEST_RESULTS.md are extra docs.
