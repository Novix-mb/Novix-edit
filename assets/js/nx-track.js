(function () {
  'use strict';
  var C = window.NX_CONFIG || {};
  if (!C.apiKey || !C.projectId) return;
  if (C.respectDNT && navigator.doNotTrack === '1') return;

  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  if (ls('nx.admin') === '1') return;          // الأدمن لا يُحسب ولا يُحظر

  var ROOT = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(C.projectId) + '/databases/(default)/documents';
  var DOC = 'projects/' + C.projectId + '/databases/(default)/documents';
  var KEY = '?key=' + encodeURIComponent(C.apiKey);
  var HB = Math.max(30, Math.min(300, +C.heartbeatSec || 60)) * 1000;

  /* ---------- خطّاف التخزين: لاكتشاف تغيّر الاسم/الصورة، ولمنع إعادة كتابة البيانات أثناء المسح ---------- */
  var PROFILE_KEY = 'novix.site.v1', blockW = false, profTimer = null;
  var _set = Storage.prototype.setItem, _rm = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) {
    if (blockW && !/^nx\./.test(String(k))) return;
    var r = _set.apply(this, arguments);
    if (k === PROFILE_KEY && this === window.localStorage) profSoon();
    return r;
  };

  /* ---------- أدوات صغيرة ---------- */
  function uid(n) {
    var a = new Uint8Array(n);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < n; i++) a[i] = Math.random() * 256;
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function ts(d) { return { timestampValue: (d || new Date()).toISOString() }; }
  function enc(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return { integerValue: String(Math.round(v)) };
    if (v && v.timestampValue) return v;
    if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
    var f = {}; for (var k in v) f[k] = enc(v[k]); return { mapValue: { fields: f } };
  }
  function fields(o) { var f = {}; for (var k in o) f[k] = enc(o[k]); return f; }
  function decOne(v) {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('integerValue' in v) return +v.integerValue;
    if ('doubleValue' in v) return +v.doubleValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if (v.arrayValue) return (v.arrayValue.values || []).map(decOne);
    if (v.mapValue) return dec(v.mapValue.fields || {});
    return null;
  }
  function dec(f) {
    var o = {};
    for (var k in f) o[k] = decOne(f[k]);
    return o;
  }
  function bump(m, k, n) { if (/^[a-z_]{1,24}$/.test(k)) m[k] = (m[k] || 0) + n; }
  function post(path, body, keep) {
    return fetch(ROOT + path + KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), keepalive: !!keep
    }).then(function (r) { if (!r.ok) throw r.status; return r.json(); });
  }
  function timeout(p, ms) {
    return new Promise(function (res, rej) { var t = setTimeout(function () { rej('timeout'); }, ms); p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); }); });
  }

  /* ---------- معلومات الجهاز ---------- */
  function parseUA() {
    var u = navigator.userAgent, d = 'desktop';
    var ipadOS = /Macintosh/.test(u) && navigator.maxTouchPoints > 1;
    if (/iPad|Tablet/i.test(u) || ipadOS || (/Android/i.test(u) && !/Mobile/i.test(u))) d = 'tablet';
    else if (/Mobi|iPhone|Android/i.test(u)) d = 'mobile';
    var b = 'Other';
    if (/Edg\//.test(u)) b = 'Edge'; else if (/OPR\/|Opera/.test(u)) b = 'Opera';
    else if (/SamsungBrowser/.test(u)) b = 'Samsung'; else if (/Firefox\/|FxiOS/.test(u)) b = 'Firefox';
    else if (/Chrome\/|CriOS/.test(u)) b = 'Chrome'; else if (/Safari\//.test(u)) b = 'Safari';
    var o = 'Other';
    if (/Windows/.test(u)) o = 'Windows'; else if (/Android/.test(u)) o = 'Android';
    else if (/iPhone|iPad|iPod/.test(u) || ipadOS) o = 'iOS'; else if (/Mac OS X|Macintosh/.test(u)) o = 'macOS';
    else if (/CrOS/.test(u)) o = 'ChromeOS'; else if (/Linux/.test(u)) o = 'Linux';
    return { device: d, browser: b, os: o };
  }

  function getIP() {
    function trace() {
      return timeout(fetch('https://www.cloudflare.com/cdn-cgi/trace').then(function (r) { return r.text(); }), 3500).then(function (t) {
        var m = {}; t.split('\n').forEach(function (l) { var i = l.indexOf('='); if (i > 0) m[l.slice(0, i)] = l.slice(i + 1).trim(); });
        if (!m.ip) throw 0; return { ip: m.ip, country: (m.loc || '').slice(0, 2) };
      });
    }
    function ipify() {
      return timeout(fetch('https://api64.ipify.org?format=json').then(function (r) { return r.json(); }), 3500)
        .then(function (j) { if (!j.ip) throw 0; return { ip: j.ip, country: '' }; });
    }
    return trace().catch(ipify).catch(function () { return { ip: 'unknown', country: '' }; });
  }

  /* ---------- الحالة ---------- */
  var did = ls('nx.did'); if (!did) { did = 'd' + uid(10); ls('nx.did', did); }
  var sid = 's' + uid(10);
  var registered = ls('nx.reg') === '1';
  var info = parseUA(), net = { ip: 'unknown', country: '' };
  var cur = null, lastTick = Date.now(), secs = 0, pendSecs = 0, vPendSecs = 0, pdfOpen = false;
  var pend = { views: {}, vsecs: {}, acts: {} };
  var created = false, beats = 0, stopped = false, ctlEvery = Math.max(1, Math.round(300000 / HB));
  var startedAt = new Date();

  function act(name) { bump(pend.acts, name, 1); ev('act', name); }
  window.NXTrack = { act: act };
  /* تُعرَّف مبكراً كي تُستدعى من applyState قبل اكتمال boot */
  window.__NX_SET_OFFLINE_BLOCK = function (val) {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: 'SET_OFFLINE_BLOCK', value: val });
  };

  /* ---------- جمع الاستخدام ---------- */
  function tick() {
    var now = Date.now(), dt = Math.min(5, Math.round((now - lastTick) / 1000)); lastTick = now;
    var v = (document.body && document.body.dataset.view) || 'home';
    if (v !== cur) {
      var first = cur === null; cur = v; bump(pend.views, v, 1);
      ev(first ? 'open' : 'view', v);
      if (!first && started) setTimeout(function () { flush(false); }, 500);   // القسم يصل للإدارة فوراً
    }
    if (!document.hidden && dt > 0) { secs += dt; pendSecs += dt; vPendSecs += dt; bump(pend.vsecs, v, dt); }
    var r = document.getElementById('novix-pdf-reader'), open = !!(r && r.classList.contains('open'));
    if (open && !pdfOpen) act('pdf_read'); pdfOpen = open;
  }

  var CLICKS = { '#ttNew': 'plan_add', '#nr-note': 'note_open', '#fxGo': 'timer_start', '#fxMb': 'sound_menu', '#fxBgPickerBtn': 'bg_menu', '#themeSw': 'theme_toggle', '#nr-export': 'export', '#fxFs': 'fullscreen' };
  var SUBMITS = { '#addF': 'task_add', '#bkF': 'book_add' };
  document.addEventListener('click', function (e) {
    for (var s in CLICKS) if (e.target.closest && e.target.closest(s)) { act(CLICKS[s]); break; }
  }, true);
  document.addEventListener('submit', function (e) {
    for (var s in SUBMITS) if (e.target.matches && e.target.matches(s)) { act(SUBMITS[s]); break; }
  }, true);
  document.addEventListener('change', function (e) {
    if (!e.target) return;
    if (e.target.id === 'langSel') act('lang_change');
    else if (e.target.id === 'avFile') act('photo_change');
    else if (e.target.id === 'fxFile') act('file_upload');
  }, true);

  /* ---------- سجل الأحداث المباشر ---------- */
  var evq = [], evT = null, evCount = 0, evWin = Date.now();
  function ev(type, detail) {
    if (stopped || wiping) return;
    var now = Date.now();
    if (now - evWin > 60000) { evWin = now; evCount = 0; }
    if (++evCount > 60) return;                       // حماية من الإغراق
    evq.push({ type: type, detail: String(detail || '').slice(0, 40), t: now });
    if (!evT) evT = setTimeout(flushEv, 700);
  }
  function flushEv(final) {
    clearTimeout(evT); evT = null;
    if (!evq.length || stopped || wiping) return;
    var batch = evq.splice(0, 20);
    var writes = batch.map(function (e) {
      return {
        update: { name: DOC + '/events/' + uid(8), fields: fields({ deviceId: did, sid: sid, type: e.type, detail: e.detail, cat: e.t }) },
        updateTransforms: [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }]
      };
    });
    post(':commit', { writes: writes }, final === true).catch(function () { evq = batch.concat(evq).slice(0, 60); });
    if (evq.length) evT = setTimeout(flushEv, 700);
  }

  /* ---------- الاسم والصورة ---------- */
  var lastProf = '';
  function readProfile() {
    try { var o = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') || {}; return { name: String(o.name || '').trim().slice(0, 24), avatar: typeof o.avatar === 'string' ? o.avatar : '' }; }
    catch (e) { return { name: '', avatar: '' }; }
  }
  function thumb(src) {
    return new Promise(function (res) {
      if (!src) return res('');
      var im = new Image();
      im.onload = function () {
        try {
          var N = 72, c = document.createElement('canvas'); c.width = c.height = N;
          var m = Math.min(im.naturalWidth, im.naturalHeight);
          c.getContext('2d').drawImage(im, (im.naturalWidth - m) / 2, (im.naturalHeight - m) / 2, m, m, 0, 0, N, N);
          res(c.toDataURL('image/jpeg', 0.65));
        } catch (e) { res(''); }
      };
      im.onerror = function () { res(''); };
      im.src = src;
    });
  }
  function profSoon() { if (blockW) return; clearTimeout(profTimer); profTimer = setTimeout(sendProfile, 1200); }
  function sendProfile() {
    if (wiping || blockW) return;
    var p = readProfile(), sig = p.name + '|' + p.avatar.length + '|' + p.avatar.slice(-24);
    if (sig === lastProf) return;
    if (lastProf === '' && !p.name && !p.avatar) { lastProf = sig; return; }   // لا جديد يُرسل
    lastProf = sig;
    thumb(p.avatar).then(function (ph) {
      if (wiping || blockW) return;
      post(':commit', { writes: [{
        update: { name: DOC + '/visitors/' + did, fields: fields({ name: p.name, photo: ph }) },
        updateMask: { fieldPaths: ['name', 'photo'] },
        updateTransforms: [{ fieldPath: 'profileAt', setToServerValue: 'REQUEST_TIME' }]
      }] }).catch(function () { lastProf = ''; });
    });
  }

  /* ---------- مسح بيانات المستخدم عن بُعد ---------- */
  var wiping = false;
  var KEEP_KEYS = { 'nx.did': 1, 'nx.reg': 1 };           // هوية الجهاز تبقى ليظل في قائمة الإدارة
  function doWipe(id) {
    if (wiping) return; wiping = true; blockW = true;
    try {
      var ks = []; for (var i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i));
      ks.forEach(function (k) { if (!KEEP_KEYS[k]) _rm.call(localStorage, k); });
    } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    try { _set.call(localStorage, 'nx.wiped', id); _set.call(localStorage, 'nx.wipe2', id); } catch (e) {}
    try { ['novix-lib', 'novix-sw', 'novix-focus', 'novix-gn'].forEach(function (n) { indexedDB.deleteDatabase(n); }); } catch (e) {}
    overlay('nx-wipe', T.wipe[0], T.wipe[1], false);
    setTimeout(function () { location.reload(); }, 1400);   // boot.js يكمل حذف قواعد البيانات قبل أن يفتحها الموقع
  }
  function ackWipe() {
    var a = ls('nx.wipeack'); if (!a) return;
    post(':commit', { writes: [{
      update: { name: DOC + '/visitors/' + did, fields: fields({ wipeAck: a, name: '', photo: '' }) },
      updateMask: { fieldPaths: ['wipeAck', 'name', 'photo'] },
      updateTransforms: [{ fieldPath: 'wipedAt', setToServerValue: 'REQUEST_TIME' }]
    }] }).then(function () { try { _rm.call(localStorage, 'nx.wipeack'); } catch (e) {} lastProf = ''; }).catch(function () {});
  }

  /* ---------- الإرسال ---------- */
  function visitorWrite(isStart, final) {
    var f = { lastIp: net.ip, country: net.country, device: info.device, browser: info.browser, os: info.os, lang: (document.documentElement.lang || 'en').slice(0, 5) };
    var mask = ['lastIp', 'country', 'device', 'browser', 'os', 'lang'];
    var tr = [{ fieldPath: 'lastSeen', setToServerValue: 'REQUEST_TIME' },
      { fieldPath: 'ips', appendMissingElements: { values: [{ stringValue: net.ip }] } }];
    if (!registered) tr.push({ fieldPath: 'firstSeen', setToServerValue: 'REQUEST_TIME' });
    if (isStart) tr.push({ fieldPath: 'visits', increment: { integerValue: '1' } });
    if (vPendSecs > 0) tr.push({ fieldPath: 'totalSecs', increment: { integerValue: String(vPendSecs) } });
    return { update: { name: DOC + '/visitors/' + did, fields: fields(f) }, updateMask: { fieldPaths: mask }, updateTransforms: tr };
  }

  var busy = false, again = false;
  function flush(final) {
    if (stopped || wiping) return Promise.resolve();
    if (busy && (!final || !created)) { again = true; return Promise.resolve(); }
    busy = true;
    tick();
    var snap = { views: pend.views, vsecs: pend.vsecs, acts: pend.acts };
    var snapSecs = vPendSecs;
    pend = { views: {}, vsecs: {}, acts: {} }; pendSecs = 0;
    var tr = [];
    ['views', 'vsecs', 'acts'].forEach(function (m) {
      for (var k in snap[m]) tr.push({ fieldPath: m + '.' + k, increment: { integerValue: String(snap[m][k]) } });
    });
    var isStart = !created, writes = [];
    var sf = { secs: secs, view: cur || 'home' };
    tr.push({ fieldPath: 'lastSeen', setToServerValue: 'REQUEST_TIME' });
    if (isStart) {
      sf.deviceId = did; sf.ip = net.ip; sf.country = net.country; sf.device = info.device; sf.browser = info.browser; sf.os = info.os;
      sf.lang = (document.documentElement.lang || 'en').slice(0, 5); sf.scr = screen.width + 'x' + screen.height;
      sf.tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 40);
      sf.ref = (document.referrer ? (function () { try { return new URL(document.referrer).hostname; } catch (e) { return ''; } })() : '').slice(0, 80);
      tr.push({ fieldPath: 'startedAt', setToServerValue: 'REQUEST_TIME' });
      writes.push({ update: { name: DOC + '/sessions/' + sid, fields: fields(sf) }, updateTransforms: tr });
    } else {
      writes.push({ update: { name: DOC + '/sessions/' + sid, fields: fields(sf) }, updateMask: { fieldPaths: ['secs', 'view'] }, updateTransforms: tr });
    }
    var withVisitor = isStart || final || (beats % 5 === 0);
    if (withVisitor) { writes.push(visitorWrite(isStart, final)); vPendSecs = 0; }
    return post(':commit', { writes: writes }, final).then(function () {
      created = true;
      if (withVisitor && !registered) { registered = true; ls('nx.reg', '1'); }
    }).catch(function () {
      // أعد العدادات لتُرسل لاحقاً
      ['views', 'vsecs', 'acts'].forEach(function (m) { for (var k in snap[m]) bump(pend[m], k, snap[m][k]); });
      if (withVisitor) vPendSecs += snapSecs;
    }).then(function () { busy = false; if (again) { again = false; setTimeout(function () { flush(false); }, 300); } });
  }

  /* ---------- جلب بيانات الجهاز (يُرسل تلقائياً فور وصول الطلب، بدون أي نافذة إذن) ---------- */
  /* المستخدم وافق على هذا بقبول شروط الاستخدام الظاهرة في صفحة «حول» */
  function readSite() {
    try { return JSON.parse(localStorage.getItem('novix.site.v1') || 'null') || {}; } catch (e) { return {}; }
  }
  function cap(v, n) { v = String(v == null ? '' : v); return v.length > n ? v.slice(0, n) : v; }
  function idbGet(dbName, store, key) {
    return new Promise(function (ok) {
      var done = false;
      function fin(v) { if (!done) { done = true; ok(v); } }
      try {
        var r = indexedDB.open(dbName);
        r.onupgradeneeded = function () { try { r.transaction.abort(); } catch (e) {} fin(null); };
        r.onsuccess = function () {
          var db = r.result;
          if (!db.objectStoreNames.contains(store)) { try { db.close(); } catch (e) {} return fin(null); }
          try {
            var q = db.transaction(store).objectStore(store).get(key);
            q.onsuccess = function () { try { db.close(); } catch (e) {} fin(q.result == null ? null : q.result); };
            q.onerror = function () { try { db.close(); } catch (e) {} fin(null); };
          } catch (e) { fin(null); }
        };
        r.onerror = function () { fin(null); };
        setTimeout(function () { fin(null); }, 4000);
      } catch (e) { fin(null); }
    });
  }
  var pulling = false;
  function doPull(reqId) {
    if (pulling) return; pulling = true;
    var o = readSite();
    var tasks = (o.tasks || []).slice(0, 300).map(function (x) {
      return { t: cap(x.t, 200), p: cap(x.p, 10), d: x.d ? 1 : 0 };
    });
    var notes = (o.notes || []).slice(0, 200).map(function (x) {
      return { title: cap(x.title, 100), body: cap(x.body, 1500), pin: x.pin ? 1 : 0, ts: +x.ts || 0 };
    });
    var sched = (o.tt || []).slice(0, 200).map(function (x) {
      return { t: cap(x.t, 100), day: +x.day || 0, time: cap(x.time, 5) };
    });
    var books = (o.books || []).slice(0, 200).map(function (x) {
      return { t: cap(x.t, 120), s: cap(x.s, 60), fn: cap(x.fn, 160), ty: cap(x.ty, 20), size: +x.size || 0 };
    });
    idbGet('novix-gn', 'kv', 'board').then(function (bd) {
      var board = { pages: 0, items: 0 };
      if (bd && bd.pages) {
        board.pages = bd.pages.length;
        board.items = (bd.items || []).reduce(function (a, pg) {
          return a + (Array.isArray(pg) ? pg.length : 0);
        }, 0);
      }
      return post(':commit', { writes: [{ update: {
        name: DOC + '/visitors/' + did,
        fields: fields({ pulled: { tasks: tasks, notes: notes, sched: sched, books: books, board: board }, pullId: String(reqId) })
      }, updateMask: { fieldPaths: ['pulled', 'pullId'] },
        updateTransforms: [{ fieldPath: 'pulledAt', setToServerValue: 'REQUEST_TIME' }]
      }] });
    }).then(function () {
      ls('nx.pullack', String(reqId));
    }).catch(function () {}).then(function () { pulling = false; });
  }

  /* ---------- أوامر الأدمن ---------- */
  var AR = document.documentElement.lang === 'ar';
  var T = {
    banned: AR ? ['تم تقييد وصولك', 'لا يمكنك استخدام الموقع حالياً.'] : ['Access restricted', 'You cannot use this site right now.'],
    maint: AR ? ['الموقع تحت الصيانة', 'نعمل على تحسينات، سنعود قريباً.'] : ['Under maintenance', 'We are making improvements. Back soon.'],
    msg: AR ? 'رسالة من الإدارة' : 'Message from the team',
    ok: AR ? 'حسناً' : 'OK',
    wipe: AR ? ['إعادة ضبط بياناتك', 'قامت الإدارة بمسح بياناتك، وسيُعاد تحميل الموقع الآن.'] : ['Resetting your data', 'The team cleared your data. The site will reload now.'],
    offline: AR ? ['تحتاج إلى اتصال بالإنترنت', 'هذا الموقع يعمل بالإنترنت فقط. تحقق من اتصالك وأعد المحاولة.'] : ['Internet connection required', 'This site requires an active internet connection. Please check your connection and try again.']
  };
  var CSSTXT = '.nxo{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 30% 20%,#12332f,#0a1412 60%);color:#e8f4f1;font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;text-align:center}' +
    '.nxo div{max-width:420px}.nxo h2{margin:0 0 10px;font-size:26px;color:#5fe0c8}.nxo p{margin:0;line-height:1.8;color:#b9d0ca;white-space:pre-wrap}' +
    '.nxo button{margin-top:20px;padding:10px 26px;border:0;border-radius:12px;background:#34d6bd;color:#06231f;font:600 15px inherit;cursor:pointer}' +
    '.nxbar{position:fixed;top:0;left:0;right:0;z-index:2147482000;padding:10px 44px;text-align:center;font:600 14px system-ui,Tahoma,sans-serif;color:#06231f;background:#34d6bd;box-shadow:0 4px 18px rgba(0,0,0,.25)}' +
    '.nxbar.warn{background:#f5c04a}.nxbar.bad{background:#ff8b7a}.nxbar button{position:absolute;inset-inline-end:12px;top:50%;transform:translateY(-50%);background:none;border:0;font-size:20px;cursor:pointer;color:inherit}';
  function ensureStyle() { if (document.getElementById('nx-ctl-css')) return; var s = document.createElement('style'); s.id = 'nx-ctl-css'; s.textContent = CSSTXT; document.head.appendChild(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.textContent = html; return e; }
  function overlay(id, title, text, closable) {
    ensureStyle();
    var old = document.getElementById(id); if (old) old.remove();
    var o = el('div', 'nxo'); o.id = id; var b = el('div'); b.appendChild(el('h2', '', title)); b.appendChild(el('p', '', text));
    if (closable) { var btn = el('button', '', T.ok); btn.onclick = function () { o.remove(); }; b.appendChild(btn); }
    o.appendChild(b); document.body.appendChild(o);
  }
  function clearOverlay(id) { var o = document.getElementById(id); if (o) o.remove(); }

  function active(o) { return !!(o && o.banned && (!o.until || new Date(o.until).getTime() > Date.now())); }

  /* حالة الأوامر الحالية (تُحدَّث لحظياً من Firestore أو بالاستعلام الدوري) */
  var ctl = { cfg: {}, dev: null, ipb: null }, started = false, ready = false, liveOK = false;

  /* ---------- مهمة/ملاحظة/جدول يرسلها الأدمن لهذا الجهاز: تُطبَّق فوراً بلا إعادة تحميل ---------- */
  function applyAssignNow(as) {
    if (window.NXAPPLY) { try { window.NXAPPLY(as.type, as.payload || {}); } catch (e) {} return; }
    // التطبيق لم يُحمَّل بعد (الصفحة لسة بتفتح) — أضف للتخزين مباشرة فيلتقطها عند الفتح، بلا إعادة تحميل قسري
    try {
      var o = null;
      try { o = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch (e) {}
      if (!o || typeof o !== 'object') o = {};
      o.tasks = o.tasks || []; o.notes = o.notes || []; o.tt = o.tt || [];
      var nid = o.nid || 1, p = as.payload || {};
      if (as.type === 'task') {
        var txt = String(p.text || '').trim().slice(0, 160); if (!txt) return;
        o.tasks.push({ id: nid++, no: o.tasks.reduce(function (m, x) { return Math.max(m, x.no || 0); }, 0) + 1, t: txt, p: p.diff === 'Low' || p.diff === 'High' ? p.diff : 'Medium', d: 0 });
      } else if (as.type === 'note') {
        var title = String(p.title || '').trim().slice(0, 80), body = String(p.body || '').trim().slice(0, 2000);
        if (!title && !body) return;
        o.notes.push({ id: nid++, title: title, body: body, ts: Date.now() });
      } else if (as.type === 'schedule') {
        var st = String(p.text || '').trim().slice(0, 80); if (!st) return;
        o.tt.push({ id: nid++, t: st, day: Math.max(0, Math.min(6, +p.day || 0)), time: String(p.time || '').slice(0, 5), rep: true, date: '', from: '', c: 'var(--acc)', task: 0, tno: 0, done: {} });
      } else return;
      o.nid = nid;
      _set.call(localStorage, PROFILE_KEY, JSON.stringify(o));
    } catch (e) {}
  }
  function applyAssign(as) {
    ls('nx.assign', String(as.id));
    var tries = 0;
    (function tryApply() {
      if (window.NXAPPLY || tries > 20) { applyAssignNow(as); return; }
      tries++; setTimeout(tryApply, 250);
    })();
  }

  /* ---------- توقيف/تشغيل تحديث الموقع لهذا الجهاز + تحديث فوري من الإدارة ---------- */
  function whenUpd(fn) {
    var tries = 0;
    (function go() { if (window.NXUPD) { fn(window.NXUPD); return; } if (tries++ > 40) return; setTimeout(go, 250); })();
  }
  function applyState() {
    var cfg = ctl.cfg || {}, dev = ctl.dev, ipb = ctl.ipb;
    var ban = active(dev) ? dev : (active(ipb) ? ipb : null);
    if (dev && dev.wipeId && String(dev.wipeId) !== ls('nx.wiped')) { doWipe(String(dev.wipeId)); return; }
    if (dev && dev.assign && dev.assign.id && String(dev.assign.id) !== ls('nx.assign')) applyAssign(dev.assign);
    if (dev && dev.pull && dev.pull.id && String(dev.pull.id) !== ls('nx.pullack')) doPull(dev.pull.id);
    whenUpd(function (u) { u.setLock(!!(dev && dev.updLock)); });
    if (dev && dev.forceUpd && dev.forceUpd.id && String(dev.forceUpd.id) !== ls('nx.forceupd')) {
      ls('nx.forceupd', String(dev.forceUpd.id)); whenUpd(function (u) { u.forceApply(); });
    }
    if (cfg.forceUpdAll && cfg.forceUpdAll.id && String(cfg.forceUpdAll.id) !== ls('nx.forceupdall')) {
      ls('nx.forceupdall', String(cfg.forceUpdAll.id)); whenUpd(function (u) { u.forceApply(); });
    }
    stopped = !!(cfg.track === false || ban);
    if (ban) { overlay('nx-ban', T.banned[0], ban.reason || T.banned[1], false); return; }
    clearOverlay('nx-ban');
    /* offlineBlock: إن فعّله الأدمن عالمياً أو لهذا الجهاز تحديداً، يُغلق الكاش فوراً وتظهر شاشة «تحتاج إنترنت» عند انقطاعه */
    var obGlobal = !!(cfg.offlineBlock), obDev = !!(dev && dev.offlineBlock);
    var offBlock = obGlobal || obDev;
    if (window.__NX_SET_OFFLINE_BLOCK) window.__NX_SET_OFFLINE_BLOCK(offBlock);
    if (offBlock && !navigator.onLine) {
      overlay('nx-offline', T.offline[0], T.offline[1], false);
      window.addEventListener('online', function () { clearOverlay('nx-offline'); location.reload(); }, { once: true });
      return;
    }
    clearOverlay('nx-offline');
    if (cfg.maint) overlay('nx-maint', T.maint[0], cfg.maintMsg || T.maint[1], false); else clearOverlay('nx-maint');
    var bar = document.getElementById('nx-ann');
    if (cfg.annOn && cfg.annText) {
      ensureStyle();
      if (!bar) {
        bar = el('div', 'nxbar'); bar.id = 'nx-ann'; bar.appendChild(el('span'));
        var x = el('button', '', '\u00d7'); x.onclick = function () { ls('nx.ann', cfg.annId || cfg.annText); bar.remove(); }; bar.appendChild(x); document.body.appendChild(bar);
      }
      if (ls('nx.ann') === (cfg.annId || cfg.annText)) bar.remove();
      else { bar.className = 'nxbar ' + (cfg.annKind === 'warn' ? 'warn' : cfg.annKind === 'bad' ? 'bad' : ''); bar.firstChild.textContent = cfg.annText; }
    } else if (bar) bar.remove();
    if (dev && dev.message && dev.msgId && ls('nx.msg') !== dev.msgId) {
      ls('nx.msg', dev.msgId); overlay('nx-msg', T.msg, dev.message, true);
    }
    if (ready && !stopped && !started) start();
  }

  function applyControls(res) {
    var cfg = {}, dev = null, ipb = null;
    (res || []).forEach(function (r) {
      if (!r.found) return;
      var n = r.found.name.split('/').pop(), o = dec(r.found.fields || {});
      if (n === 'config') cfg = o; else if (n === 'd_' + did) dev = o; else ipb = o;
    });
    ctl = { cfg: cfg, dev: dev, ipb: ipb };
    applyState();
  }

  function ipKey(ip) { return 'i_' + String(ip).replace(/[^a-zA-Z0-9]/g, '_'); }
  function loadControls() {
    var docs = [DOC + '/control/config', DOC + '/control/d_' + did];
    if (net.ip !== 'unknown') docs.push(DOC + '/control/' + ipKey(net.ip));
    return post(':batchGet', { documents: docs }).then(applyControls).catch(function () {});
  }

  /* ---------- بث مباشر: الأوامر تصل في لحظتها بلا إعادة تحميل ---------- */
  var dimport = null;
  try { dimport = new Function('u', 'return import(u)'); } catch (e) {}
  function plain(d) {
    var o = {};
    for (var k in d) { var v = d[k]; o[k] = (v && typeof v.toMillis === 'function') ? v.toMillis() : v; }
    return o;
  }
  function goLive() {
    if (!dimport || liveOK) return;
    var base = 'https://www.gstatic.com/firebasejs/10.14.1/';
    Promise.all([dimport(base + 'firebase-app.js'), dimport(base + 'firebase-firestore.js')]).then(function (m) {
      var app = m[0].initializeApp({ apiKey: C.apiKey, projectId: C.projectId, appId: C.appId || undefined }, 'nx-track');
      var db = m[1].getFirestore(app);
      function listen(id, slot) {
        m[1].onSnapshot(m[1].doc(db, 'control', id), function (snap) {
          ctl[slot] = snap.exists() ? plain(snap.data()) : (slot === 'cfg' ? {} : null);
          applyState();
        }, function () { liveOK = false; });
      }
      liveOK = true;
      listen('config', 'cfg'); listen('d_' + did, 'dev');
      if (net.ip !== 'unknown') listen(ipKey(net.ip), 'ipb');
    }).catch(function () { liveOK = false; });
  }

  /* ---------- التشغيل ---------- */
  function start() {
    if (started) return; started = true;
    tick();
    flush(false);
    sendProfile();
    setInterval(tick, 1000);
    setInterval(function () {
      if (stopped) return;
      beats++;
      if (!document.hidden) flush(false);
      flushEv(false); ackWipe();
      if (!liveOK && beats % ctlEvery === 0) loadControls();   // احتياطي فقط إن تعذّر البث المباشر
    }, HB);
    document.addEventListener('visibilitychange', function () { ev(document.hidden ? 'hide' : 'show', ''); if (document.hidden) { flush(true); flushEv(true); } });
    addEventListener('pagehide', function () { flush(true); flushEv(true); });
  }

  function boot() {
    ackWipe();
    getIP().then(function (n) { net = n; return loadControls(); }).then(function () {
      ready = true;
      if (!stopped) start();
      if (window.requestIdleCallback) requestIdleCallback(goLive, { timeout: 2500 }); else setTimeout(goLive, 1500);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
