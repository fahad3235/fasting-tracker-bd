'use strict';
/* Pure logic for fasting-tracker-bd. No DOM, no localStorage, no network.
   Safe to require() in Node and to load in the browser. */
var APP_ID = 'fasting-tracker-bd';
var APP_VERSION = 1;
var TYPES = ['Ramadan', 'Shawwal 6', 'Monday', 'Thursday', 'Ayyamul Bidh', 'Ashura', 'Arafah', 'Voluntary', 'Other'];
var STATUSES = ['Kept', 'Missed', 'Excused'];
var MAX_ENTRIES = 2000;
var MAX_NOTE = 200;
var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBnDigits(value) {
  return String(value).replace(/[0-9]/g, function (d) { return BN_DIGITS[Number(d)]; });
}
function isValidDateString(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)), d = Number(s.slice(8, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  var dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
function todayString(d) {
  d = d || new Date();
  var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
/* String comparison works for YYYY-MM-DD dates. */
function isFutureDate(dateStr, todayStr) {
  return isValidDateString(dateStr) && isValidDateString(todayStr) && dateStr > todayStr;
}
/* Returns an array of error codes (empty = valid). editingDate: when editing,
   the entry's own date is not counted as a duplicate. */
function validateEntry(entry, existing, todayStr, editingDate) {
  var errors = [];
  if (!entry || typeof entry !== 'object') return ['invalid_entry'];
  if (!isValidDateString(entry.date)) errors.push('bad_date');
  else if (isFutureDate(entry.date, todayStr)) errors.push('future_date');
  if (TYPES.indexOf(entry.type) === -1) errors.push('bad_type');
  if (STATUSES.indexOf(entry.status) === -1) errors.push('bad_status');
  if (entry.note !== undefined && entry.note !== null && (typeof entry.note !== 'string' || entry.note.length > MAX_NOTE)) errors.push('bad_note');
  if (isValidDateString(entry.date) && Array.isArray(existing)) {
    var dup = existing.some(function (e) { return e.date === entry.date && e.date !== editingDate; });
    if (dup) errors.push('duplicate_date');
  }
  return errors;
}
function addEntry(entries, entry, todayStr) {
  var errors = validateEntry(entry, entries, todayStr, null);
  if (errors.length) return { ok: false, errors: errors, entries: entries };
  var next = entries.slice();
  next.push({ date: entry.date, type: entry.type, status: entry.status, note: entry.note || '' });
  return { ok: true, errors: [], entries: next };
}
function editEntry(entries, date, patch, todayStr) {
  var idx = entries.findIndex(function (e) { return e.date === date; });
  if (idx === -1) return { ok: false, errors: ['not_found'], entries: entries };
  var updated = { date: date, type: entries[idx].type, status: patch.status, note: patch.note === undefined ? entries[idx].note : patch.note };
  var errors = validateEntry(updated, entries, todayStr, date);
  if (errors.length) return { ok: false, errors: errors, entries: entries };
  var next = entries.slice();
  next[idx] = updated;
  return { ok: true, errors: [], entries: next };
}
function deleteEntry(entries, date) {
  return entries.filter(function (e) { return e.date !== date; });
}
function countMissedRamadan(entries) {
  return entries.filter(function (e) { return e.type === 'Ramadan' && e.status === 'Missed'; }).length;
}
/* Qada: only missed Ramadan fasts count. Missed non-Ramadan fasts do not. */
function computeQada(entries, madeUp) {
  var m = Math.max(0, Math.floor(Number(madeUp) || 0));
  return Math.max(0, countMissedRamadan(entries) - m);
}
function makeUpQada(madeUp) { return Math.max(0, Math.floor(Number(madeUp) || 0)) + 1; }
function undoMakeUp(madeUp) { return Math.max(0, Math.floor(Number(madeUp) || 0) - 1); }
function dashboard(entries, madeUp, todayStr) {
  var month = todayStr.slice(0, 7), year = todayStr.slice(0, 4);
  var kept = entries.filter(function (e) { return e.status === 'Kept'; });
  var shawwal = kept.filter(function (e) { return e.type === 'Shawwal 6' && e.date.slice(0, 4) === year; }).length;
  return {
    totalKept: kept.length,
    keptThisMonth: kept.filter(function (e) { return e.date.slice(0, 7) === month; }).length,
    qadaOwed: computeQada(entries, madeUp),
    madeUp: Math.max(0, Math.floor(Number(madeUp) || 0)),
    missedRamadan: countMissedRamadan(entries),
    shawwalKept: shawwal,
    shawwalProgress: shawwal + '/6'
  };
}
function filterEntries(entries, typeFilter, statusFilter) {
  var out = entries.slice().sort(function (a, b) { return b.date < a.date ? -1 : (b.date > a.date ? 1 : 0); });
  if (typeFilter && typeFilter !== 'All') out = out.filter(function (e) { return e.type === typeFilter; });
  if (statusFilter && statusFilter !== 'All') out = out.filter(function (e) { return e.status === statusFilter; });
  return out;
}
function statusForDate(entries, date) {
  var e = entries.filter(function (x) { return x.date === date; })[0];
  return e ? e.status : null;
}
function calendarCells(year, monthIndex) {
  /* monthIndex 0-11. Returns 7-col grid cells incl. leading/trailing blanks. */
  var first = new Date(year, monthIndex, 1);
  var startDow = first.getDay(); /* 0 = Sunday */
  var daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  var cells = [];
  for (var i = 0; i < startDow; i++) cells.push(null);
  for (var d = 1; d <= daysInMonth; d++) {
    cells.push(year + '-' + String(monthIndex + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function shiftMonth(year, monthIndex, delta) {
  var total = year * 12 + monthIndex + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}
function exportData(entries, madeUp) {
  return JSON.stringify({ app: APP_ID, version: APP_VERSION, entries: entries, madeUp: madeUp }, null, 2);
}
/* Strict import: any violation rejects the whole payload; caller keeps old data. */
function importData(jsonText) {
  var data;
  try { data = JSON.parse(jsonText); } catch (e) { return { ok: false, error: 'malformed_json' }; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'bad_shape' };
  if (data.app !== APP_ID) return { ok: false, error: 'wrong_app' };
  if (data.version !== APP_VERSION) return { ok: false, error: 'wrong_version' };
  if (!Array.isArray(data.entries)) return { ok: false, error: 'bad_entries' };
  if (data.entries.length > MAX_ENTRIES) return { ok: false, error: 'too_many_entries' };
  if (typeof data.madeUp !== 'number' || !Number.isInteger(data.madeUp) || data.madeUp < 0) return { ok: false, error: 'bad_made_up' };
  var seen = {};
  for (var i = 0; i < data.entries.length; i++) {
    var e = data.entries[i];
    if (!e || typeof e !== 'object') return { ok: false, error: 'bad_entry' };
    if (validateEntry(e, [], '9999-12-31', null).length) return { ok: false, error: 'bad_entry' };
    if (seen[e.date]) return { ok: false, error: 'duplicate_date' };
    seen[e.date] = true;
  }
  var clean = data.entries.map(function (e) { return { date: e.date, type: e.type, status: e.status, note: e.note || '' }; });
  return { ok: true, entries: clean, madeUp: data.madeUp };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APP_ID: APP_ID, APP_VERSION: APP_VERSION, TYPES: TYPES, STATUSES: STATUSES,
    MAX_ENTRIES: MAX_ENTRIES, MAX_NOTE: MAX_NOTE, toBnDigits: toBnDigits,
    isValidDateString: isValidDateString, todayString: todayString, isFutureDate: isFutureDate,
    validateEntry: validateEntry, addEntry: addEntry, editEntry: editEntry, deleteEntry: deleteEntry,
    countMissedRamadan: countMissedRamadan, computeQada: computeQada, makeUpQada: makeUpQada,
    undoMakeUp: undoMakeUp, dashboard: dashboard, filterEntries: filterEntries,
    statusForDate: statusForDate, calendarCells: calendarCells, shiftMonth: shiftMonth,
    exportData: exportData, importData: importData };
}
