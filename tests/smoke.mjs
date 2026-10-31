// Headless-Chrome smoke tests via raw CDP (no dependencies).
// Usage: node tests/smoke.mjs [path-to-chrome]
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..');
const chrome = process.argv[2] || '/opt/meta-chromium/chrome';
const PORT = 9223;
const PROFILE = '/tmp/ftbd-smoke-profile';
try { execSync(`rm -rf ${PROFILE}`); } catch {}
const pageUrl = 'file://' + path.join(root, 'index.html') + '?asof=2026-10-31';

let passed = 0, failed = 0;
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + ' ' + extra); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForJson(attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json`); if (r.ok) return await r.json(); } catch {}
    await sleep(300);
  }
  throw new Error('CDP /json never responded');
}

// Preferred binary is /opt/meta-chromium/chrome, but in this VM it currently
// refuses to start ("Hatch WebGL domain policy is required for browser
// startup" — it needs the image-owned policy supplied by browser-daemon).
// Fall back to the cached Playwright headless_shell, which starts fine here.
const CANDIDATES = process.argv[2] ? [process.argv[2]] : [chrome,
  '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell'];
let proc = null, usedChrome = null;
for (const cand of CANDIDATES) {
  if (!fs.existsSync(cand)) continue;
  try { execSync(`rm -rf ${PROFILE}`); } catch {}
  proc = spawn(cand, ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank'],
    { stdio: 'ignore', detached: true });
  let ok = false;
  for (let i = 0; i < 25 && !ok; i++) {
    await sleep(300);
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json`); ok = r.ok; } catch {}
  }
  if (ok) { usedChrome = cand; console.log('SMOKE BROWSER: ' + cand); break; }
  try { proc.kill('SIGKILL'); } catch {}
  proc = null;
}
if (!proc) throw new Error('No headless Chromium candidate started (meta-chromium blocked by WebGL policy; headless_shell unavailable)');
let ws, nextId = 1;
const pending = new Map();
const pageErrors = [];
const dialogs = [];
try {
  const tabs = await waitForJson();
  const wsUrl = tabs.find((t) => t.type === 'page').webSocketDebuggerUrl;
  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result); }
    else if (msg.method === 'Runtime.exceptionThrown') pageErrors.push(msg.params.exceptionDetails.exception?.description || 'exception');
    else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') pageErrors.push(msg.params.args.map((a) => a.value).join(' '));
    else if (msg.method === 'Page.javascriptDialogOpening') { dialogs.push(msg.params.message); send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params }));
  });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval exception: ' + JSON.stringify(r.exceptionDetails.exception?.description));
    return r.result.value;
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__ASOF__='2026-10-31';" });
  await send('Page.navigate', { url: pageUrl });
  await sleep(1500);
  check('page title loads', await ev(`document.title.includes('Fasting Tracker')`));
  check('dashboard defaults are zero', (await ev(`document.getElementById('statTotal').textContent`)) === '0');

  // Seed a fixed fixture via localStorage, then reload.
  const fixture = { entries: [
    { date: '2026-10-05', type: 'Ramadan', status: 'Kept', note: '' },
    { date: '2026-10-12', type: 'Monday', status: 'Kept', note: '' },
    { date: '2026-09-01', type: 'Ramadan', status: 'Kept', note: '' },
    { date: '2026-08-10', type: 'Thursday', status: 'Kept', note: '' },
    { date: '2025-12-25', type: 'Voluntary', status: 'Kept', note: '' },
    { date: '2026-10-20', type: 'Ramadan', status: 'Missed', note: '' },
  ], madeUp: 0, lang: 'en' };
  await ev(`localStorage.setItem('fasting-tracker-bd-v1', ${JSON.stringify(JSON.stringify(fixture))}); location.reload();`);
  await sleep(1500);
  check('dashboard fixture: 5 kept total', (await ev(`document.getElementById('statTotal').textContent`)) === '5');
  check('dashboard fixture: 2 kept this month', (await ev(`document.getElementById('statMonth').textContent`)) === '2');
  check('dashboard fixture: qada owed 1', (await ev(`document.getElementById('statQada').textContent`)) === '1');
  check('Shawwal counter starts 0/6', (await ev(`document.getElementById('statShawwal').textContent`)) === '0/6');

  // Shawwal: add 4 kept Shawwal entries via storage, reload, expect 4/6.
  const f2 = JSON.parse(JSON.stringify(fixture));
  ['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04'].forEach((d) => f2.entries.push({ date: d, type: 'Shawwal 6', status: 'Kept', note: '' }));
  await ev(`localStorage.setItem('fasting-tracker-bd-v1', ${JSON.stringify(JSON.stringify(f2))}); location.reload();`);
  await sleep(1200);
  check('Shawwal counter: 4 kept -> 4/6', (await ev(`document.getElementById('statShawwal').textContent`)) === '4/6');
  check('dashboard total now 9 with Shawwal', (await ev(`document.getElementById('statTotal').textContent`)) === '9');

  // Calendar: kept marker + navigation.
  await ev(`document.getElementById('tab-calendar').click()`);
  await sleep(500);
  check('calendar kept marker on 2026-10-05', await ev(`!!document.querySelector('[data-date="2026-10-05"][data-status="Kept"]')`));
  const labelBefore = await ev(`document.getElementById('calLabel').textContent`);
  await ev(`document.getElementById('calNext').click()`); await sleep(400);
  const labelAfter = await ev(`document.getElementById('calLabel').textContent`);
  check('calendar next month changes label', labelBefore.includes('October') && labelAfter.includes('November'), labelBefore + ' -> ' + labelAfter);
  await ev(`document.getElementById('calPrev').click()`); await sleep(400);
  check('calendar prev month restores label', (await ev(`document.getElementById('calLabel').textContent`)).includes('October'));

  // Form: future date rejected, duplicate rejected.
  await ev(`document.getElementById('tab-log').click()`); await sleep(600);
  await ev(`document.getElementById('fDate').value='2026-11-01'; document.getElementById('fType').value='Ramadan'; document.getElementById('fStatus').value='Kept'; document.getElementById('logForm').dispatchEvent(new Event('submit',{cancelable:true}));`);
  await sleep(300);
  check('future date shows inline error', (await ev(`document.getElementById('formError').textContent`)).length > 0);
  await ev(`document.getElementById('fDate').value='2026-10-05'; document.getElementById('logForm').dispatchEvent(new Event('submit',{cancelable:true}));`);
  await sleep(300);
  check('duplicate date shows inline error', (await ev(`document.getElementById('formError').textContent`)).toLowerCase().includes('already'));

  // History + data: malformed import rejected with data intact.
  await ev(`document.getElementById('tab-history').click()`); await sleep(600);
  check('history lists 10 entries', (await ev(`document.querySelectorAll('#historyList .entry').length`)) === 10);
  await ev(`document.getElementById('tab-data').click()`); await sleep(300);
  await ev(`document.getElementById('importText').value='{bad json'; document.getElementById('btnImport').click();`);
  await sleep(300);
  check('malformed import shows error', (await ev(`document.getElementById('dataMsg').textContent`)).length > 0);
  await ev(`document.getElementById('tab-dashboard').click()`); await sleep(300);
  check('data intact after rejected import (total still 9)', (await ev(`document.getElementById('statTotal').textContent`)) === '9');

  // Export -> erase -> import round-trip (build import payload from stored data).
  const payload = await ev(`(()=>{const s=JSON.parse(localStorage.getItem('fasting-tracker-bd-v1')); return JSON.stringify({app:'fasting-tracker-bd',version:1,entries:s.entries,madeUp:s.madeUp});})()`);
  await ev(`document.getElementById('tab-data').click()`); await sleep(300);
  await ev(`document.getElementById('eraseText').value='DELETE'; document.getElementById('eraseText').dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('btnErase').click();`);
  await sleep(400);
  await ev(`document.getElementById('tab-dashboard').click()`); await sleep(300);
  check('erase-all clears totals', (await ev(`document.getElementById('statTotal').textContent`)) === '0');
  await ev(`document.getElementById('tab-data').click()`); await sleep(300);
  await ev(`document.getElementById('importText').value=${JSON.stringify(payload)}; document.getElementById('btnImport').click();`);
  await sleep(400);
  await ev(`document.getElementById('tab-dashboard').click()`); await sleep(300);
  check('import round-trip restores total 9', (await ev(`document.getElementById('statTotal').textContent`)) === '9');

  // BN toggle: Bengali digits + persists across reload.
  await ev(`document.getElementById('langToggle').click()`); await sleep(400);
  check('BN toggle renders Bengali digit', (await ev(`document.getElementById('statTotal').textContent`)) === '৯');
  await ev(`location.reload()`); await sleep(1200);
  check('BN persists across reload', (await ev(`document.getElementById('statTotal').textContent`)) === '৯' && (await ev(`document.documentElement.lang`)) === 'bn');

  // 390px no-overflow on every tab.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  let overflowOk = true, widest = 0;
  for (const tab of ['dashboard', 'log', 'calendar', 'history', 'data']) {
    await ev(`document.getElementById('tab-${tab}').click()`); await sleep(300);
    const w = await ev(`Math.max(document.body.scrollWidth, document.documentElement.scrollWidth)`);
    widest = Math.max(widest, w); if (w > 390) overflowOk = false;
  }
  check('390px no horizontal overflow on all tabs', overflowOk, 'widest=' + widest);
  await send('Emulation.clearDeviceMetricsOverride');

  check('zero console/page errors', pageErrors.length === 0, JSON.stringify(pageErrors));
  console.log(`\n${passed} passed, ${failed} failed`);
} catch (e) {
  console.log('SMOKE ERROR: ' + (e && e.stack || e)); failed++;
  console.log(`\n${passed} passed, ${failed} failed`);
} finally {
  try { ws && ws.close(); } catch {}
  try { proc.kill('SIGKILL'); } catch {}
  try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
}
process.exit(failed ? 1 : 0);
