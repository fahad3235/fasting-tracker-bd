'use strict';
var assert = require('assert');
var L = require('../js/logic.js');
var passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('PASS ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + ' — ' + e.message); }
}
var TODAY = '2026-10-31';
function e(date, type, status) { return { date: date, type: type, status: status, note: '' }; }

check('qada: 3 missed Ramadan + 1 made-up = owed 2', function () {
  var entries = [e('2026-03-01', 'Ramadan', 'Missed'), e('2026-03-02', 'Ramadan', 'Missed'), e('2026-03-03', 'Ramadan', 'Missed')];
  assert.strictEqual(L.computeQada(entries, 1), 2);
});
check('qada: made-up beyond missed floors at 0', function () {
  var entries = [e('2026-03-01', 'Ramadan', 'Missed')];
  assert.strictEqual(L.computeQada(entries, 5), 0);
  assert.strictEqual(L.undoMakeUp(0), 0);
});
check('qada: missed Monday fast does not change owed', function () {
  var entries = [e('2026-03-01', 'Ramadan', 'Missed'), e('2026-10-26', 'Monday', 'Missed')];
  assert.strictEqual(L.computeQada(entries, 0), 1);
  assert.strictEqual(L.computeQada(entries, 1), 0);
});
check('future date rejected', function () {
  var r = L.addEntry([], e('2026-11-01', 'Ramadan', 'Kept'), TODAY);
  assert.strictEqual(r.ok, false); assert.ok(r.errors.indexOf('future_date') !== -1);
});
check('duplicate date rejected', function () {
  var base = [e('2026-10-30', 'Ramadan', 'Kept')];
  var r = L.addEntry(base, e('2026-10-30', 'Monday', 'Kept'), TODAY);
  assert.strictEqual(r.ok, false); assert.ok(r.errors.indexOf('duplicate_date') !== -1);
});
check('bad status rejected', function () {
  assert.ok(L.validateEntry(e('2026-10-30', 'Ramadan', 'Half'), [], TODAY, null).indexOf('bad_status') !== -1);
});
check('bad type rejected', function () {
  assert.ok(L.validateEntry(e('2026-10-30', 'Eid', 'Kept'), [], TODAY, null).indexOf('bad_type') !== -1);
});
check('bad date rejected', function () {
  assert.ok(L.validateEntry(e('2026-02-30', 'Ramadan', 'Kept'), [], TODAY, null).indexOf('bad_date') !== -1);
});
check('note over 200 chars rejected', function () {
  var bad = e('2026-10-30', 'Ramadan', 'Kept'); bad.note = 'x'.repeat(201);
  assert.ok(L.validateEntry(bad, [], TODAY, null).indexOf('bad_note') !== -1);
});
check('dashboard fixture: 5 kept total, 2 kept this month', function () {
  var entries = [
    e('2026-10-05', 'Ramadan', 'Kept'), e('2026-10-12', 'Monday', 'Kept'),
    e('2026-09-01', 'Ramadan', 'Kept'), e('2026-08-10', 'Thursday', 'Kept'),
    e('2025-12-25', 'Voluntary', 'Kept'), e('2026-10-20', 'Ramadan', 'Missed')];
  var d = L.dashboard(entries, 0, TODAY);
  assert.strictEqual(d.totalKept, 5); assert.strictEqual(d.keptThisMonth, 2); assert.strictEqual(d.qadaOwed, 1);
});
check('Shawwal counter: 4 kept Shawwal-type in year = 4/6', function () {
  var entries = [e('2026-04-01', 'Shawwal 6', 'Kept'), e('2026-04-02', 'Shawwal 6', 'Kept'),
    e('2026-04-03', 'Shawwal 6', 'Kept'), e('2026-04-04', 'Shawwal 6', 'Kept'),
    e('2025-04-01', 'Shawwal 6', 'Kept'), e('2026-04-05', 'Shawwal 6', 'Missed')];
  var d = L.dashboard(entries, 0, TODAY);
  assert.strictEqual(d.shawwalKept, 4); assert.strictEqual(d.shawwalProgress, '4/6');
});
check('calendar: kept date maps to Kept status; shift month works', function () {
  var entries = [e('2026-10-30', 'Ramadan', 'Kept')];
  assert.strictEqual(L.statusForDate(entries, '2026-10-30'), 'Kept');
  assert.strictEqual(L.statusForDate(entries, '2026-10-29'), null);
  var cells = L.calendarCells(2026, 9);
  assert.ok(cells.indexOf('2026-10-30') !== -1);
  var nxt = L.shiftMonth(2026, 9, 1); assert.deepStrictEqual(nxt, { year: 2026, month: 10 });
  var prv = L.shiftMonth(2026, 0, -1); assert.deepStrictEqual(prv, { year: 2025, month: 11 });
});
check('edit entry: status/note change works, date unchanged', function () {
  var base = [e('2026-10-30', 'Ramadan', 'Kept')];
  var r = L.editEntry(base, '2026-10-30', { status: 'Missed', note: 'ill' }, TODAY);
  assert.strictEqual(r.ok, true); assert.strictEqual(r.entries[0].status, 'Missed'); assert.strictEqual(r.entries[0].note, 'ill');
});
check('export -> import round-trip restores data', function () {
  var entries = [e('2026-10-30', 'Ramadan', 'Kept'), e('2026-10-29', 'Monday', 'Missed')];
  var json = L.exportData(entries, 2);
  var r = L.importData(json);
  assert.strictEqual(r.ok, true); assert.deepStrictEqual(r.entries, entries); assert.strictEqual(r.madeUp, 2);
});
check('malformed import rejected', function () {
  assert.strictEqual(L.importData('{not json').ok, false);
});
check('wrong app import rejected', function () {
  assert.strictEqual(L.importData(JSON.stringify({ app: 'other-app', version: 1, entries: [], madeUp: 0 })).ok, false);
});
check('wrong version import rejected', function () {
  assert.strictEqual(L.importData(JSON.stringify({ app: 'fasting-tracker-bd', version: 2, entries: [], madeUp: 0 })).ok, false);
});
check('import with duplicate dates rejected', function () {
  var r = L.importData(JSON.stringify({ app: 'fasting-tracker-bd', version: 1, entries: [e('2026-10-30', 'Ramadan', 'Kept'), e('2026-10-30', 'Monday', 'Kept')], madeUp: 0 }));
  assert.strictEqual(r.ok, false); assert.strictEqual(r.error, 'duplicate_date');
});
check('import over 2000 entries rejected', function () {
  var big = []; for (var i = 0; i < 2001; i++) big.push(e('2020-01-01', 'Ramadan', 'Kept'));
  assert.strictEqual(L.importData(JSON.stringify({ app: 'fasting-tracker-bd', version: 1, entries: big, madeUp: 0 })).ok, false);
});
check('import with bad enum rejected', function () {
  var r = L.importData(JSON.stringify({ app: 'fasting-tracker-bd', version: 1, entries: [e('2026-10-30', 'Ramadan', 'Half')], madeUp: 0 }));
  assert.strictEqual(r.ok, false);
});
check('Bengali digits conversion', function () {
  assert.strictEqual(L.toBnDigits('2026-10-31'), '২০২৬-১০-৩১');
  assert.strictEqual(L.toBnDigits('4/6'), '৪/৬');
});
check('filter: type and status filters + newest first', function () {
  var entries = [e('2026-10-01', 'Monday', 'Kept'), e('2026-10-02', 'Ramadan', 'Missed'), e('2026-10-03', 'Monday', 'Missed')];
  var f = L.filterEntries(entries, 'Monday', 'All');
  assert.strictEqual(f.length, 2); assert.strictEqual(f[0].date, '2026-10-03');
  assert.strictEqual(L.filterEntries(entries, 'All', 'Missed').length, 2);
});
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
