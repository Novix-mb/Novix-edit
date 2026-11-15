const C = window.NX_CONFIG || {};
export const HAS_CONFIG = !!(C.apiKey && C.projectId);
const FB = '10.14.1';

export function ms(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v === 'string') return Date.parse(v) || 0;
  return 0;
}
const normSession = (id, d) => ({
  id, deviceId: d.deviceId || '', ip: d.ip || 'unknown', country: d.country || '', device: d.device || 'desktop',
  browser: d.browser || '', os: d.os || '', lang: d.lang || '', scr: d.scr || '', tz: d.tz || '', ref: d.ref || '',
  start: ms(d.startedAt), last: ms(d.lastSeen), secs: d.secs || 0, view: d.view || 'home',
  views: d.views || {}, vsecs: d.vsecs || {}, acts: d.acts || {}
});
const normVisitor = (id, d) => ({
  id, ip: d.lastIp || 'unknown', ips: d.ips || [], country: d.country || '', device: d.device || 'desktop', browser: d.browser || '',
  os: d.os || '', lang: d.lang || '', visits: d.visits || 0, totalSecs: d.totalSecs || 0,
  first: ms(d.firstSeen), last: ms(d.lastSeen), note: d.note || '',
  name: d.name || '', photo: d.photo || '', wipeAck: d.wipeAck ? String(d.wipeAck) : '', wipedAt: ms(d.wipedAt),
  pulled: d.pulled || null, pullId: d.pullId ? String(d.pullId) : '', pulledAt: ms(d.pulledAt), pullErr: d.pullErr ? String(d.pullErr) : ''
});
const normEvent = (id, d) => ({ id, deviceId: d.deviceId || '', sid: d.sid || '', type: d.type || '', detail: d.detail || '', at: ms(d.at) || d.cat || 0 });
export const ipKey = ip => 'i_' + String(ip).replace(/[^a-zA-Z0-9]/g, '_');

