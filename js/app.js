'use strict';
/* DOM / i18n / storage wiring. Pure rules live in js/logic.js. */
(function () {
  var KEY = 'fasting-tracker-bd-v1';
  function getToday() {
    if (typeof window !== 'undefined' && window.__ASOF__ && isValidDateString(window.__ASOF__)) return window.__ASOF__;
    try {
      var p = new URLSearchParams(window.location.search).get('asof');
      if (p && isValidDateString(p)) return p;
    } catch (e) {}
    return todayString(new Date());
  }
  var TODAY = getToday();
  var TYPE_BN = {'Ramadan':'রমজান','Shawwal 6':'শাওয়াল ৬','Monday':'সোমবার','Thursday':'বৃহস্পতিবার','Ayyamul Bidh':'আইয়ামুল বিদ','Ashura':'আশুরা','Arafah':'আরাফাহ','Voluntary':'নফল','Other':'অন্যান্য'};
  var STATUS_BN = {'Kept':'রাখা হয়েছে','Missed':'বাদ পড়েছে','Excused':'ওজর / ছাড়প্রাপ্ত'};
  var DOW_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var DOW_BN = ['রবি','সোম','মঙ্গল','বুধ','বৃহ','শুক্র','শনি'];
  var MONTH_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MONTH_BN = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  var I18N = {
    en: { title:'Fasting Tracker BD', tag:'Offline roja (fasting) tracker for Bangladesh', toggle:'বাংলা',
      tabs:{dashboard:'Dashboard',log:'Log a Fast',calendar:'Calendar',history:'History',data:'Data'},
      dash:'Dashboard', total:'Total fasts kept', month:'Kept this month', qada:'Qada owed', shawwal:'Shawwal 6 progress',
      qadaExplain:'Qada means a Ramadan fast that was missed and still needs to be made up. This is a simple personal counter: owed = missed Ramadan fasts minus fasts you have marked as made up (never below 0). Missed non-Ramadan fasts do not count toward qada.',
      madeUp:'Made up so far', btnMadeUp:'Made up one qada fast', btnUndo:'Undo last made-up',
      log:'Log a Fast', date:'Date', type:'Type', status:'Status', note:'Note (optional, max 200 characters)',
      save:'Save fast', clear:'Clear', editHint:'One entry per date. To change an entry, use Edit in History — you can change its status and note there.',
      cal:'Month Calendar', prev:'‹ Prev', next:'Next ›', legend:'Green = kept · Red = missed · Grey = excused. Click a marked day to see it in History.',
      hist:'History', filterType:'Type filter', filterStatus:'Status filter', all:'All', empty:'No fasts logged yet. Log your first fast above.',
      data:'Data — Export, Import, Erase', dataHint:'Everything is stored only in this browser (localStorage). No account, no network requests.',
      export:'Export JSON', importLbl:'Import JSON (paste a file exported from this app)', importBtn:'Import',
      eraseLbl:'Erase all data — type DELETE exactly to confirm', eraseBtn:'Erase all data',
      del:'Delete', edit:'Edit', saveEdit:'Save', cancel:'Cancel',
      footer:'Personal tracker only — not a religious authority. Qada and Shawwal counting here is a simple personal counter, not a religious ruling. For religious questions, please consult a scholar. Your data never leaves this device.',
      err:{future_date:'Future dates are not allowed.', duplicate_date:'An entry already exists for this date. Edit or delete the old one first.', bad_date:'Please enter a valid date (YYYY-MM-DD).', bad_type:'Please choose a valid type.', bad_status:'Please choose a valid status.', bad_note:'Note must be 200 characters or fewer.'},
      saved:'Fast saved.', updated:'Entry updated.', deleted:'Entry deleted.', imported:'Import successful.', erased:'All data erased.',
      importErr:{malformed_json:'Import rejected: malformed JSON. Your existing data is unchanged.', wrong_app:'Import rejected: this file is not from Fasting Tracker BD. Your existing data is unchanged.', wrong_version:'Import rejected: unsupported file version. Your existing data is unchanged.', bad_shape:'Import rejected: bad file format. Your existing data is unchanged.', bad_entries:'Import rejected: entries are invalid. Your existing data is unchanged.', too_many_entries:'Import rejected: more than 2000 entries. Your existing data is unchanged.', bad_made_up:'Import rejected: invalid made-up count. Your existing data is unchanged.', bad_entry:'Import rejected: an entry is invalid (bad date, type, status, or note). Your existing data is unchanged.', duplicate_date:'Import rejected: duplicate dates in file. Your existing data is unchanged.'},
      confirmDelete:'Delete the entry for this date?' },
    bn: { title:'ফাস্টিং ট্র্যাকার বিডি', tag:'বাংলাদেশের জন্য অফলাইন রোজা ট্র্যাকার', toggle:'English',
      tabs:{dashboard:'ড্যাশবোর্ড',log:'রোজা লগ করুন',calendar:'ক্যালেন্ডার',history:'ইতিহাস',data:'ডেটা'},
      dash:'ড্যাশবোর্ড', total:'মোট রাখা রোজা', month:'এই মাসে রাখা', qada:'কাজা বাকি', shawwal:'শাওয়াল ৬ অগ্রগতি',
      qadaExplain:'কাজা মানে রমজানের যে রোজা বাদ পড়েছে এবং পরে আদায় করতে হবে। এটি একটি সাধারণ ব্যক্তিগত কাউন্টার: বাকি = বাদ পড়া রমজান রোজা − আদায় করা রোজা (কখনো ০-এর নিচে নয়)। রমজান ছাড়া অন্য রোজা বাদ পড়লে তা কাজায় গণনা হয় না।',
      madeUp:'এ পর্যন্ত আদায়', btnMadeUp:'একটি কাজা রোজা আদায় করলাম', btnUndo:'শেষ আদায় বাতিল',
      log:'রোজা লগ করুন', date:'তারিখ', type:'ধরন', status:'অবস্থা', note:'মন্তব্য (ঐচ্ছিক, সর্বোচ্চ ২০০ অক্ষর)',
      save:'রোজা সংরক্ষণ করুন', clear:'মুছুন', editHint:'এক তারিখে একটি এন্ট্রি। পরিবর্তন করতে ইতিহাসে Edit ব্যবহার করুন — সেখানে অবস্থা ও মন্তব্য বদলাতে পারবেন।',
      cal:'মাসের ক্যালেন্ডার', prev:'‹ আগের', next:'পরের ›', legend:'সবুজ = রাখা হয়েছে · লাল = বাদ পড়েছে · ধূসর = ওজর / ছাড়প্রাপ্ত। চিহ্নিত দিনে ক্লিক করলে ইতিহাসে দেখা যাবে।',
      hist:'ইতিহাস', filterType:'ধরন ফিল্টার', filterStatus:'অবস্থা ফিল্টার', all:'সব', empty:'এখনো কোনো রোজা লগ করা হয়নি। উপরে প্রথম রোজা লগ করুন।',
      data:'ডেটা — এক্সপোর্ট, ইমপোর্ট, মুছে ফেলা', dataHint:'সবকিছু শুধু এই ব্রাউজারে (localStorage) সংরক্ষিত। কোনো অ্যাকাউন্ট নেই, কোনো নেটওয়ার্ক অনুরোধ নেই।',
      export:'JSON এক্সপোর্ট', importLbl:'JSON ইমপোর্ট (এই অ্যাপ থেকে এক্সপোর্ট করা ফাইল পেস্ট করুন)', importBtn:'ইমপোর্ট',
      eraseLbl:'সব ডেটা মুছুন — নিশ্চিত করতে ঠিক DELETE লিখুন', eraseBtn:'সব ডেটা মুছুন',
      del:'মুছুন', edit:'সম্পাদনা', saveEdit:'সংরক্ষণ', cancel:'বাতিল',
      footer:'শুধু ব্যক্তিগত ট্র্যাকার — এটি কোনো ধর্মীয় কর্তৃপক্ষ নয়। কাজা ও শাওয়াল গণনা এখানে একটি সাধারণ ব্যক্তিগত কাউন্টার, ধর্মীয় ফতোয়া নয়। ধর্মীয় প্রশ্নের জন্য আলেমের পরামর্শ নিন। আপনার ডেটা এই ডিভাইস ছাড়ে না।',
      err:{future_date:'ভবিষ্যতের তারিখ দেওয়া যাবে না।', duplicate_date:'এই তারিখে ইতিমধ্যে একটি এন্ট্রি আছে। আগে পুরোনোটি সম্পাদনা বা মুছুন।', bad_date:'সঠিক তারিখ দিন (YYYY-MM-DD)।', bad_type:'সঠিক ধরন বেছে নিন।', bad_status:'সঠিক অবস্থা বেছে নিন।', bad_note:'মন্তব্য ২০০ অক্ষরের বেশি হতে পারবে না।'},
      saved:'রোজা সংরক্ষিত হয়েছে।', updated:'এন্ট্রি আপডেট হয়েছে।', deleted:'এন্ট্রি মুছে ফেলা হয়েছে।', imported:'ইমপোর্ট সফল হয়েছে।', erased:'সব ডেটা মুছে ফেলা হয়েছে।',
      importErr:{malformed_json:'ইমপোর্ট বাতিল: ভুল JSON। আপনার আগের ডেটা অপরিবর্তিত আছে।', wrong_app:'ইমপোর্ট বাতিল: এই ফাইল ফাস্টিং ট্র্যাকার বিডির নয়। আপনার আগের ডেটা অপরিবর্তিত আছে।', wrong_version:'ইমপোর্ট বাতিল: অসমর্থিত ফাইল সংস্করণ। আপনার আগের ডেটা অপরিবর্তিত আছে।', bad_shape:'ইমপোর্ট বাতিল: ভুল ফাইল ফরম্যাট। আপনার আগের ডেটা অপরিবর্তিত আছে।', bad_entries:'ইমপোর্ট বাতিল: এন্ট্রিগুলো অবৈধ। আপনার আগের ডেটা অপরিবর্তিত আছে।', too_many_entries:'ইমপোর্ট বাতিল: ২০০০-এর বেশি এন্ট্রি। আপনার আগের ডেটা অপরিবর্তিত আছে।', bad_made_up:'ইমপোর্ট বাতিল: আদায় সংখ্যা অবৈধ। আপনার আগের ডেটা অপরিবর্তিত আছে।', bad_entry:'ইমপোর্ট বাতিল: একটি এন্ট্রি অবৈধ (ভুল তারিখ, ধরন, অবস্থা বা মন্তব্য)। আপনার আগের ডেটা অপরিবর্তিত আছে।', duplicate_date:'ইমপোর্ট বাতিল: ফাইলে একই তারিখ দুবার আছে। আপনার আগের ডেটা অপরিবর্তিত আছে।'},
      confirmDelete:'এই তারিখের এন্ট্রিটি মুছে ফেলবেন?' }
  };
  var state = load();
  var lang = state.lang || 'en';
  var calYear = Number(TODAY.slice(0, 4)), calMonth = Number(TODAY.slice(5, 7)) - 1;
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); if (p && Array.isArray(p.entries)) return { entries: p.entries, madeUp: p.madeUp || 0, lang: p.lang || 'en' }; } } catch (e) {}
    return { entries: [], madeUp: 0, lang: 'en' };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ entries: state.entries, madeUp: state.madeUp, lang: lang })); } catch (e) {} }
  function t() { return I18N[lang]; }
  function fmt(n) { return lang === 'bn' ? toBnDigits(n) : String(n); }
  function typeLabel(v) { return lang === 'bn' ? TYPE_BN[v] : v; }
  function statusLabel(v) { return lang === 'bn' ? STATUS_BN[v] : v; }
  function $(id) { return document.getElementById(id); }
  function showTab(name) {
    ['dashboard','log','calendar','history','data'].forEach(function (s) {
      $('sec-' + s).hidden = (s !== name);
      $('tab-' + s).classList.toggle('active', s === name);
    });
    if (name === 'calendar') renderCalendar();
    if (name === 'history') renderHistory();
  }
  function fillSelects() {
    var ft = $('fType'), fs = $('fStatus'), filtT = $('filterType'), filtS = $('filterStatus');
    ft.innerHTML = ''; fs.innerHTML = '';
    TYPES.forEach(function (x) { var o = document.createElement('option'); o.value = x; o.textContent = typeLabel(x); ft.appendChild(o); });
    STATUSES.forEach(function (x) { var o = document.createElement('option'); o.value = x; o.textContent = statusLabel(x); fs.appendChild(o); });
    filtT.innerHTML = ''; var a = document.createElement('option'); a.value = 'All'; a.textContent = t().all; filtT.appendChild(a);
    TYPES.forEach(function (x) { var o = document.createElement('option'); o.value = x; o.textContent = typeLabel(x); filtT.appendChild(o); });
    filtS.innerHTML = ''; var b = document.createElement('option'); b.value = 'All'; b.textContent = t().all; filtS.appendChild(b);
    STATUSES.forEach(function (x) { var o = document.createElement('option'); o.value = x; o.textContent = statusLabel(x); filtS.appendChild(o); });
  }
  function renderAll() {
    var s = t();
    $('appTitle').textContent = s.title; $('appTag').textContent = s.tag; $('langToggle').textContent = s.toggle;
    $('tab-dashboard').textContent = s.tabs.dashboard; $('tab-log').textContent = s.tabs.log; $('tab-calendar').textContent = s.tabs.calendar; $('tab-history').textContent = s.tabs.history; $('tab-data').textContent = s.tabs.data;
    $('dashHeading').textContent = s.dash; $('lblTotalKept').textContent = s.total; $('lblMonthKept').textContent = s.month; $('lblQada').textContent = s.qada; $('lblShawwal').textContent = s.shawwal; $('qadaExplain').textContent = s.qadaExplain;
    $('lblMadeUp').textContent = s.madeUp; $('btnMadeUp').textContent = s.btnMadeUp; $('btnUndoMadeUp').textContent = s.btnUndo;
    $('logHeading').textContent = s.log; $('lblDate').textContent = s.date; $('lblType').textContent = s.type; $('lblStatus').textContent = s.status; $('lblNote').textContent = s.note; $('btnSave').textContent = s.save; $('btnClearForm').textContent = s.clear; $('editHint').textContent = s.editHint;
    $('calHeading').textContent = s.cal; $('calPrev').textContent = s.prev; $('calNext').textContent = s.next; $('calLegend').textContent = s.legend;
    $('histHeading').textContent = s.hist; $('lblFilterType').textContent = s.filterType; $('lblFilterStatus').textContent = s.filterStatus;
    $('dataHeading').textContent = s.data; $('dataHint').textContent = s.dataHint; $('btnExport').textContent = s.export; $('lblImport').textContent = s.importLbl; $('btnImport').textContent = s.importBtn; $('lblErase').textContent = s.eraseLbl; $('btnErase').textContent = s.eraseBtn;
    $('footerNote').textContent = s.footer;
    document.documentElement.lang = lang;
    fillSelects();
    var d = dashboard(state.entries, state.madeUp, TODAY);
    $('statTotal').textContent = fmt(d.totalKept); $('statMonth').textContent = fmt(d.keptThisMonth); $('statQada').textContent = fmt(d.qadaOwed);
    $('statShawwal').textContent = lang === 'bn' ? toBnDigits(d.shawwalKept) + '/৬' : d.shawwalProgress;
    $('statMadeUp').textContent = fmt(d.madeUp);
    renderCalendar(); renderHistory();
  }
  function renderCalendar() {
    var dow = lang === 'bn' ? DOW_BN : DOW_EN;
    $('calDow').innerHTML = dow.map(function (x) { return '<div><b>' + x + '</b></div>'; }).join('');
    $('calLabel').textContent = lang === 'bn' ? MONTH_BN[calMonth] + ' ' + toBnDigits(calYear) : MONTH_EN[calMonth] + ' ' + calYear;
    var cells = calendarCells(calYear, calMonth);
    $('calGrid').innerHTML = cells.map(function (date) {
      if (!date) return '<div class="cell"></div>';
      var st = statusForDate(state.entries, date);
      var day = Number(date.slice(8, 10));
      var cls = 'cell' + (st ? ' has' : '');
      var dot = st === 'Kept' ? '<span class="dot" style="color:green">●</span>' : st === 'Missed' ? '<span class="dot" style="color:red">●</span>' : st === 'Excused' ? '<span class="dot" style="color:grey">●</span>' : '';
      var spanCls = st ? 'badge ' + st.toLowerCase() : '';
      return '<div class="' + cls + '" data-date="' + date + '" data-status="' + (st || '') + '"><div>' + fmt(day) + '</div>' + dot + (st ? '<span class="' + spanCls + '">' + statusLabel(st) + '</span>' : '') + '</div>';
    }).join('');
    $('calGrid').querySelectorAll('[data-date]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (!el.getAttribute('data-status')) return;
        showTab('history');
        setTimeout(function () {
          var row = document.querySelector('[data-entry-date="' + el.getAttribute('data-date') + '"]');
          if (row) { row.classList.add('highlight'); row.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }, 50);
      });
    });
  }
  function renderHistory() {
    var list = $('historyList'); list.innerHTML = '';
    var rows = filterEntries(state.entries, $('filterType').value, $('filterStatus').value);
    $('emptyState').textContent = rows.length ? '' : t().empty;
    rows.forEach(function (e) {
      var div = document.createElement('div'); div.className = 'entry'; div.setAttribute('data-entry-date', e.date);
      var dateText = lang === 'bn' ? toBnDigits(e.date) : e.date;
      div.innerHTML = '<div><b>' + dateText + '</b> — ' + typeLabel(e.type) + ' <span class="badge ' + e.status.toLowerCase() + '">' + statusLabel(e.status) + '</span></div>' +
        (e.note ? '<div>' + escapeHtml(e.note) + '</div>' : '');
      var row = document.createElement('div'); row.className = 'row';
      var editBtn = document.createElement('button'); editBtn.type = 'button'; editBtn.className = 'secondary'; editBtn.textContent = t().edit;
      var delBtn = document.createElement('button'); delBtn.type = 'button'; delBtn.className = 'danger'; delBtn.textContent = t().del;
      editBtn.addEventListener('click', function () { startInlineEdit(div, e); });
      delBtn.addEventListener('click', function () {
        if (window.confirm(t().confirmDelete)) { state.entries = deleteEntry(state.entries, e.date); save(); renderAll(); $('qadaMsg').textContent = t().deleted; $('qadaMsg').className = 'ok'; }
      });
      row.appendChild(editBtn); row.appendChild(delBtn); div.appendChild(row); list.appendChild(div);
    });
  }
  function startInlineEdit(div, e) {
    div.innerHTML = '';
    var sel = document.createElement('select'); sel.setAttribute('aria-label', t().status);
    STATUSES.forEach(function (x) { var o = document.createElement('option'); o.value = x; o.textContent = statusLabel(x); if (x === e.status) o.selected = true; sel.appendChild(o); });
    var note = document.createElement('input'); note.type = 'text'; note.maxLength = 200; note.value = e.note || ''; note.setAttribute('aria-label', t().note);
    var msg = document.createElement('p'); msg.className = 'error'; msg.setAttribute('role', 'alert');
    var row = document.createElement('div'); row.className = 'row';
    var saveBtn = document.createElement('button'); saveBtn.type = 'button'; saveBtn.textContent = t().saveEdit;
    var cancelBtn = document.createElement('button'); cancelBtn.type = 'button'; cancelBtn.className = 'secondary'; cancelBtn.textContent = t().cancel;
    saveBtn.addEventListener('click', function () {
      var r = editEntry(state.entries, e.date, { status: sel.value, note: note.value }, TODAY);
      if (!r.ok) { msg.textContent = r.errors.map(function (c) { return t().err[c] || c; }).join(' '); return; }
      state.entries = r.entries; save(); renderAll(); $('qadaMsg').textContent = t().updated; $('qadaMsg').className = 'ok';
    });
    cancelBtn.addEventListener('click', function () { renderHistory(); });
    var head = document.createElement('div'); head.innerHTML = '<b>' + e.date + '</b> — ' + typeLabel(e.type);
    div.appendChild(head); div.appendChild(sel); div.appendChild(note); div.appendChild(msg); row.appendChild(saveBtn); row.appendChild(cancelBtn); div.appendChild(row);
  }
  function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  document.querySelectorAll('.tab').forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); }); });
  $('langToggle').addEventListener('click', function () { lang = lang === 'en' ? 'bn' : 'en'; save(); renderAll(); });
  $('calPrev').addEventListener('click', function () { var r = shiftMonth(calYear, calMonth, -1); calYear = r.year; calMonth = r.month; renderCalendar(); });
  $('calNext').addEventListener('click', function () { var r = shiftMonth(calYear, calMonth, 1); calYear = r.year; calMonth = r.month; renderCalendar(); });
  $('filterType').addEventListener('change', renderHistory);
  $('filterStatus').addEventListener('change', renderHistory);
  $('logForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var entry = { date: $('fDate').value, type: $('fType').value, status: $('fStatus').value, note: $('fNote').value };
    var r = addEntry(state.entries, entry, TODAY);
    if (!r.ok) { $('formError').textContent = r.errors.map(function (c) { return t().err[c] || c; }).join(' '); $('formOk').textContent = ''; return; }
    state.entries = r.entries; save(); $('formError').textContent = ''; $('formOk').textContent = t().saved; renderAll();
  });
  $('btnClearForm').addEventListener('click', function () { $('logForm').reset(); $('formError').textContent = ''; $('formOk').textContent = ''; });
  $('btnMadeUp').addEventListener('click', function () { state.madeUp = makeUpQada(state.madeUp); save(); renderAll(); });
  $('btnUndoMadeUp').addEventListener('click', function () { state.madeUp = undoMakeUp(state.madeUp); save(); renderAll(); });
  $('btnExport').addEventListener('click', function () {
    var blob = new Blob([exportData(state.entries, state.madeUp)], { type: 'application/json' });
    var a = $('downloadLink'); a.href = URL.createObjectURL(blob); a.download = 'fasting-tracker-bd-export.json'; a.hidden = false; a.textContent = t().export + ' — fasting-tracker-bd-export.json'; a.click();
    $('dataMsg').textContent = ''; $('dataMsg').className = '';
  });
  $('btnImport').addEventListener('click', function () {
    var r = importData($('importText').value);
    if (!r.ok) { $('dataMsg').textContent = t().importErr[r.error] || r.error; $('dataMsg').className = 'error'; return; }
    state.entries = r.entries; state.madeUp = r.madeUp; save(); $('dataMsg').textContent = t().imported; $('dataMsg').className = 'ok'; renderAll();
  });
  $('eraseText').addEventListener('input', function () { $('btnErase').disabled = $('eraseText').value !== 'DELETE'; });
  $('btnErase').addEventListener('click', function () {
    if ($('eraseText').value !== 'DELETE') return;
    state.entries = []; state.madeUp = 0; $('eraseText').value = ''; $('btnErase').disabled = true; save(); renderAll();
    $('dataMsg').textContent = t().erased; $('dataMsg').className = 'ok';
  });
  $('fDate').value = TODAY;
  renderAll();
})();
