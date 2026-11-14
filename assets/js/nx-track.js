/* ============================================================
   NOVIX Tracker — خفيف (بدون مكتبات) يرسل إحصاءات الزيارة إلى Firestore
   - يسجّل: الجهاز، IP، الدولة، مدة الفتح الفعلية، الأقسام والأدوات المستخدمة
   - ينفّذ أوامر لوحة الإدارة: حظر، رسالة لزائر، وضع الصيانة، إعلان عام
   - لا يعمل إذا كان المتصفح مسجّلاً دخول الأدمن (حتى لا تُحسب زياراتك)
   ============================================================ */
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
  function dec(f) {
    var o = {};
    for (var k in f) {
      var v = f[k];
      if ('stringValue' in v) o[k] = v.stringValue;
      else if ('booleanValue' in v) o[k] = v.booleanValue;
      else if ('integerValue' in v) o[k] = +v.integerValue;
      else if ('timestampValue' in v) o[k] = v.timestampValue;
      else o[k] = null;
    }
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

  function act(name) { bump(pend.acts, name, 1); }
  window.NXTrack = { act: act };

  /* ---------- جمع الاستخدام ---------- */
  function tick() {
    var now = Date.now(), dt = Math.min(5, Math.round((now - lastTick) / 1000)); lastTick = now;
    var v = (document.body && document.body.dataset.view) || 'home';
    if (v !== cur) { cur = v; bump(pend.views, v, 1); }
    if (!document.hidden && dt > 0) { secs += dt; pendSecs += dt; vPendSecs += dt; bump(pend.vsecs, v, dt); }
    var r = document.getElementById('novix-pdf-reader'), open = !!(r && r.classList.contains('open'));
    if (open && !pdfOpen) act('pdf_read'); pdfOpen = open;
  }

  var CLICKS = { '#fxGo': 'timer_start', '#fxMb': 'sound_menu', '#fxBgPickerBtn': 'bg_menu', '#themeSw': 'theme_toggle', '#nr-export': 'export', '#fxFs': 'fullscreen' };
  var SUBMITS = { '#addF': 'task_add', '#bkF': 'book_add' };
  document.addEventListener('click', function (e) {
    for (var s in CLICKS) if (e.target.closest && e.target.closest(s)) { act(CLICKS[s]); break; }
  }, true);
  document.addEventListener('submit', function (e) {
    for (var s in SUBMITS) if (e.target.matches && e.target.matches(s)) { act(SUBMITS[s]); break; }
  }, true);
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'langSel') act('lang_change');
  }, true);

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

  function flush(final) {
    if (stopped) return Promise.resolve();
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
    });
  }

  /* ---------- أوامر الأدمن ---------- */
  var AR = document.documentElement.lang === 'ar';
  var T = {
    banned: AR ? ['تم تقييد وصولك', 'لا يمكنك استخدام الموقع حالياً.'] : ['Access restricted', 'You cannot use this site right now.'],
    maint: AR ? ['الموقع تحت الصيانة', 'نعمل على تحسينات، سنعود قريباً.'] : ['Under maintenance', 'We are making improvements. Back soon.'],
    msg: AR ? 'رسالة من الإدارة' : 'Message from the team',
    ok: AR ? 'حسناً' : 'OK'
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

  function applyControls(res) {
    var cfg = {}, dev = null, ipb = null;
    (res || []).forEach(function (r) {
      if (!r.found) return;
      var n = r.found.name.split('/').pop(), o = dec(r.found.fields || {});
      if (n === 'config') cfg = o; else if (n === 'd_' + did) dev = o; else ipb = o;
    });
    if (cfg.track === false) { stopped = true; }
    var ban = active(dev) ? dev : (active(ipb) ? ipb : null);
    if (ban) {
      overlay('nx-ban', T.banned[0], ban.reason || T.banned[1], false); stopped = true;
      return;
    }
    clearOverlay('nx-ban');
    if (cfg.maint) overlay('nx-maint', T.maint[0], cfg.maintMsg || T.maint[1], false); else clearOverlay('nx-maint');
    var bar = document.getElementById('nx-ann');
    if (cfg.annOn && cfg.annText) {
      ensureStyle();
      if (!bar) {
        bar = el('div', 'nxbar'); bar.id = 'nx-ann'; bar.appendChild(el('span'));
        var x = el('button', '', '×'); x.onclick = function () { ls('nx.ann', cfg.annId || cfg.annText); bar.remove(); }; bar.appendChild(x); document.body.appendChild(bar);
      }
      if (ls('nx.ann') === (cfg.annId || cfg.annText)) bar.remove();
      else { bar.className = 'nxbar ' + (cfg.annKind === 'warn' ? 'warn' : cfg.annKind === 'bad' ? 'bad' : ''); bar.firstChild.textContent = cfg.annText; }
    } else if (bar) bar.remove();
    if (dev && dev.message && dev.msgId && ls('nx.msg') !== dev.msgId) {
      ls('nx.msg', dev.msgId); overlay('nx-msg', T.msg, dev.message, true);
    }
  }

  function ipKey(ip) { return 'i_' + String(ip).replace(/[^a-zA-Z0-9]/g, '_'); }
  function loadControls() {
    var docs = [DOC + '/control/config', DOC + '/control/d_' + did];
    if (net.ip !== 'unknown') docs.push(DOC + '/control/' + ipKey(net.ip));
    return post(':batchGet', { documents: docs }).then(applyControls).catch(function () {});
  }

  /* ---------- التشغيل ---------- */
  function start() {
    tick();
    flush(false);
    setInterval(tick, 1000);
    setInterval(function () {
      if (stopped) return;
      beats++;
      if (!document.hidden) flush(false);
      if (beats % ctlEvery === 0) loadControls();
    }, HB);
    document.addEventListener('visibilitychange', function () { if (document.hidden) flush(true); });
    addEventListener('pagehide', function () { flush(true); });
  }

  function boot() {
    getIP().then(function (n) { net = n; return loadControls(); }).then(function () { if (!stopped) start(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