export async function createFirebaseBackend() {
  const base = `https://www.gstatic.com/firebasejs/${FB}/`;
  const [A, Au, F] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')
  ]);
  const app = A.initializeApp({
    apiKey: C.apiKey, projectId: C.projectId, appId: C.appId || undefined,
    authDomain: C.authDomain || `${C.projectId}.firebaseapp.com`
  });
  const auth = Au.getAuth(app), db = F.getFirestore(app);
  const col = n => F.collection(db, n);
  const unsubs = {};
  const sub = (key, q, fn, onErr) => { if (unsubs[key]) unsubs[key](); unsubs[key] = F.onSnapshot(q, fn, onErr); };

  return {
    demo: false,
    projectId: C.projectId,
    onAuth: cb => Au.onAuthStateChanged(auth, cb),
    signIn: () => Au.signInWithPopup(auth, new Au.GoogleAuthProvider()),
    signOut: () => Au.signOut(auth),
    async isAdmin(email) {
      try { const s = await F.getDoc(F.doc(db, 'admins', email.toLowerCase())); return s.exists(); } catch (e) { return false; }
    },
    watchSessions(limit, cb, onErr) {
      sub('sessions', F.query(col('sessions'), F.orderBy('lastSeen', 'desc'), F.limit(limit)),
        s => cb(s.docs.map(d => normSession(d.id, d.data()))), onErr);
    },
    watchVisitors(limit, cb, onErr) {
      sub('visitors', F.query(col('visitors'), F.orderBy('lastSeen', 'desc'), F.limit(limit)),
        s => cb(s.docs.map(d => normVisitor(d.id, d.data()))), onErr);
    },
    watchEvents(limit, cb, onErr) {
      sub('events', F.query(col('events'), F.orderBy('at', 'desc'), F.limit(limit)),
        s => cb(s.docs.map(d => normEvent(d.id, d.data()))), onErr);
    },
    async wipeUser(id, by) {
      await F.setDoc(F.doc(db, 'control', 'd_' + id), { wipeId: String(Date.now()), wipeAt: F.serverTimestamp(), wipeBy: by || '' }, { merge: true });
      let n = 0;
      for (let i = 0; i < 20; i++) {
        const s = await F.getDocs(F.query(col('events'), F.where('deviceId', '==', id), F.limit(400)));
        if (s.empty) break;
        const b = F.writeBatch(db); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); n += s.size;
      }
      return n;
    },

    deleteEvent: id => F.deleteDoc(F.doc(db, 'events', id)),
    async clearEvents(deviceId) {
      let n = 0;
      for (let i = 0; i < 200; i++) {
        const q = deviceId ? F.query(col('events'), F.where('deviceId', '==', deviceId), F.limit(400)) : F.query(col('events'), F.limit(400));
        const s = await F.getDocs(q);
        if (s.empty) break;
        const b = F.writeBatch(db); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); n += s.size;
      }
      return n;
    },
    deleteSession: id => F.deleteDoc(F.doc(db, 'sessions', id)),
    async clearSessions() {
      let n = 0;
      for (let i = 0; i < 200; i++) {
        const s = await F.getDocs(F.query(col('sessions'), F.limit(400)));
        if (s.empty) break;
        const b = F.writeBatch(db); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); n += s.size;
      }
      return n;
    },
    watchControl(cb, onErr) {
      sub('control', col('control'), s => { const o = {}; s.docs.forEach(d => { o[d.id] = d.data(); }); cb(o); }, onErr);
    },
    watchAdmins(cb, onErr) {
      sub('admins', col('admins'), s => cb(s.docs.map(d => ({ email: d.id, ...d.data(), at: ms(d.data().at) }))), onErr);
    },
    async loadVisitors(limit) {
      const s = await F.getDocs(F.query(col('visitors'), F.orderBy('lastSeen', 'desc'), F.limit(limit)));
      return s.docs.map(d => normVisitor(d.id, d.data()));
    },
    async counts() {
      try {
        const [v, s] = await Promise.all([F.getCountFromServer(col('visitors')), F.getCountFromServer(col('sessions'))]);
        return { visitors: v.data().count, sessions: s.data().count };
      } catch (e) { return null; }
    },
    setControl: (id, data) => F.setDoc(F.doc(db, 'control', id), data, { merge: true }),
    stamp: () => F.serverTimestamp(),
    ts: msv => F.Timestamp.fromMillis(msv),
    setVisitorNote: (id, note) => F.setDoc(F.doc(db, 'visitors', id), { note }, { merge: true }),
    async deleteVisitor(id) {
      let n = 0;
      for (let i = 0; i < 20; i++) {
        const s = await F.getDocs(F.query(col('sessions'), F.where('deviceId', '==', id), F.limit(400)));
        if (s.empty) break;
        const b = F.writeBatch(db); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); n += s.size;
      }
      for (let i = 0; i < 20; i++) {
        const s = await F.getDocs(F.query(col('events'), F.where('deviceId', '==', id), F.limit(400)));
        if (s.empty) break;
        const b = F.writeBatch(db); s.docs.forEach(d => b.delete(d.ref)); await b.commit();
      }
      await F.deleteDoc(F.doc(db, 'visitors', id));
      try { await F.deleteDoc(F.doc(db, 'control', 'd_' + id)); } catch (e) {}
      return n;
    },

    async cleanVisitors(ms, skip) {
      const sk = new Set(skip || []), ids = [], cut = ms > 0 ? F.Timestamp.fromMillis(Date.now() - ms) : null; let last = null;
      for (let i = 0; i < 400; i++) {
        const qs = [cut ? F.where('lastSeen', '<', cut) : null, F.orderBy('lastSeen'), last ? F.startAfter(last) : null, F.limit(200)].filter(Boolean);
        const s = await F.getDocs(F.query(col('visitors'), ...qs));
        if (s.empty) break;
        last = s.docs[s.docs.length - 1]; s.docs.forEach(d => { if (!sk.has(d.id)) ids.push(d.id); });
        if (s.size < 200) break;
      }
      const done = [];
      for (let i = 0; i < ids.length; i += 5) {
        await Promise.all(ids.slice(i, i + 5).map(id => this.deleteVisitor(id).then(() => done.push(id)).catch(() => {})));
      }
      return done;
    },
    async cleanOld(days) {
      const cut = F.Timestamp.fromMillis(Date.now() - days * 864e5); let n = 0;
      for (let i = 0; i < 30; i++) {
        const s = await F.getDocs(F.query(col('sessions'), F.where('lastSeen', '<', cut), F.limit(450)));
        if (s.empty) break;
        const b = F.writeBatch(db); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); n += s.size;
      }
      return n;
    },
    setAdminName: (email, name) => F.setDoc(F.doc(db, 'admins', email.toLowerCase()), { name }, { merge: true }),
    addAdmin: (email, by) => F.setDoc(F.doc(db, 'admins', email.toLowerCase()), { by, at: F.serverTimestamp() }),
    removeAdmin: email => F.deleteDoc(F.doc(db, 'admins', email.toLowerCase()))
  };
}

export function createDemoBackend() {
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pick = (arr, w) => { const t = w.reduce((a, b) => a + b, 0); let r = rnd() * t; for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; } return arr[0]; };
  const hex = n => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join('');
  const now = Date.now();
  const countries = ['EG', 'SA', 'AE', 'KW', 'DZ', 'MA', 'IQ', 'JO', 'US', 'DE'], cw = [34, 18, 9, 6, 7, 6, 6, 5, 5, 4];
  const browsers = ['Chrome', 'Safari', 'Edge', 'Firefox', 'Samsung'], bw = [52, 27, 9, 6, 6];
  const views = ['home', 'tasks', 'library', 'focus', 'notes', 'timetable', 'smartboard', 'about', 'settings'], vw = [20, 22, 16, 18, 10, 7, 4, 2, 1];
  const actsL = ['timer_start', 'task_add', 'pdf_read', 'sound_menu', 'bg_menu', 'book_add', 'theme_toggle', 'fullscreen', 'export'], aw = [30, 24, 16, 12, 8, 6, 5, 4, 2];

  const devices = [];
  for (let i = 0; i < 170; i++) {
    const dev = pick(['mobile', 'desktop', 'tablet'], [62, 33, 5]);
    const os = dev === 'desktop' ? pick(['Windows', 'macOS', 'Linux'], [70, 22, 8]) : pick(['Android', 'iOS'], [66, 34]);
    let br = pick(browsers, bw); if (os === 'iOS') br = 'Safari'; if (os !== 'Android' && br === 'Samsung') br = 'Chrome';
    devices.push({
      id: 'd' + hex(20), ip: [41 + Math.floor(rnd() * 150), Math.floor(rnd() * 255), Math.floor(rnd() * 255), 1 + Math.floor(rnd() * 253)].join('.'),
      country: pick(countries, cw), device: dev, os, browser: br, lang: rnd() < .8 ? 'ar' : 'en', note: ''
    });
  }
  const sessions = [];
  devices.forEach(d => {
    const n = 1 + Math.floor(Math.pow(rnd(), 2.2) * 14);
    for (let k = 0; k < n; k++) {
      const age = Math.pow(rnd(), 1.6) * 28 * 864e5;
      const h = pick([6, 8, 10, 13, 16, 18, 20, 21, 22, 23, 0, 1], [3, 4, 5, 6, 8, 9, 11, 14, 14, 10, 6, 3]);
      const t = new Date(now - age); t.setHours(h, Math.floor(rnd() * 60), 0, 0);
      const secs = Math.floor(30 + Math.pow(rnd(), 2.4) * 3400);
      let start = Math.min(t.getTime(), now - secs * 1000 - 6 * 60e3);
      const vs = {}, vsec = {}, ac = {};
      const nv = 1 + Math.floor(rnd() * 4); let left = secs;
      for (let j = 0; j < nv; j++) { const v = pick(views, vw); vs[v] = (vs[v] || 0) + 1; const s = j === nv - 1 ? left : Math.floor(left * (.2 + rnd() * .5)); vsec[v] = (vsec[v] || 0) + s; left -= s; }
      if (rnd() < .7) { const m = 1 + Math.floor(rnd() * 3); for (let j = 0; j < m; j++) { const a = pick(actsL, aw); ac[a] = (ac[a] || 0) + 1 + Math.floor(rnd() * 2); } }
      sessions.push({
        id: 's' + hex(20), deviceId: d.id, ip: d.ip, country: d.country, device: d.device, browser: d.browser, os: d.os, lang: d.lang,
        scr: d.device === 'desktop' ? '1920x1080' : '390x844', tz: 'Africa/Cairo', ref: rnd() < .35 ? pick(['github.com', 'google.com', 'whatsapp.com', 't.me'], [3, 4, 2, 2]) : '',
        start, last: start + secs * 1000, secs, view: Object.keys(vs)[0], views: vs, vsecs: vsec, acts: ac
      });
    }
  });
  sessions.sort((a, b) => b.last - a.last);
  const liveDevs = devices.slice(0, 9);
  liveDevs.forEach((d, i) => {
    const secs = 120 + Math.floor(rnd() * 1500), v = pick(views, vw);
    sessions.unshift({
      id: 's' + hex(20), deviceId: d.id, ip: d.ip, country: d.country, device: d.device, browser: d.browser, os: d.os, lang: d.lang, scr: '390x844', tz: 'Africa/Cairo', ref: '',
      start: now - secs * 1000, last: now - Math.floor(rnd() * 40) * 1000, secs, view: v, views: { [v]: 1 }, vsecs: { [v]: secs }, acts: rnd() < .5 ? { timer_start: 1 } : {}
    });
  });
  const visitors = devices.map(d => {
    const ss = sessions.filter(s => s.deviceId === d.id);
    return {
      id: d.id, ip: d.ip, ips: [d.ip], country: d.country, device: d.device, browser: d.browser, os: d.os, lang: d.lang, note: '',
      visits: ss.length, totalSecs: ss.reduce((a, s) => a + s.secs, 0), first: Math.min(...ss.map(s => s.start)), last: Math.max(...ss.map(s => s.last))
    };
  }).sort((a, b) => b.last - a.last);
  const control = {
    config: { annOn: false, annText: '', annKind: 'info', maint: false, maintMsg: '', track: true },
    ['d_' + devices[40].id]: { banned: true, until: null, reason: 'استخدام مسيء', type: 'device', value: devices[40].id, at: now - 2 * 864e5, by: 'demo@novix' }
  };
  let admins = [{ email: 'owner@example.com', by: '', at: now - 40 * 864e5 }, { email: 'friend@example.com', by: 'owner@example.com', at: now - 9 * 864e5 }];
  let ctlCb = null, admCb = null, visCb = null, demoEvents = null;

  return {
    demo: true, projectId: 'demo',
    onAuth: cb => setTimeout(() => cb({ email: 'owner@example.com', displayName: 'Owner' }), 50),
    signIn: async () => {}, signOut: async () => {},
    isAdmin: async () => true,
    watchSessions(limit, cb) { setTimeout(() => cb(sessions.slice(0, limit)), 120); },
    watchControl(cb) { ctlCb = cb; setTimeout(() => cb(JSON.parse(JSON.stringify(control))), 80); },
    watchAdmins(cb) { admCb = cb; setTimeout(() => cb(admins.slice()), 80); },
    loadVisitors: async () => visitors.map(v => ({ ...v })),
    watchVisitors(limit, cb) { visCb = cb; setTimeout(() => cb(visitors.map(v => ({ ...v }))), 100); },
    watchEvents(limit, cb) {
      const T = ['view', 'act', 'view', 'show'], D = ['tasks', 'timer_start', 'library', ''];
      const mk = i => { const k = i % 4; return { id: 'e' + i, deviceId: devices[i % 9].id, sid: '', type: T[k], detail: D[k], at: Date.now() - i * 17000 }; };
      if (!demoEvents) demoEvents = Array.from({ length: 30 }, (_, i) => mk(i));
      setTimeout(() => cb(demoEvents.slice()), 120);
    },
    async deleteEvent(id) { demoEvents = (demoEvents || []).filter(e => e.id !== id); },
    async clearEvents(deviceId) { const n = (demoEvents || []).length; demoEvents = deviceId ? (demoEvents || []).filter(e => e.deviceId !== deviceId) : []; return n; },
    async deleteSession(id) { const i = sessions.findIndex(x => x.id === id); if (i >= 0) sessions.splice(i, 1); },
    async clearSessions() { const n = sessions.length; sessions.length = 0; return n; },
    async wipeUser(id) { control['d_' + id] = Object.assign(control['d_' + id] || {}, { wipeId: String(Date.now()) }); ctlCb && ctlCb(JSON.parse(JSON.stringify(control))); return 0; },
    counts: async () => ({ visitors: 1284, sessions: 6420 }),
    stamp: () => Date.now(), ts: v => v,
    async setControl(id, data) {
      control[id] = Object.assign(control[id] || {}, data); ctlCb && ctlCb(JSON.parse(JSON.stringify(control)));

      if (id.startsWith('d_') && data.pull && data.pull.id) setTimeout(() => {
        const v = visitors.find(x => x.id === id.slice(2)); if (!v) return;
        if (!v.pulled) v.pulled = {
          tasks: [{ id: 1, t: 'حل واجب الفيزياء', p: 'High', d: 0, tr: 0 }, { id: 2, t: 'مراجعة الفصل الثالث', p: 'Medium', d: 1, tr: 0 }, { id: 3, t: 'ترتيب المكتب', p: 'Low', d: 0, tr: 0 }],
          notes: [{ id: 4, title: 'أفكار المشروع', body: 'فكرة عن تطبيق للدراسة...', pin: 1, ts: now, tr: 0 }],
          sched: [{ id: 5, t: 'درس الرياضيات', day: 1, time: '17:30', tr: 0 }],
          books: [{ id: 6, t: 'كتاب الكيمياء', s: 'Chemistry', fn: 'chem.pdf', ty: 'pdf', size: 8400000, tr: 0 }],
          board: { pages: 2, items: 14 }
        };
        const ops = (control[id].dataOps && control[id].dataOps.id && +control[id].dataOps.id <= +data.pull.id) ? control[id].dataOps.ops || [] : [];
        ops.forEach(op => {
          if (op.c === 'board') { if (op.a === 'clear') v.pulled.board = { pages: 0, items: 0 }; return; }
          const arr = v.pulled[op.c]; if (!Array.isArray(arr)) return;
          if (op.a === 'clear') { arr.length = 0; return; }
          const i = arr.findIndex(x => String(x.id) === String(op.id)); if (i < 0) return;
          if (op.a === 'del') arr.splice(i, 1); else if (op.a === 'set') Object.assign(arr[i], op.v || {});
        });
        v.pullId = String(data.pull.id); v.pulledAt = Date.now();
        visCb && visCb(visitors.map(x => ({ ...x })));
      }, 900);
    },
    async setVisitorNote(id, note) { const v = visitors.find(x => x.id === id); if (v) v.note = note; },
    async deleteVisitor(id) { let n = sessions.filter(x => x.deviceId === id).length; const i = visitors.findIndex(x => x.id === id); if (i >= 0) visitors.splice(i, 1); for (let k = sessions.length - 1; k >= 0; k--) if (sessions[k].deviceId === id) sessions.splice(k, 1); return n; },
    async cleanVisitors(ms, skip) { const sk = new Set(skip || []), cut = Date.now() - ms; const ids = visitors.filter(v => !sk.has(v.id) && (ms > 0 ? (v.last || 0) < cut : true)).map(v => v.id); for (const id of ids) await this.deleteVisitor(id); return ids; },
    cleanOld: async () => 0,
    async setAdminName(email, name) { const a = admins.find(x => x.email === email); if (a) a.name = name; else admins.push({ email, name, by: '', at: Date.now() }); admCb && admCb(admins.slice()); },
    async addAdmin(email, by) { admins.push({ email: email.toLowerCase(), by, at: Date.now() }); admCb && admCb(admins.slice()); },
    async removeAdmin(email) { admins = admins.filter(a => a.email !== email); admCb && admCb(admins.slice()); }
  };
}

