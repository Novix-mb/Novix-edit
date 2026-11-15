import { L } from './i18n.js';
import { HAS_CONFIG, createFirebaseBackend, createDemoBackend, ms, ipKey } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; };
const params = new URLSearchParams(location.search);
const C = window.NX_CONFIG || {};

let lang = ls('nx.admin.lang') || 'ar';
let theme = ls('nx.admin.theme') || 'dark';
const t = (k, v) => { let s = (L[lang] && L[lang][k]) ?? L.en[k] ?? k; if (v) for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; };
const loc = () => (lang === 'ar' ? 'ar-u-nu-latn' : 'en-US');
const nf = n => new Intl.NumberFormat('en-US').format(Math.round(n));
const kb = n => !n ? '—' : n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
function applyLang() {
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dataset.theme = theme;
}
const fmtDur = s => {
  s = Math.max(0, Math.round(s));
  if (s < 60) return s + t('d_s');
  if (s < 3600) return Math.floor(s / 60) + t('d_m') + (s % 60 ? ' ' + (s % 60) + t('d_s') : '');
  return Math.floor(s / 3600) + t('d_h') + ' ' + Math.floor((s % 3600) / 60) + t('d_m');
};
const ago = m => {
  if (!m) return '—'; const s = Math.max(0, (Date.now() - m) / 1000);
  if (s < 25) return t('ago_now'); if (s < 60) return t('ago_s', { n: Math.round(s) });
  if (s < 3600) return t('ago_m', { n: Math.round(s / 60) }); if (s < 86400) return t('ago_h', { n: Math.round(s / 3600) });
  return t('ago_d', { n: Math.round(s / 86400) });
};
const dtm = m => m ? new Date(m).toLocaleString(loc(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const flag = cc => (cc && /^[A-Za-z]{2}$/.test(cc)) ? String.fromCodePoint(...cc.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))) : '🌐';
const cname = cc => { try { return cc ? new Intl.DisplayNames([lang], { type: 'region' }).of(cc.toUpperCase()) : t('unknown'); } catch (e) { return cc || t('unknown'); } };
const short = id => (id || '').slice(0, 7);
const secLabel = k => { const v = t('sec_' + k); return v === 'sec_' + k ? k : v; };
const actLabel = k => { const v = t('act_' + k); return v === 'act_' + k ? k : v; };
const devLabel = d => t(d === 'mobile' || d === 'tablet' || d === 'desktop' ? d : 'unknown');
const COLORS = ['var(--acc)', 'var(--acc2)', 'var(--acc3)', 'var(--warn)', '#f78fb3', '#8d9b97'];

const IC = {
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  layers: '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>', msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>', phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  tablet: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 18h.01"/>', userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>',
  mega: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>', wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>', bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
  'wifi-off': '<path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'
};
Object.assign(IC, {
  up: '<path d="M7 17 17 7M7 7h10v10"/>', down: '<path d="M7 7l10 10M17 7v10H7"/>',
  dots: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'
});
const ic = n => `<svg class="i" viewBox="0 0 24 24">${IC[n] || ''}</svg>`;
const devIc = d => ic(d === 'mobile' ? 'phone' : d === 'tablet' ? 'tablet' : 'monitor');

const vis = id => S.visitors.find(v => v.id === id);
const vName = (id, v) => ((v || vis(id) || {}).name || '').trim();
const avt = (id, dev, size = 36) => { const v = vis(id); return v && v.photo ? `<img class="avt" style="width:${size}px;height:${size}px" src="${esc(v.photo)}" alt="">` : `<span class="ico" style="width:${size}px;height:${size}px">${devIc(dev || (v && v.device))}</span>`; };
function wipeState(id) {
  const c = S.control['d_' + id]; if (!c || !c.wipeId) return null;
  const v = vis(id); return v && v.wipeAck === String(c.wipeId) ? { done: true, at: v.wipedAt } : { done: false, at: ms(c.wipeAt) };
}
const wipePill = id => { const w = wipeState(id); return !w ? '' : (w.done ? `<span class="pill ok">${ic('check')}${t('wipe_ok')}</span>` : `<span class="pill wr"><span class="live-dot"></span>${t('wipe_pending')}</span>`); };
function evText(e) {
  if (e.type === 'view') return t('ev_view') + ' ' + secLabel(e.detail);
  if (e.type === 'open') return t('ev_open') + ' · ' + secLabel(e.detail);
  if (e.type === 'act') return actLabel(e.detail);
  if (e.type === 'hide') return t('ev_hide');
  if (e.type === 'show') return t('ev_show');
  return e.type;
}
const evIc = e => e.type === 'view' ? ['eye', '--acc2'] : e.type === 'open' ? ['users', '--acc'] : e.type === 'act' ? ['bolt', '--warn'] : e.type === 'hide' ? ['moon', '--muted'] : ['sun', '--ok'];
const evRow = (e, who, del) => { const [i, c] = evIc(e); return `<div class="evr">${who ? avt(e.deviceId, null, 34) : ''}<span class="evic" style="--c:var(${c})">${ic(i)}</span><div><b>${who ? esc(vName(e.deviceId) || short(e.deviceId)) : ''}</b><span>${esc(evText(e))}</span></div><small>${ago(e.at)}</small>${del ? `<button class="ib evx" data-act="evdel" data-id="${esc(e.id)}" title="${esc(t('f_del'))}">${ic('trash')}</button>` : ''}</div>`; };
function pFeed() {
  const list = S.events.slice(0, 120), devs = new Set(list.map(e => e.deviceId)).size;
  return `<div class="card"><div class="tbar" style="justify-content:space-between;margin-bottom:8px"><h3 style="margin:0">${ic('bolt')} ${t('f_title')}<small>${nf(list.length)}</small></h3>${list.length ? `<button class="btn sm bad" data-act="evclear">${ic('trash')}${t('f_clear_all')}</button>` : ''}</div>${list.length ? `<div class="sumrow"><span><b>${nf(devs)}</b> ${t('th_device')}</span><span>${t('th_last')}: <b>${ago(list[0].at)}</b></span></div><div class="evl">${list.map(e => evRow(e, true, true)).join('')}</div>` : emptyBox()}</div>`;
}

const S = {
  B: null, user: null, demo: false, page: (location.hash || '#overview').slice(1) || 'overview', range: ls('nx.admin.range') || '7d',
  sessions: [], visitors: [], events: [], control: {}, admins: [], counts: null, loaded: false, err: null,
  limit: +ls('nx.admin.limit') || 500, vq: '', vf: 'all', vs: 'last', vShow: 50, sq: '', sShow: 50
};
const PAGES = ['overview', 'live', 'feed', 'visitors', 'sessions', 'usage', 'controls', 'team', 'settings'];
if (!PAGES.includes(S.page)) S.page = 'overview';
const hbSec = Math.max(30, Math.min(300, +C.heartbeatSec || 60));
const onlineThr = () => Math.max(90, hbSec * 1.6) * 1000;
const root = $('#root');

const cutoff = r => { const n = new Date(); if (r === 'today') { n.setHours(0, 0, 0, 0); return n.getTime(); } if (r === '7d') return Date.now() - 7 * 864e5; if (r === '30d') return Date.now() - 30 * 864e5; return 0; };
const banActive = o => !!(o && o.banned && (!ms(o.until) || ms(o.until) > Date.now()));
const isBanned = v => banActive(S.control['d_' + v.id]) || (v.ip && banActive(S.control[ipKey(v.ip)]));

function calc() {
  const now = Date.now(), cut = cutoff(S.range), thr = onlineThr();
  const ss = S.sessions.filter(s => s.start >= cut);
  const onlineS = S.sessions.filter(s => now - s.last < thr);
  const onlineDev = new Map(); onlineS.forEach(s => { if (!onlineDev.has(s.deviceId) || onlineDev.get(s.deviceId).last < s.last) onlineDev.set(s.deviceId, s); });
  const perDev = new Map(); ss.forEach(s => { const o = perDev.get(s.deviceId) || { n: 0, last: s }; o.n++; if (s.last > o.last.last) o.last = s; perDev.set(s.deviceId, o); });
  const vmap = new Map(S.visitors.map(v => [v.id, v]));
  let returning = 0; perDev.forEach((o, id) => { const v = vmap.get(id); if (v ? v.visits > 1 : o.n > 1) returning++; });
  const hourly = S.range === 'today', n = hourly ? 24 : (S.range === '7d' ? 7 : 30);
  const b0 = new Date(); b0.setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: n }, (_, i) => {
    const tt = hourly ? b0.getTime() + i * 36e5 : b0.getTime() - (n - 1 - i) * 864e5;
    return { t: tt, end: tt + (hourly ? 36e5 : 864e5), s: 0, u: new Set() };
  });
  ss.forEach(s => { const b = buckets.find(x => s.start >= x.t && s.start < x.end); if (b) { b.s++; b.u.add(s.deviceId); } });
  const sum = key => { const m = {}; ss.forEach(s => { for (const k in s[key]) m[k] = (m[k] || 0) + s[key][k]; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const cnt = fn => { const m = {}; perDev.forEach(o => { const k = fn(o.last) || '—'; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const hours = Array(24).fill(0), wd = Array(7).fill(0), durB = Array(5).fill(0);
  ss.forEach(s => { const d = new Date(s.start); hours[d.getHours()]++; wd[d.getDay()]++; durB[s.secs < 60 ? 0 : s.secs < 300 ? 1 : s.secs < 900 ? 2 : s.secs < 1800 ? 3 : 4]++; });
  const avg = ss.length ? ss.reduce((a, s) => a + s.secs, 0) / ss.length : 0;
  let prev = null;
  if (cut > 0 && S.sessions.length) {
    const p0 = hourly ? cut - 864e5 : cut - (now - cut), p1 = hourly ? now - 864e5 : cut;
    const minStart = S.sessions.reduce((m, s) => Math.min(m, s.start || m), Infinity);
    if (S.sessions.length < S.limit || minStart <= p0) {
      const ps = S.sessions.filter(s => s.start >= p0 && s.start < p1);
      prev = { n: ps.length, u: new Set(ps.map(s => s.deviceId)).size, avg: ps.length ? ps.reduce((a, s) => a + s.secs, 0) / ps.length : 0 };
    }
  }
  return {
    ss, onlineS, onlineDev, uniq: perDev.size, avg, returning, buckets, hours, wd, durB, hourly, prev,
    devices: cnt(s => s.device), countries: cnt(s => s.country), browsers: cnt(s => s.browser), oss: cnt(s => s.os),
    vsecs: sum('vsecs'), views: sum('views'), acts: sum('acts')
  };
}

const niceMax = v => { if (v <= 5) return 5; const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
function smooth(pts) {
  if (pts.length < 3) return pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}
let sparkId = 0;
function spark(vals, color = 'var(--acc)') {
  const W = 120, H = 40, n = vals.length, mx = Math.max(1, ...vals);
  if (n < 2) return '';
  const pts = vals.map((v, i) => [+(i * W / (n - 1)).toFixed(1), +(H - 5 - (v / mx) * (H - 12)).toFixed(1)]), d = smooth(pts), id = 'sg' + (++sparkId);
  return `<svg class="sp" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${d} L${W} ${H} L0 ${H} Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}
function lineChart(bk, hourly) {
  const W = 760, H = 270, pl = 40, pr = 14, pt = 26, pb = 30, n = bk.length;
  const vals = bk.map(b => b.s), mxv = Math.max(1, ...vals), mx = niceMax(mxv), iw = W - pl - pr, ih = H - pt - pb;
  const X = i => pl + (n === 1 ? iw / 2 : i * iw / (n - 1)), Y = v => pt + ih - (v / mx) * ih;
  const lab = (b, long) => hourly ? new Date(b.t).getHours() + ':00' : new Date(b.t).toLocaleDateString(loc(), long ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' });
  const ps = bk.map((b, i) => [+X(i).toFixed(1), +Y(b.s).toFixed(1)]), pu = bk.map((b, i) => [+X(i).toFixed(1), +Y(b.u.size).toFixed(1)]);
  const total = vals.reduce((a, b) => a + b, 0), avg = total / n, pk = vals.indexOf(mxv);
  let g = ''; for (let i = 0; i <= 4; i++) { const y = pt + ih - ih * i / 4; g += `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end">${nf(mx * i / 4)}</text>`; }
  const every = Math.ceil(n / 7); let xl = '';
  bk.forEach((b, i) => { if (i % every === 0 || i === n - 1) xl += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${lab(b)}</text>`; });
  const area = smooth(ps) + ` L${ps[n - 1][0]} ${pt + ih} L${ps[0][0]} ${pt + ih} Z`;
  const sw = n === 1 ? iw : iw / (n - 1);
  const avgL = total ? `<line class="avg" x1="${pl}" x2="${W - pr}" y1="${Y(avg).toFixed(1)}" y2="${Y(avg).toFixed(1)}"/><text class="avl" x="${pl + 6}" y="${(Y(avg) - 5).toFixed(1)}" text-anchor="start">${t('k_avgb')} ${avg < 10 ? avg.toFixed(1) : nf(avg)}</text>` : '';
  const pkM = total ? `<circle class="pkm" cx="${ps[pk][0]}" cy="${ps[pk][1]}" r="5"/><text class="pkt" x="${ps[pk][0]}" y="${ps[pk][1] - 11}" text-anchor="middle">${nf(mxv)}</text>` : '';
  const cols = bk.map((b, i) => {
    const d = i && vals[i - 1] ? Math.round((b.s - vals[i - 1]) / vals[i - 1] * 100) : null;
    const tip = lab(b, true) + '|' + t('s_visits') + ': ' + b.s + '|' + t('s_unique') + ': ' + b.u.size + (d != null ? '|' + (d > 0 ? '+' : '') + d + '% ' + t('vs_prev_b') : '');
    return `<g class="col"><rect class="hit" x="${(X(i) - sw / 2).toFixed(1)}" y="${pt}" width="${sw.toFixed(1)}" height="${ih}" data-tip="${esc(tip)}"/><line class="cx" x1="${ps[i][0]}" x2="${ps[i][0]}" y1="${pt}" y2="${pt + ih}"/><circle class="dt2" cx="${pu[i][0]}" cy="${pu[i][1]}" r="4"/><circle class="dt" cx="${ps[i][0]}" cy="${ps[i][1]}" r="5"/></g>`;
  }).join('');
  const stats = `<div class="cstats"><div><small>${t('k_totalv')}</small><b>${nf(total)}</b></div><div><small>${t('k_peak')}</small><b>${nf(mxv)}</b>${total ? `<em>${lab(bk[pk])}</em>` : ''}</div><div><small>${t('k_avgb')}</small><b>${avg < 10 ? avg.toFixed(1) : nf(avg)}</b><em>${t(hourly ? 'per_h' : 'per_d')}</em></div></div>`;
  return `${stats}<div style="direction:ltr"><svg class="chart" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".4"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>${g}${xl}${avgL}<path d="${area}" fill="url(#ga)"/><path class="ln" d="${smooth(ps)}" fill="none" stroke="var(--acc)" stroke-width="2.8" stroke-linecap="round"/><path d="${smooth(pu)}" fill="none" stroke="var(--acc2)" stroke-width="2" stroke-dasharray="5 5" stroke-linecap="round"/>${pkM}${cols}</svg></div>
  <div class="legend"><span><i style="background:var(--acc)"></i>${t('s_visits')}</span><span><i style="background:var(--acc2)"></i>${t('s_unique')}</span><span><i style="background:var(--warn)"></i>${t('k_avgb')}</span></div>`;
}
function donut(items, labelFn) {
  const tot = items.reduce((a, b) => a + b[1], 0); if (!tot) return emptyBox();
  const r = 52, c = 2 * Math.PI * r, top = items.slice(0, 5), rest = items.slice(5).reduce((a, b) => a + b[1], 0);
  const list = rest ? top.concat([['__o', rest]]) : top, gap = list.length > 1 ? 3 : 0;
  let off = 0, segs = '';
  list.forEach(([k, v], i) => {
    const len = v / tot * c, nm = k === '__o' ? t('other') : labelFn(k);
    segs += `<circle class="seg" data-tip="${esc(nm + '|' + nf(v) + ' · ' + (v / tot * 100).toFixed(1) + '%')}" cx="70" cy="70" r="${r}" fill="none" stroke="${COLORS[i]}" stroke-width="16" stroke-dasharray="${Math.max(0, len - gap).toFixed(1)} ${c.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 70 70)"/>`;
    off += len;
  });
  const lg = list.map(([k, v], i) => `<div><i style="background:${COLORS[i]}"></i><span>${esc(k === '__o' ? t('other') : labelFn(k))}</span><b>${nf(v)}</b><em>${Math.round(v / tot * 100)}%</em></div>`).join('');
  return `<div class="donut-wrap"><svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--line)" stroke-width="16"/>${segs}<text x="70" y="68" text-anchor="middle" style="font-size:24px;font-weight:800;fill:var(--text)">${nf(tot)}</text><text x="70" y="86" text-anchor="middle" style="font-size:10.5px;fill:var(--muted)">${t('s_unique')}</text></svg><div class="lg">${lg}</div></div>`;
}
function bars(items, o = {}) {
  if (!items.length) return emptyBox();
  const list = items.slice(0, o.max || 6), mx = Math.max(1, ...list.map(i => i[1])), tot = items.reduce((a, b) => a + b[1], 0) || 1;
  const pc = v => { const p = v / tot * 100; return (p < 10 ? p.toFixed(1) : Math.round(p)) + '%'; };
  return `<div class="bars">${list.map(([k, v], i) => { const nm = o.label ? o.label(k) : k, val = o.fmt ? o.fmt(v) : nf(v);
    return `<div class="bar" data-tip="${esc(nm + '|' + val + ' · ' + pc(v))}"><div class="row"><span><em class="rk">${i + 1}</em>${o.pre ? o.pre(k) : ''}${esc(nm)}</span><b>${val}${o.pct === false ? '' : `<em>${pc(v)}</em>`}</b></div><div class="tr"><i style="width:${(v / mx * 100).toFixed(1)}%;--d:${i * 70}ms"></i></div></div>`; }).join('')}</div>`;
}
function heat(arr) {
  const mx = Math.max(1, ...arr), pk = arr.indexOf(Math.max(...arr)), tot = arr.reduce((a, b) => a + b, 0);
  const cell = (v, i) => `<i class="${v && v === mx ? 'pk' : ''}" style="--a:${(v / mx).toFixed(2)}" data-tip="${esc(i + ':00 – ' + ((i + 1) % 24) + ':00|' + t('s_visits') + ': ' + v + (tot ? ' · ' + Math.round(v / tot * 100) + '%' : ''))}"><span>${i}</span></i>`;
  return `<div class="heat">${arr.map(cell).join('')}</div><div class="heat-l"><span>${t('less')}</span><u></u><span>${t('more')}</span>${tot ? `<b>${t('k_peak')} · ${pk}:00</b>` : ''}</div>`;
}
function cols(items) {
  const mx = Math.max(1, ...items.map(i => i[1])), tot = items.reduce((a, b) => a + b[1], 0);
  if (!tot) return emptyBox();
  return `<div class="cols">${items.map(([k, v], i) => `<div class="col2 ${v === mx ? 'pk' : ''}" data-tip="${esc(k + '|' + nf(v) + ' · ' + Math.round(v / tot * 100) + '%')}"><b>${nf(v)}</b><i style="height:${Math.max(3, v / mx * 100).toFixed(1)}%;animation-delay:${i * 50}ms"></i><span>${esc(k)}</span></div>`).join('')}</div>`;
}
const emptyBox = () => `<div class="empty"><b>${t('nodata')}</b>${t('nodata_sub')}</div>`;
const dl = d => d == null || !isFinite(d) ? '' : `<span class="dl ${d >= 0 ? 'up' : 'dn'}" data-tip="${esc(t('vs_prev'))}">${ic(d >= 0 ? 'up' : 'down')}${Math.abs(Math.round(d))}%</span>`;
const kpi = (i, v, l, o = {}) => `<div class="card kpi" style="--c:${o.c || 'var(--acc)'}"><div class="kh"><div class="ic">${ic(i)}</div>${dl(o.d)}</div><div class="v">${v}</div><div class="l">${l}</div>${o.sp || ''}</div>`;
const num = n => `<span data-n="${Math.round(n)}">${nf(n)}</span>`;
function countUp(scope) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('[data-n]', scope).forEach(el => {
    const to = +el.dataset.n; if (!isFinite(to) || to < 2) return;
    const t0 = performance.now(), dur = 800;
    const f = now => { const p = Math.min(1, (now - t0) / dur); el.textContent = nf(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}

function limitNote() { return S.sessions.length >= S.limit ? `<div class="note-ln">${t('limit_note', { n: nf(S.limit) })}</div>` : ''; }

function hero(a) {
  const u = S.user || {}, h = new Date().getHours(), g = t(h < 5 ? 'g_night' : h < 12 ? 'g_morning' : h < 18 ? 'g_noon' : 'g_evening');
  const nm = String(u.displayName || (u.email || '').split('@')[0] || '').split(' ')[0];
  const cfg = S.control.config || {}, today = S.sessions.filter(s => s.start >= cutoff('today')).length;
  const live = Array.from(a.onlineDev.values()).sort((x, y) => y.last - x.last).slice(0, 5);
  const flags = [cfg.maint ? `<span class="pill wr">${ic('wrench')}${t('hero_maint')}</span>` : '', cfg.annOn ? `<span class="pill in">${ic('mega')}${t('hero_ann')}</span>` : '', cfg.track === false ? `<span class="pill bd">${ic('alert')}${t('hero_notrack')}</span>` : ''].join('');
  return `<section class="hero"><div class="hero-t"><small>${g}</small><h2>${esc(nm)} 👋</h2><p>${t('hero_sub', { n: nf(a.onlineDev.size), m: nf(today) })}</p><div class="hero-f">${flags}</div>
    <div class="hero-a"><button class="btn pri" data-act="nav" data-page="live">${ic('pulse')}${t('nav_live')}</button><button class="btn" data-act="nav" data-page="visitors">${ic('users')}${t('nav_visitors')}</button><button class="btn" data-act="nav" data-page="controls">${ic('sliders')}${t('nav_controls')}</button></div></div>
    <div class="hero-r"><div class="ring"><div><b>${num(a.onlineDev.size)}</b><small>${t('k_online')}</small></div></div>${live.length ? `<div class="stack">${live.map(s => avt(s.deviceId, s.device, 36)).join('')}</div>` : ''}</div></section>`;
}

function pOverview() {
  const a = calc(), spk = a.buckets.map(b => b.s), spu = a.buckets.map(b => b.u.size), p = a.prev;
  const ret = a.uniq ? Math.round(a.returning / a.uniq * 100) : 0, d = (c, q) => p && q ? (c - q) / q * 100 : null;
  return `${hero(a)}
  <div class="grid g-kpi">
    ${kpi('pulse', `<span class="live-dot"></span>${num(a.onlineDev.size)}`, t('k_online'), { c: 'var(--ok)' })}
    ${kpi('users', num(a.uniq), t('k_unique'), { c: 'var(--acc)', d: d(a.uniq, p && p.u), sp: spark(spu) })}
    ${kpi('layers', num(a.ss.length), t('k_sessions'), { c: 'var(--acc2)', d: d(a.ss.length, p && p.n), sp: spark(spk, 'var(--acc2)') })}
    ${kpi('clock', fmtDur(a.avg), t('k_avg'), { c: 'var(--acc3)', d: d(a.avg, p && p.avg) })}
    ${kpi('globe', num(S.counts ? S.counts.visitors : S.visitors.length), `${t('k_total')} · ${t('k_alltime')}`, { c: 'var(--warn)' })}
    ${kpi('repeat', ret + '%', t('k_return'), { c: 'var(--pink)' })}
  </div>
  <div class="grid g-2">
    <div class="card"><h3>${ic('pulse')} ${t('c_traffic')}</h3>${a.ss.length ? lineChart(a.buckets, a.hourly) : emptyBox()}${limitNote()}</div>
    <div class="card"><h3>${ic('eye')} ${t('c_live')}<small>${nf(a.onlineDev.size)}</small></h3>${liveList(a, 6)}</div>
  </div>
  <div class="grid g-3">
    <div class="card"><h3>${ic('monitor')} ${t('c_devices')}</h3>${donut(a.devices, devLabel)}</div>
    <div class="card"><h3>${ic('globe')} ${t('c_countries')}</h3>${bars(a.countries, { label: cname, pre: k => `<span class="flag">${flag(k)}</span>` })}</div>
    <div class="card"><h3>${ic('layers')} ${t('c_browsers')}</h3>${bars(a.browsers, { max: 5 })}<h3 style="margin-top:20px">${ic('gear')} ${t('c_os')}</h3>${bars(a.oss, { max: 4 })}</div>
  </div>
  <div class="grid g-3">
    <div class="card"><h3>${ic('clock')} ${t('c_sections')}</h3>${bars(a.vsecs, { label: secLabel, fmt: fmtDur })}</div>
    <div class="card"><h3>${ic('bolt')} ${t('c_actions')}</h3>${bars(a.acts, { label: actLabel })}</div>
    <div class="card"><h3>${ic('clock')} ${t('c_hours')}</h3>${heat(a.hours)}<h3 style="margin-top:20px">${ic('layers')} ${t('c_weekday')}</h3>${cols(a.wd.map((v, i) => [t('wd')[i], v]))}</div>
  </div>
  <div class="card"><h3>${ic('layers')} ${t('c_recent')}</h3>${sessionTable(a.ss.slice(0, 8), false)}</div>`;
}

function liveList(a, max) {
  const list = Array.from(a.onlineDev.values()).sort((x, y) => y.last - x.last).slice(0, max);
  if (!list.length) return `<div class="empty">${t('nobody')}</div>`;
  return `<div class="ll">${list.map(s => `<div class="lr" data-act="vopen" data-id="${esc(s.deviceId)}">${avt(s.deviceId, s.device, 38)}<div class="lm"><b>${esc(vName(s.deviceId) || s.ip)}</b><small>${flag(s.country)} ${esc(cname(s.country))} · ${esc(s.browser)}</small></div><div class="lt"><span class="pill ok"><span class="live-dot"></span>${esc(secLabel(s.view))}</span><small>${fmtDur(s.secs)}</small></div></div>`).join('')}</div>`;
}

function pLive() {
  const a = calc(), list = Array.from(a.onlineDev.values()).sort((x, y) => y.last - x.last);
  if (!list.length) return `<div class="card"><div class="empty"><b>${t('nobody')}</b>${t('nodata_sub')}</div></div>`;
  const split = ['mobile', 'tablet', 'desktop'].map(d => [d, list.filter(s => s.device === d).length]).filter(x => x[1]);
  const head = `<div class="card livehead"><div><span class="live-dot big"></span><b>${num(list.length)}</b><small>${t('k_online')}</small></div><div class="chips">${split.map(([d, n]) => `<span class="chip">${devIc(d)}${devLabel(d)} · ${nf(n)}</span>`).join('')}</div></div>`;
  return head + `<div class="grid g-3">${list.map(s => {
    const ev = S.events.find(e => e.deviceId === s.deviceId);
    return `<div class="card lcard">
    <div class="dv"><span class="lring">${avt(s.deviceId, s.device, 42)}</span><span style="min-width:0"><b>${esc(vName(s.deviceId) || s.ip)}</b><small>${flag(s.country)} ${esc(cname(s.country))}</small></span><span class="pill ok" style="margin-inline-start:auto"><span class="live-dot"></span>${t('st_online')}</span></div>
    <div class="facts"><div class="fact"><small>${t('th_section')}</small><b>${esc(secLabel(s.view))}</b></div><div class="fact"><small>${t('th_dur')}</small><b>${fmtDur(s.secs)}</b></div><div class="fact"><small>${t('th_env')}</small><b>${esc(s.browser)} · ${esc(s.os)}</b></div><div class="fact"><small>${t('d_lastact')}</small><b>${ev ? esc(evText(ev)) : '—'}</b></div></div>
    <div class="row-act" style="justify-content:flex-start"><button class="btn sm" data-act="vopen" data-id="${esc(s.deviceId)}">${ic('eye')}${t('a_details')}</button><button class="btn sm" data-act="vmsg" data-id="${esc(s.deviceId)}">${ic('msg')}</button>${banBtn(s.deviceId)}</div>
  </div>`; }).join('')}</div>`;
}

function statusPill(v, onlineSet) {
  if (isBanned(v)) return `<span class="pill bd">${ic('ban')}${t('st_banned')}</span>`;
  if (onlineSet.has(v.id)) return `<span class="pill ok"><span class="live-dot"></span>${t('st_online')}</span>`;
  return v.visits > 1 ? `<span class="pill in">${t('st_returning')}</span>` : `<span class="pill mu">${t('st_new')}</span>`;
}
function filteredVisitors() {
  const a = calc(), q = S.vq.trim().toLowerCase();
  let list = S.visitors.filter(v => {
    if (S.vf === 'online' && !a.onlineDev.has(v.id)) return false;
    if (S.vf === 'returning' && !(v.visits > 1)) return false;
    if (S.vf === 'banned' && !isBanned(v)) return false;
    if (!q) return true;
    return ((v.name || '') + ' ' + v.ip + ' ' + v.ips.join(' ') + ' ' + v.id + ' ' + v.country + ' ' + cname(v.country) + ' ' + v.note + ' ' + v.browser + ' ' + v.os).toLowerCase().includes(q);
  });
  const k = { last: (x, y) => y.last - x.last, visits: (x, y) => y.visits - x.visits, time: (x, y) => y.totalSecs - x.totalSecs, first: (x, y) => x.first - y.first }[S.vs];
  return { list: list.sort(k), online: a.onlineDev };
}
function vChips() {
  const a = calc(), all = S.visitors;
  const n = { all: all.length, online: all.filter(v => a.onlineDev.has(v.id)).length, returning: all.filter(v => v.visits > 1).length, banned: all.filter(isBanned).length };
  return `<div class="fchips">${[['all', 'v_all'], ['online', 'v_online'], ['returning', 'v_returning'], ['banned', 'v_banned']].map(([k, l]) => `<button class="fc ${S.vf === k ? 'on' : ''}" data-act="vfset" data-v="${k}">${t(l)}<b>${nf(n[k])}</b></button>`).join('')}</div>`;
}
function visitorTable() {
  const { list, online } = filteredVisitors();
  const chips = vChips();
  if (!list.length) return chips + emptyBox();
  const rows = list.slice(0, S.vShow).map(v => `<tr class="click" data-act="vopen" data-id="${esc(v.id)}">
    <td><div class="dv">${avt(v.id, v.device)}<span><b>${esc(v.name || short(v.id))}</b><small><span class="mono">${esc(v.ip)}</span>${v.ips.length > 1 ? ' +' + (v.ips.length - 1) : ''} · ${esc(v.name ? short(v.id) + ' · ' : '')}${esc(devLabel(v.device))}${v.note ? ' · ' + esc(v.note.slice(0, 24)) : ''} ${wipePill(v.id)}</small></span></div></td>
    <td data-l="${t('th_country')}"><span><span class="flag">${flag(v.country)}</span>${esc(cname(v.country))}</span></td>
    <td data-l="${t('th_env')}">${esc(v.browser)} · ${esc(v.os)}</td><td data-l="${t('th_visits')}">${nf(v.visits)}</td><td data-l="${t('th_time')}">${fmtDur(v.totalSecs)}</td>
    <td data-l="${t('th_last')}"><span class="seen">${online.has(v.id) ? '<span class="live-dot"></span>' : ''}${ago(v.last)}</span></td><td data-l="${t('th_status')}">${statusPill(v, online)}</td>
    <td class="acts"><div class="row-act"><button class="btn sm" data-act="vmsg" data-id="${esc(v.id)}" title="${t('a_message')}">${ic('msg')}</button>${banBtn(v.id)}<button class="btn sm bad" data-act="vdel" data-id="${esc(v.id)}" title="${esc(t('v_del_row'))}">${ic('trash')}</button></div></td></tr>`).join('');
  return `${chips}<div class="sumrow"><span><b>${nf(list.length)}</b> / ${nf(S.visitors.length)}</span></div><div class="tw rt vt"><table><thead><tr><th>${t('th_device')} · ${t('th_ip')}</th><th>${t('th_country')}</th><th>${t('th_env')}</th><th>${t('th_visits')}</th><th>${t('th_time')}</th><th>${t('th_last')}</th><th>${t('th_status')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  ${list.length > S.vShow ? `<div class="more"><button class="btn" data-act="morev">${t('a_load_more')} (${nf(list.length - S.vShow)})</button></div>` : ''}`;
}
function pVisitors() {
  const opt = (v, k, cur) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${t(k)}</option>`, ob = !!(S.control.config || {}).offlineBlock;
  return `<div class="card"><div class="tbar">
    <div class="search">${ic('search')}<input id="vq" value="${esc(S.vq)}" placeholder="${esc(t('v_search'))}" autocomplete="off"></div>
    <select class="inp" id="vs">${opt('last', 'sort_last', S.vs)}${opt('visits', 'sort_visits', S.vs)}${opt('time', 'sort_time', S.vs)}${opt('first', 'sort_first', S.vs)}</select>
    <button class="btn pri" data-act="updall">${ic('bolt')}${t('a_updall')}</button><button class="btn" data-act="csv">${ic('download')}${t('a_export')}</button>
    <details class="dd"><summary class="btn">${ic('dots')}${t('v_bulk')}</summary><div class="ddm">
      <button class="btn ${ob ? 'bad on' : ''}" data-act="vofflineall">${ic(ob ? 'wifi' : 'wifi-off')}${t(ob ? 'a_offline_out_allow' : 'a_offline_out_block')}</button>
      <button class="btn bad" data-act="vclear">${ic('trash')}${t('a_clear')}</button><button class="btn bad" data-act="vclearall">${ic('trash')}${t('v_clear_all')}</button></div></details></div>
    <div id="tbl">${visitorTable()}</div></div>`;
}

function sessionTable(list, del) {
  if (!list.length) return emptyBox();
  del = del !== false;
  const mx = Math.max(1, ...list.map(s => s.secs));
  const rows = list.map(s => `<tr class="click" data-act="sopen" data-id="${esc(s.id)}">
    <td>${dtm(s.start)}</td><td class="mono" data-l="${t('th_ip')}">${esc(s.ip)}</td><td data-l="${t('th_country')}"><span><span class="flag">${flag(s.country)}</span>${esc(cname(s.country))}</span></td>
    <td data-l="${t('th_device')}"><span class="dv"><span class="ico" style="width:28px;height:28px;border-radius:9px">${devIc(s.device)}</span>${esc(s.browser)}</span></td>
    <td data-l="${t('th_dur')}"><div class="dur"><span>${fmtDur(s.secs)}</span><i><u style="width:${(s.secs / mx * 100).toFixed(0)}%"></u></i></div></td><td data-l="${t('th_section')}">${esc(secLabel(s.view))}</td>
    <td data-l="${t('th_used')}">${nf(Object.values(s.acts).reduce((x, y) => x + y, 0))}</td><td data-l="${t('th_ref')}">${esc(s.ref || '—')}</td>${del ? `<td class="acts"><button class="btn sm bad" data-act="sdel" data-id="${esc(s.id)}" title="${esc(t('s_del'))}">${ic('trash')}</button></td>` : ''}</tr>`).join('');
  return `<div class="tw rt"><table><thead><tr><th>${t('th_start')}</th><th>${t('th_ip')}</th><th>${t('th_country')}</th><th>${t('th_device')}</th><th>${t('th_dur')}</th><th>${t('th_section')}</th><th>${t('th_used')}</th><th>${t('th_ref')}</th>${del ? '<th></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function sessionsBody() {
  const a = calc(), q = S.sq.trim().toLowerCase();
  const list = a.ss.filter(s => !q || (s.ip + ' ' + s.country + ' ' + cname(s.country) + ' ' + s.browser + ' ' + s.os + ' ' + s.ref + ' ' + s.deviceId).toLowerCase().includes(q));
  const tot = list.reduce((x, s) => x + s.secs, 0);
  const sum = list.length ? `<div class="sumrow"><span><b>${nf(list.length)}</b> ${t('k_sessions')}</span><span>${t('k_avg')}: <b>${fmtDur(tot / list.length)}</b></span><span>${t('d_total')}: <b>${fmtDur(tot)}</b></span></div>` : '';
  return sum + sessionTable(list.slice(0, S.sShow)) + (list.length > S.sShow ? `<div class="more"><button class="btn" data-act="mores">${t('a_load_more')} (${nf(list.length - S.sShow)})</button></div>` : '') + limitNote();
}
function pSessions() {
  return `<div class="card"><div class="tbar"><div class="search">${ic('search')}<input id="sq" value="${esc(S.sq)}" placeholder="${esc(t('v_search'))}" autocomplete="off"></div><button class="btn bad" data-act="sclear">${ic('trash')}${t('s_clear_all')}</button></div><div id="tbl">${sessionsBody()}</div></div>`;
}

function pUsage() {
  const a = calc();
  return `<div class="grid g-2e">
    <div class="card"><h3>${ic('clock')} ${t('c_sections')}</h3>${bars(a.vsecs, { label: secLabel, fmt: fmtDur, max: 10 })}</div>
    <div class="card"><h3>${ic('eye')} ${t('c_views')}</h3>${bars(a.views, { label: secLabel, max: 10 })}</div></div>
  <div class="grid g-2e">
    <div class="card"><h3>${ic('bolt')} ${t('c_actions')}</h3>${bars(a.acts, { label: actLabel, max: 10 })}</div>
    <div class="card"><h3>${ic('layers')} ${t('c_dur')}</h3>${cols(a.durB.map((v, i) => [t('dur_b')[i] || i, v]))}</div></div>
  <div class="grid g-2e">
    <div class="card"><h3>${ic('clock')} ${t('c_hours')}</h3>${heat(a.hours)}</div>
    <div class="card"><h3>${ic('layers')} ${t('c_weekday')}</h3>${cols(a.wd.map((v, i) => [t('wd')[i], v]))}</div></div>${limitNote()}`;
}

function ctlStatus(cfg, bans) {
  const it = (c, i, l, on, v) => `<div class="stc ${on ? 'on' : ''}" style="--c:var(${c})"><span class="ic">${ic(i)}</span><div><small>${l}</small><b>${v}</b></div></div>`;
  const st = on => t(on ? 'fl_on' : 'fl_off'), trk = cfg.track !== false;
  return `<div class="stbar">${it('--acc', 'mega', t('ctl_ann'), !!cfg.annOn, st(!!cfg.annOn))}${it('--warn', 'wrench', t('ctl_maint'), !!cfg.maint, st(!!cfg.maint))}${it('--acc2', 'pulse', t('ctl_track'), trk, st(trk))}${it('--bad', 'wifi-off', t('ctl_offline'), !!cfg.offlineBlock, st(!!cfg.offlineBlock))}${it('--acc3', 'ban', t('ctl_bans'), bans.length > 0, nf(bans.length))}</div>`;
}

function pControls() {
  const cfg = S.control.config || {}, bans = Object.entries(S.control).filter(([k, o]) => (k.startsWith('d_') || k.startsWith('i_')) && banActive(o));
  const kinds = ['info', 'warn', 'bad'].map(k => `<option value="${k}" ${cfg.annKind === k ? 'selected' : ''}>${t('k_' + k)}</option>`).join('');
  return `${ctlStatus(cfg, bans)}<div class="grid g-2e">
  <div class="card"><div class="ctl-h" style="--c:var(--acc)"><span class="ic">${ic('mega')}</span><div><b>${t('ctl_ann')}</b><small>${t('ctl_ann_sub')}</small></div><label class="sw"><input type="checkbox" id="annOn" ${cfg.annOn ? 'checked' : ''}><i></i></label></div>
    <form data-form="ann"><div class="fld"><label>${t('ctl_ann_text')}</label><textarea class="inp" name="text" maxlength="240">${esc(cfg.annText || '')}</textarea></div>
    <div class="inl"><div class="fld"><label>${t('ctl_kind')}</label><select class="inp" name="kind" style="width:100%">${kinds}</select></div><button class="btn pri" type="submit">${ic('check')}${t('a_save')}</button></div></form></div>
  <div class="card"><div class="ctl-h" style="--c:var(--warn)"><span class="ic">${ic('wrench')}</span><div><b>${t('ctl_maint')}</b><small>${t('ctl_maint_sub')}</small></div><label class="sw"><input type="checkbox" id="maintOn" ${cfg.maint ? 'checked' : ''}><i></i></label></div>
    <form data-form="maint"><div class="fld"><label>${t('ctl_maint_msg')}</label><textarea class="inp" name="text" maxlength="240">${esc(cfg.maintMsg || '')}</textarea></div><button class="btn pri" type="submit">${ic('check')}${t('a_save')}</button></form></div></div>
  <div class="grid g-3">
  <div class="card"><div class="ctl-h" style="--c:var(--acc2)"><span class="ic">${ic('pulse')}</span><div><b>${t('ctl_track')}</b><small>${t('ctl_track_sub')}</small></div><label class="sw"><input type="checkbox" id="trackOn" ${cfg.track === false ? '' : 'checked'}><i></i></label></div></div>
  <div class="card"><div class="ctl-h" style="--c:var(--acc3)"><span class="ic">${ic('refresh')}</span><div><b>${t('ctl_upd')}</b><small>${t('ctl_upd_sub')}</small></div></div>
    <button class="btn pri" data-act="updall">${ic('bolt')}${t('ctl_upd_all')}</button></div>
  <div class="card"><div class="ctl-h" style="--c:var(--bad)"><span class="ic">${ic('wifi-off')}</span><div><b>${t('ctl_offline')}</b><small>${t('ctl_offline_sub')}</small></div><label class="sw"><input type="checkbox" id="offAllOn" ${cfg.offlineBlock ? 'checked' : ''}><i></i></label></div></div></div>
  <div class="grid g-2e">
  <div class="card"><h3>${ic('ban')} ${t('ctl_addban')}</h3><form data-form="banip"><div class="inl"><div class="fld"><label>${t('ctl_ip')}</label><input class="inp mono" name="ip" required maxlength="45" placeholder="41.34.12.9"></div>
    <div class="fld"><label>${t('b_dur')}</label><select class="inp" name="dur" style="width:100%"><option value="3600000">${t('b_1h')}</option><option value="86400000">${t('b_24h')}</option><option value="604800000">${t('b_7d')}</option><option value="0" selected>${t('b_forever')}</option></select></div></div>
    <div class="fld" style="margin-top:12px"><label>${t('b_reason')}</label><input class="inp" name="reason" maxlength="120"></div><button class="btn bad" type="submit">${ic('ban')}${t('a_banip')}</button></form></div>
  <div class="card"><h3>${ic('shield')} ${t('ctl_bans')}<small>${bans.length}</small></h3>${bans.length ? bans.map(([k, o]) => `<div class="banrow"><span class="ico pill bd">${ic('ban')}</span><div><b class="mono">${k.startsWith('d_') ? esc(short(k.slice(2))) + '…' : esc(o.value || k)}</b><small>${k.startsWith('d_') ? t('th_device') : t('th_ip')} · ${ms(o.until) ? t('ctl_until') + ' ' + dtm(ms(o.until)) : t('ctl_forever')}${o.reason ? ' · ' + esc(o.reason) : ''}</small></div><button class="btn sm" data-act="unban" data-key="${esc(k)}">${t('a_unban')}</button></div>`).join('') : `<div class="empty">${t('ctl_nobans')}</div>`}</div></div>`;
}

function pTeam() {
  const me = (S.user.email || '').toLowerCase(), owner = (C.ownerEmail || '').toLowerCase();
  return `<div class="grid g-2e"><div class="card"><h3>${ic('users')} ${t('nav_team')}<small>${S.admins.length}</small></h3>${S.admins.length ? S.admins.map(a => `<div class="banrow"><span class="ico pill in">${ic('users')}</span><div><b>${esc(a.email)}</b><small>${a.email === me ? t('t_you') : (a.email === owner ? t('t_owner') : (a.by ? esc(a.by) : ''))}${a.at ? ' · ' + dtm(a.at) : ''}</small></div>${a.email === me ? '' : `<button class="btn sm bad" data-act="admrm" data-email="${esc(a.email)}">${ic('trash')}${t('t_remove')}</button>`}</div>`).join('') : `<div class="empty">${t('t_none')}</div>`}</div>
  <div class="card"><h3>${ic('userplus')} ${t('t_add')}</h3><form data-form="adm"><div class="fld"><label>${t('t_email')}</label><input class="inp mono" type="email" name="email" required placeholder="friend@gmail.com"></div><button class="btn pri" type="submit">${ic('userplus')}${t('t_add')}</button></form><div class="hint-box">${t('t_hint')}</div></div></div>`;
}

function pSettings() {
  const lim = [300, 500, 1000, 2000].map(n => `<option value="${n}" ${S.limit === n ? 'selected' : ''}>${nf(n)}</option>`).join('');
  const days = [30, 60, 90, 180].map(n => `<option value="${n}">${t('set_days', { n })}</option>`).join('');
  return `<div class="grid g-2e"><div class="card"><div class="fld"><label>${t('set_lang')}</label><div class="seg" style="align-self:flex-start"><button data-act="lang" data-v="ar" class="${lang === 'ar' ? 'on' : ''}">العربية</button><button data-act="lang" data-v="en" class="${lang === 'en' ? 'on' : ''}">English</button></div></div>
    <div class="fld"><label>${t('set_theme')}</label><div class="seg" style="align-self:flex-start"><button data-act="theme" data-v="dark" class="${theme === 'dark' ? 'on' : ''}">${t('theme_dark')}</button><button data-act="theme" data-v="light" class="${theme === 'light' ? 'on' : ''}">${t('theme_light')}</button></div></div>
    <div class="fld"><label>${t('set_limit')}</label><select class="inp" id="limSel" style="align-self:flex-start">${lim}</select><small style="color:var(--muted)">${t('set_limit_sub')}</small></div>
    <div class="fld"><label>${t('set_proj')}</label><span class="mono">${esc(S.B.projectId)}</span>${S.demo ? `<span class="badge-demo" style="align-self:flex-start">${t('set_demo')}</span>` : ''}</div></div>
  <div class="card"><h3>${ic('trash')} ${t('set_clean')}</h3><div class="sub">${t('set_clean_sub')}</div><div class="inl"><div class="fld"><label>${t('set_clean_btn')}</label><select class="inp" id="cleanSel" style="width:100%">${days}</select></div><button class="btn bad" data-act="clean">${ic('trash')}${t('a_delete')}</button></div>
    <div style="margin-top:22px"><button class="btn" data-act="json">${ic('download')}${t('set_exp')}</button></div></div></div>`;
}

const PAGE_FN = { overview: pOverview, live: pLive, feed: pFeed, visitors: pVisitors, sessions: pSessions, usage: pUsage, controls: pControls, team: pTeam, settings: pSettings };
const NAV = [['overview', 'dash'], ['live', 'pulse'], ['feed', 'bolt'], ['visitors', 'users'], ['sessions', 'layers'], ['usage', 'bolt'], ['controls', 'sliders'], ['team', 'shield'], ['settings', 'gear']];
const RANGED = ['overview', 'usage', 'sessions'];
const LIVE_PAGES = ['overview', 'live', 'usage', 'feed'];

function shell() {
  const u = S.user, name = u.displayName || u.email || '';
  const nav = NAV.map(([p, i], idx) => `${idx === 0 ? `<div class="nav-h">${t('sec_analytics')}</div>` : ''}${p === 'controls' ? `<div class="nav-h">${t('sec_manage')}</div>` : ''}<a data-act="nav" data-page="${p}" class="${S.page === p ? 'on' : ''}">${ic(i)}<span>${t('nav_' + p)}</span>${p === 'live' ? '<span class="cnt" id="liveCnt">0</span>' : ''}</a>`).join('');
  const bn = [['overview', 'dash'], ['live', 'pulse'], ['visitors', 'users'], ['controls', 'sliders']].map(([p, i]) => `<a data-act="nav" data-page="${p}" class="${S.page === p ? 'on' : ''}">${ic(i)}<span>${t('nav_' + p)}</span>${p === 'live' ? '<em class="cnt" id="liveCnt2">0</em>' : ''}</a>`).join('') + `<a data-act="menu">${ic('menu')}<span>${t('nav_more')}</span></a>`;
  root.innerHTML = `<div class="app"><aside class="side"><div class="brand"><img src="../assets/img/novix-icon-64.png" alt=""><div><b>NOVIX</b><small>${t('app')}</small></div></div><nav class="nav">${nav}</nav>
    <div class="side-foot"><div class="me"><span class="av">${u.photoURL ? `<img src="${esc(u.photoURL)}" referrerpolicy="no-referrer" alt="">` : esc(name.slice(0, 1).toUpperCase())}</span><div><b>${esc(name)}</b><small>${esc(u.email || '')}</small></div></div><button class="btn" data-act="signout">${ic('logout')}${t('signout')}</button></div></aside>
    <main class="main"><div class="top"><button class="ib menu-btn" data-act="menu">${ic('menu')}</button><div class="grow"><h1 id="ttl"></h1><p id="sub"></p></div><div class="tools" id="tools"></div></div><div id="err"></div><div id="page"></div></main><nav class="bnav">${bn}</nav></div>`;
  head(); renderPage(false);
}

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || !!navigator.standalone;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canInstall = () => !isStandalone() && (!!window.__nxIP || isIOS);
async function installApp() {
  const ev = window.__nxIP;
  if (ev) { ev.prompt(); try { await ev.userChoice; } catch (e) {} window.__nxIP = null; head(); }
  else modal({ title: t('install_title'), hint: t('install_ios_hint'), ok: t('a_confirm'), onOk: async () => {} });
}
window.addEventListener('nx-installable', () => { if ($('#tools')) head(); });
window.addEventListener('appinstalled', () => { window.__nxIP = null; if ($('#tools')) { head(); toast(t('installed')); } });
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('admin-sw.js').catch(() => {});
function head() {
  $('#ttl').textContent = t('nav_' + S.page); $('#sub').textContent = t('sub_' + S.page);
  const rng = ['today', '7d', '30d', 'all'].map(r => `<button data-act="range" data-v="${r}" class="${S.range === r ? 'on' : ''}">${t('r_' + r)}</button>`).join('');
  $('#tools').innerHTML = `${S.demo ? `<span class="badge-demo">${t('demo_badge')}</span>` : ''}${LIVE_PAGES.includes(S.page) ? `<span class="pill ok livepill"><span class="live-dot"></span>${t('live')}</span>` : ''}${RANGED.includes(S.page) ? `<div class="seg">${rng}</div>` : ''}
    ${canInstall() ? `<button class="btn sm pri" data-act="install">${ic('download')}${t('a_install')}</button>` : ''}<button class="ib" data-act="refresh" title="${t('a_refresh')}">${ic('refresh')}</button><button class="ib" data-act="lang" data-v="${lang === 'ar' ? 'en' : 'ar'}" title="Language"><b style="font-size:12px">${lang === 'ar' ? 'EN' : 'ع'}</b></button><button class="ib" data-act="theme" data-v="${theme === 'dark' ? 'light' : 'dark'}">${ic(theme === 'dark' ? 'sun' : 'moon')}</button>`;
  $$('.nav a, .bnav a[data-page]').forEach(a => a.classList.toggle('on', a.dataset.page === S.page));
}
const SKEL = ['overview', 'live', 'feed', 'visitors', 'sessions', 'usage'];
const skeleton = () => `<div class="grid g-kpi">${'<div class="skel"></div>'.repeat(6)}</div><div class="skel tall"></div>`;
function updCnt() { const n = nf(calc().onlineDev.size); ['#liveCnt', '#liveCnt2'].forEach(s => { const c = $(s); if (c) c.textContent = n; }); }
let lastPage = null;
function renderPage(again) {
  const el = $('#page'); if (!el) return;
  const same = !!again && lastPage === S.page; el.classList.toggle('again', same); lastPage = S.page;
  el.innerHTML = !S.loaded && SKEL.includes(S.page) ? skeleton() : PAGE_FN[S.page]();
  updCnt();
  if (!same) countUp(el);
}
function renderTbl() { const el = $('#tbl'); if (!el) return; el.innerHTML = S.page === 'visitors' ? visitorTable() : sessionsBody(); }
function showErr(msg) { const e = $('#err'); if (e) e.innerHTML = msg ? `<div class="err-bar">${ic('alert')} ${esc(msg)}</div>` : ''; }
function go(p) { S.page = p; location.hash = p; document.body.classList.remove('nav-open'); head(); renderPage(false); window.scrollTo(0, 0); }

function toast(msg, kind = 'ok') {
  $$('.toast').forEach(x => x.remove());
  const d = document.createElement('div'); d.className = 'toast ' + kind; d.innerHTML = ic(kind === 'ok' ? 'check' : 'alert') + '<span>' + esc(msg) + '</span>';
  document.body.appendChild(d); setTimeout(() => d.remove(), 2600);
}
function closeLayers() { $$('.shade,.drawer,.modal').forEach(x => x.remove()); }

function closeOver() { $$('[data-l="2"]').forEach(x => x.remove()); }
function closeTop() { if ($('[data-l="2"]')) closeOver(); else closeLayers(); }
function modal({ title, hint, body, ok, danger, onOk }) {
  const over = !!$('#vmodal');
  const shut = over ? closeOver : closeLayers;
  if (!over) closeLayers();
  const sh = document.createElement('div'); sh.className = 'shade'; sh.onclick = shut;
  const m = document.createElement('div'); m.className = 'modal';
  if (over) { sh.dataset.l = '2'; m.dataset.l = '2'; sh.classList.add('l2'); m.classList.add('l2'); }
  m.innerHTML = `<form class="box"><h3>${esc(title)}</h3>${hint ? `<p class="hint">${esc(hint)}</p>` : ''}${body || ''}<div class="mact"><button type="button" class="btn" data-act="close">${t('a_cancel')}</button><button type="submit" class="btn ${danger ? 'bad' : 'pri'}">${esc(ok || t('a_confirm'))}</button></div></form>`;
  document.body.append(sh, m);
  const f = $('form', m); const first = $('input,textarea', f); if (first) first.focus();
  f.onsubmit = async e => { e.preventDefault(); try { await onOk(new FormData(f)); shut(); } catch (err) { console.error(err); toast(t('failed') + ' — ' + (err && (err.code || err.message) || ''), 'bad'); } };
}
function drawer(html) {
  closeLayers();
  const sh = document.createElement('div'); sh.className = 'shade'; sh.onclick = closeLayers;
  const m = document.createElement('div'); m.className = 'modal';
  const box = document.createElement('div'); box.className = 'box wide'; box.innerHTML = html;
  box.onclick = e => e.stopPropagation();
  m.appendChild(box);
  document.body.append(sh, m);
}
const findVisitor = id => S.visitors.find(v => v.id === id) || (() => { const s = S.sessions.find(x => x.deviceId === id); return s ? { id, ip: s.ip, ips: [s.ip], country: s.country, device: s.device, browser: s.browser, os: s.os, lang: s.lang, visits: S.sessions.filter(x => x.deviceId === id).length, totalSecs: 0, first: s.start, last: s.last, note: '' } : null; })();

let S_vtab = 'info';
function vStat(id) {
  const v = findVisitor(id); if (!v) return '';
  const banned = isBanned(v), locked = !!(S.control['d_' + id] || {}).updLock, on = calc().onlineDev.has(id);
  return (banned ? `<span class="pill bd">${ic('ban')}${t('st_banned')}</span>` : (on ? `<span class="pill ok"><span class="live-dot"></span>${t('st_online')}</span>` : `<span class="pill mu">${t('st_offline')}</span>`))
    + (locked ? `<span class="pill wr">${ic('bolt')}${t('st_updlocked')}</span>` : '');
}
function vUpd(id) {
  const locked = !!(S.control['d_' + id] || {}).updLock;
  const obDev = !!(S.control['d_' + id] || {}).offlineBlock;
  return `<div class="vupd"><button class="btn pri" data-act="updnow" data-id="${esc(id)}">${ic('refresh')}${t('a_updnow')}</button>
    <button class="btn ${locked ? 'pri' : ''}" data-act="updlock" data-id="${esc(id)}">${ic('bolt')}${locked ? t('a_updunlock') : t('a_updlock')}</button></div>
    <small class="vhint">${locked ? t('d_upd_locked_hint') : t('d_upd_hint')}</small>
    <div class="dsec" style="margin-top:16px">${t('d_offline_sec')}</div>
    <div class="vupd" id="voffline">${offlineBtns(id, obDev)}</div>
    <small class="vhint">${obDev ? t('d_offline_blocked_hint') : t('d_offline_hint')}</small>`;
}
function offlineBtns(id, ob) {
  return `<button class="btn ${ob ? 'bad' : ''}" data-act="voffline" data-id="${esc(id)}">${ic(ob ? 'wifi-off' : 'wifi')}${ob ? t('a_offline_unblock') : t('a_offline_block')}</button><button class="btn" data-act="vofflineall">${ic('wifi-off')}${t('a_offline_all')}</button>`;
}
function vActs(id) {
  const v = findVisitor(id), devBan = banActive(S.control['d_' + id]), ipBan = !!(v.ip && banActive(S.control[ipKey(v.ip)]));
  return `<button class="btn" data-act="vmsg" data-id="${esc(id)}">${ic('msg')}${t('a_message')}</button>${devBan ? `<button class="btn pri" data-act="unban" data-key="d_${esc(id)}">${ic('check')}${t('a_unban_dev')}</button>` : `<button class="btn bad" data-act="vban" data-id="${esc(id)}">${ic('ban')}${t('a_ban')}</button>`}${v.ip !== 'unknown' ? (ipBan ? `<button class="btn pri" data-act="unban" data-key="${esc(ipKey(v.ip))}">${ic('check')}${t('a_unban_ip')}</button>` : `<button class="btn bad" data-act="vbanip" data-ip="${esc(v.ip)}">${ic('ban')}${t('a_banip')}</button>`) : ''}<button class="btn bad" data-act="vwipe" data-id="${esc(id)}">${ic('trash')}${t('a_wipe')}</button><button class="btn" data-act="vdel" data-id="${esc(id)}">${ic('x')}${t('a_delrec')}</button>`;
}
function setVTab(k) {
  S_vtab = k;
  $$('#vmodal .vtabs button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  $$('#vmodal .vpane').forEach(p => p.classList.toggle('on', p.dataset.k === k));
  const body = $('#vmodal .vbody'); if (body) body.scrollTop = 0;
}
function openVisitor(id) {
  const v = findVisitor(id); if (!v) return;
  const ss = S.sessions.filter(s => s.deviceId === id), ac = {}, secs = {};
  ss.forEach(s => { for (const k in s.vsecs) secs[k] = (secs[k] || 0) + s.vsecs[k]; for (const k in s.acts) ac[k] = (ac[k] || 0) + s.acts[k]; });
  const last = ss[0];
  const tabs = [['info', 'tab_info'], ['tools', 'tab_tools'], ['usage', 'tab_usage']].map(([k, l]) => `<button type="button" data-act="vtab" data-k="${k}" class="${S_vtab === k ? 'on' : ''}">${t(l)}</button>`).join('');
  closeLayers();
  const sh = document.createElement('div'); sh.className = 'shade'; sh.onclick = closeLayers;
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box vm" id="vmodal">
    <div class="vhead"><div class="dh"><span class="dv">${avt(id, v.device, 52)}</span><div style="flex:1;min-width:0"><h2 ${v.name ? '' : 'class="mono"'}>${esc(v.name || short(v.id) + '…')}</h2><small style="color:var(--muted)">${flag(v.country)} ${esc(cname(v.country))} · ${esc(v.browser)} · ${esc(v.os)}</small></div>
      <button class="btn sm" data-act="vfeedopen" data-id="${esc(id)}" title="${t('d_lastact')}">${ic('clock')}${t('d_lastact')}</button><button class="ib" data-act="close">${ic('x')}</button></div>
      <div class="vstat" id="vstat">${vStat(id)}</div>
      <div class="vtabs">${tabs}</div></div>
    <div class="vbody">
      <div class="vpane ${S_vtab === 'info' ? 'on' : ''}" data-k="info">
        <div class="facts"><div class="fact"><small>${t('th_ip')}</small><b class="mono">${esc(v.ip)}</b></div><div class="fact"><small>${t('th_status')}</small><b>${isBanned(v) ? t('st_banned') : (calc().onlineDev.has(id) ? t('st_online') : t('st_offline'))}</b></div>
        <div class="fact"><small>${t('d_visits')}</small><b>${nf(v.visits)}</b></div><div class="fact"><small>${t('d_total')}</small><b>${fmtDur(v.totalSecs || ss.reduce((a, s) => a + s.secs, 0))}</b></div>
        <div class="fact"><small>${t('d_first')}</small><b>${dtm(v.first)}</b></div><div class="fact"><small>${t('d_lastseen')}</small><b>${dtm(v.last)}</b></div>
        <div class="fact"><small>${t('d_lang')}</small><b>${esc(v.lang || '—')}</b></div><div class="fact"><small>${t('d_screen')}</small><b>${esc(last ? last.scr : '—')}</b></div></div>
        <div id="vwipe">${wipeBox(id)}</div>
        <div class="dsec">${t('d_ips')}</div><div class="chips">${(v.ips.length ? v.ips : [v.ip]).map(i => `<span class="chip mono">${esc(i)}</span>`).join('')}</div>
        <div class="dsec">${t('d_note')}</div><textarea class="inp" id="vnote" maxlength="200" data-id="${esc(id)}">${esc(v.note)}</textarea><div style="margin-top:8px"><button class="btn sm" data-act="vnote" data-id="${esc(id)}">${ic('check')}${t('a_save')}</button></div>
      </div>
      <div class="vpane ${S_vtab === 'tools' ? 'on' : ''}" data-k="tools">
        <div class="dsec">${t('d_upd_sec')}</div><div id="vupd">${vUpd(id)}</div>
        <div class="dsec first">${t('d_fetch_sec')}</div><div id="vpull">${pullBox(id)}</div>
        <div class="dsec">${t('d_push')}</div>
        ${pushBox(id)}
        <div class="dsec">${t('d_actions')}</div><div class="dact" id="vacts" style="margin-top:0">${vActs(id)}</div>
      </div>
      <div class="vpane ${S_vtab === 'usage' ? 'on' : ''}" data-k="usage">
        ${Object.keys(secs).length ? `<div class="dsec first">${t('d_sections')}</div>${bars(Object.entries(secs).sort((a, b) => b[1] - a[1]), { label: secLabel, fmt: fmtDur, pct: false, max: 6 })}` : ''}
        ${Object.keys(ac).length ? `<div class="dsec">${t('d_acts')}</div><div class="chips">${Object.entries(ac).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="chip">${esc(actLabel(k))} · ${n}</span>`).join('')}</div>` : ''}
        ${ss.length ? `<div class="dsec">${t('d_sessions')}</div>${ss.slice(0, 8).map(s => `<div class="sl"><span>${dtm(s.start)}</span><span>${esc(secLabel(s.view))}</span><b>${fmtDur(s.secs)}</b></div>`).join('')}` : ''}
        ${(!Object.keys(secs).length && !Object.keys(ac).length && !ss.length) ? emptyBox() : ''}
      </div>
    </div></div>`;
  document.body.append(sh, m);
  S.openId = id;
}

function openFeed(id) {
  const v = findVisitor(id); if (!v) return;
  closeOver();
  const sh = document.createElement('div'); sh.className = 'shade l2'; sh.dataset.l = '2'; sh.onclick = closeOver;
  const m = document.createElement('div'); m.className = 'modal l2'; m.dataset.l = '2';
  m.innerHTML = `<div class="box vm vfeedbox"><div class="vhead"><div class="dh" style="margin-bottom:0"><span class="dv">${avt(id, v.device, 40)}</span><div style="flex:1;min-width:0"><h2>${t('d_lastact_title')}</h2><small style="color:var(--muted)">${esc(v.name || short(v.id))}</small></div><button class="btn sm bad" data-act="evclearDev" data-id="${esc(id)}" title="${esc(t('f_clear_dev_hint'))}">${ic('trash')}${t('f_clear_dev')}</button><button class="ib" data-act="close">${ic('x')}</button></div></div>
    <div class="vbody"><div class="evl" id="vfeed">${feedFor(id)}</div></div></div>`;
  document.body.append(sh, m);
  S.feedId = id;
}
function openSession(id) {
  const s = S.sessions.find(x => x.id === id); if (!s) return;
  drawer(`<div class="dh"><span class="dv"><span class="ico" style="width:46px;height:46px">${devIc(s.device)}</span></span><div style="flex:1"><h2>${dtm(s.start)}</h2><small style="color:var(--muted)">${flag(s.country)} ${esc(cname(s.country))} · ${esc(s.browser)} · ${esc(s.os)}</small></div><button class="ib" data-act="close">${ic('x')}</button></div>
    <div class="facts"><div class="fact"><small>${t('th_ip')}</small><b class="mono">${esc(s.ip)}</b></div><div class="fact"><small>${t('th_dur')}</small><b>${fmtDur(s.secs)}</b></div><div class="fact"><small>${t('d_screen')}</small><b>${esc(s.scr || '—')}</b></div><div class="fact"><small>${t('d_tz')}</small><b>${esc(s.tz || '—')}</b></div><div class="fact"><small>${t('d_ref')}</small><b>${esc(s.ref || '—')}</b></div><div class="fact"><small>${t('d_lastseen')}</small><b>${ago(s.last)}</b></div></div>
    ${Object.keys(s.vsecs).length ? `<div class="dsec">${t('d_sections')}</div>${bars(Object.entries(s.vsecs).sort((a, b) => b[1] - a[1]), { label: secLabel, fmt: fmtDur, pct: false, max: 8 })}` : ''}
    ${Object.keys(s.acts).length ? `<div class="dsec">${t('d_acts')}</div><div class="chips">${Object.entries(s.acts).map(([k, n]) => `<span class="chip">${esc(actLabel(k))} · ${n}</span>`).join('')}</div>` : ''}
    <div class="dact"><button class="btn" data-act="vopen" data-id="${esc(s.deviceId)}">${ic('eye')}${t('a_details')}</button></div>`);
}

const durOpts = () => `<div class="fld"><label>${t('b_dur')}</label><select class="inp" name="dur" style="width:100%"><option value="3600000">${t('b_1h')}</option><option value="86400000">${t('b_24h')}</option><option value="604800000">${t('b_7d')}</option><option value="0" selected>${t('b_forever')}</option></select></div><div class="fld"><label>${t('b_reason')}</label><input class="inp" name="reason" maxlength="120"></div>`;
async function doBan(key, type, value, fd) {
  const dur = +fd.get('dur') || 0;
  const reason = String(fd.get('reason') || '');
  await S.B.setControl(key, { banned: true, until: dur ? S.B.ts(Date.now() + dur) : null, reason, type, value, at: S.B.stamp(), by: S.user.email || '' });

  S.control[key] = Object.assign({}, S.control[key], { banned: true, until: dur ? Date.now() + dur : null, reason, type, value });
  toast(t('done')); afterCtl();
}

function banBtn(id) {
  const v = findVisitor(id), on = !!(v && isBanned(v));
  return `<button class="btn sm bad ${on ? 'on' : ''}" data-act="vban" data-id="${esc(id)}" title="${esc(t(on ? 'ban_btn_on' : 'ban_btn_off'))}">${ic('ban')}</button>`;
}
function toggleBan(id) { const v = findVisitor(id); if (!v) return; if (isBanned(v)) askUnban(id); else askBan(id); }
function askUnban(id) {
  const nm = vName(id) || short(id);
  modal({ title: t('unban_title') + ' · ' + nm, hint: t('unban_hint'), ok: t('a_unban'), onOk: async () => { await unbanVisitor(id); } });
}
function askUnbanKeys(keys) { modal({ title: t('unban_title'), hint: t('unban_key_hint'), ok: t('a_unban'), onOk: async () => { await unban(...keys); } }); }
function askBan(id) { modal({ title: t('b_title'), hint: t('b_hint'), body: durOpts(), ok: t('a_ban'), danger: true, onOk: fd => doBan('d_' + id, 'device', id, fd) }); }
function askBanIp(ip) { modal({ title: t('b_title') + ' · ' + ip, hint: t('b_hint'), body: durOpts(), ok: t('a_banip'), danger: true, onOk: fd => doBan(ipKey(ip), 'ip', ip, fd) }); }
function askMsg(id) {
  modal({ title: t('m_title'), hint: t('m_hint'), body: `<div class="fld"><label>${t('m_text')}</label><textarea class="inp" name="text" maxlength="300" required></textarea></div>`, ok: t('a_confirm'),
    onOk: async fd => { await S.B.setControl('d_' + id, { message: String(fd.get('text')), msgId: String(Date.now()), msgAt: S.B.stamp() }); toast(t('done')); } });
}

let pushTab = 'task';
function pushBox(id) {
  const days = [t('wd_sun'), t('wd_mon'), t('wd_tue'), t('wd_wed'), t('wd_thu'), t('wd_fri'), t('wd_sat')];
  const tabs = ['task', 'note', 'sched'].map(k => `<button type="button" class="btn sm ${pushTab === k ? 'pri' : 'ghost'}" data-act="pushtab" data-k="${k}" data-id="${esc(id)}">${t('push_' + (k === 'sched' ? 'sched' : k))}</button>`).join(' ');
  let body = '';
  if (pushTab === 'task') body = `<input class="inp" name="text" maxlength="160" placeholder="${t('push_task_ph')}" required>
    <select class="inp" name="diff" style="margin-top:8px"><option value="Low">${t('push_diff_low')}</option><option value="Medium" selected>${t('push_diff_med')}</option><option value="High">${t('push_diff_high')}</option></select>`;
  else if (pushTab === 'note') body = `<input class="inp" name="title" maxlength="80" placeholder="${t('push_note_title')}">
    <textarea class="inp" name="body" maxlength="2000" style="margin-top:8px" placeholder="${t('push_note_body')}" required></textarea>`;
  else body = `<input class="inp" name="text" maxlength="80" placeholder="${t('push_sched_text')}" required>
    <div class="grid g-2" style="margin-top:8px"><select class="inp" name="day">${days.map((d, i) => `<option value="${i}">${d}</option>`).join('')}</select><input class="inp" type="time" name="time"></div>`;
  return `<form class="fld" id="pushF" data-id="${esc(id)}"><div class="row-act" style="justify-content:flex-start;margin-bottom:8px">${tabs}</div>${body}
    <button class="btn sm pri" type="submit" style="margin-top:10px">${ic('check')}${t('push_send')}</button></form>`;
}
function refreshPush(id) { const el2 = $('#pushF'); if (el2) el2.outerHTML = pushBox(id); }
async function sendPush(id, fd) {
  const type = pushTab === 'sched' ? 'schedule' : pushTab;
  const payload = type === 'task' ? { text: String(fd.get('text') || '').trim(), diff: fd.get('diff') }
    : type === 'note' ? { title: String(fd.get('title') || '').trim(), body: String(fd.get('body') || '').trim() }
    : { text: String(fd.get('text') || '').trim(), day: +fd.get('day') || 0, time: fd.get('time') || '' };
  await S.B.setControl('d_' + id, { assign: { id: String(Date.now()), type, payload, by: S.user.email || '' } });
  toast(t('push_sent'));
}

const pullReq = id => { const c = S.control['d_' + id] || {}; return c.pull && c.pull.id ? String(c.pull.id) : ''; };
const pullPending = id => { const rid = pullReq(id), v = findVisitor(id); return !!(rid && !(v && +v.pullId >= +rid)); };
const opsPending = id => { const c = S.control['d_' + id] || {}, v = findVisitor(id); return !!(c.dataOps && c.dataOps.id && !(v && +v.pullId >= +c.dataOps.id)); };
function applyLocal(p, ops) {
  (ops || []).forEach(op => {
    if (!op) return;
    if (op.c === 'board') { if (op.a === 'clear') p.board = { pages: 0, items: 0 }; return; }
    const arr = p[op.c]; if (!Array.isArray(arr)) return;
    if (op.a === 'clear') { arr.length = 0; return; }
    const i = arr.findIndex(x => String(x.id) === String(op.id)); if (i < 0) return;
    if (op.a === 'del') arr.splice(i, 1); else if (op.a === 'set') Object.assign(arr[i], op.v || {});
  });
  return p;
}

function viewPulled(id) {
  const v = findVisitor(id); if (!v || !v.pulled) return null;
  const p = JSON.parse(JSON.stringify(v.pulled)), c = S.control['d_' + id] || {};
  if (opsPending(id)) applyLocal(p, c.dataOps.ops);
  return p;
}
async function sendOps(id, newOps) {
  const c = S.control['d_' + id] || {};
  const prev = opsPending(id) ? (c.dataOps.ops || []) : [];
  const ops = JSON.parse(JSON.stringify(prev.concat(newOps).slice(-150))), rid = String(Date.now());
  const patch = { dataOps: { id: rid, ops }, pull: { id: rid } };
  await S.B.setControl('d_' + id, patch);
  S.control['d_' + id] = Object.assign({}, c, patch);
  refreshOpen(); toast(t('dv_sent'));
}
function pullBox(id) {
  const v = findVisitor(id); if (!v) return '';
  const rid = pullReq(id), pending = pullPending(id), online = calc().onlineDev.has(id);
  const age = rid ? Math.max(0, (Date.now() - (+rid || Date.now())) / 1000) : 0;
  const errCode = v.pullErr && rid && v.pullErr.startsWith(rid + ':') ? v.pullErr.slice(rid.length + 1) : '';
  const p = v.pulled, viewBtn = p ? `<div style=\"margin-top:12px\"><button class=\"btn sm pri\" data-act=\"vdata\" data-id=\"${esc(id)}\">${ic('eye')}${t('pull_view')}</button></div>` : '';
  if (pending) {
    return `<div class=\"pullst\"><span class=\"live-dot\"></span><div><b>${t(online ? 'pull_wait_online' : 'pull_wait_off')}</b><small>${t('pull_elapsed', { d: fmtDur(age) })}</small></div></div>`
      + (errCode ? `<div class=\"hint-box\" style=\"margin-top:10px\">${ic('alert')} ${esc(t('pull_err', { e: errCode }))}</div>` : (online && age > 45 ? `<div class=\"hint-box\" style=\"margin-top:10px\">${ic('alert')} ${t('pull_slow')}</div>` : ''))
      + `<div class=\"vupd\" style=\"margin-top:10px\"><button class=\"btn sm\" data-act=\"vfetch\" data-id=\"${esc(id)}\">${ic('refresh')}${t('pull_retry')}</button><button class=\"btn sm bad\" data-act=\"vfetchcancel\" data-id=\"${esc(id)}\">${ic('x')}${t('pull_cancel')}</button></div>` + viewBtn;
  }
  let out = `<button class=\"btn sm pri\" data-act=\"vfetch\" data-id=\"${esc(id)}\">${ic('refresh')}${t('d_fetch')}</button>`;
  if (!p) return out + `<small class=\"vhint\">${t('pull_none')}</small>`;
  const n = k => (p[k] || []).length, chips = [['tasks', 'pull_tasks'], ['notes', 'pull_notes'], ['sched', 'pull_sched'], ['books', 'pull_books']].filter(([k]) => n(k)).map(([k, l]) => `<span class=\"chip\">${t(l)} · ${nf(n(k))}</span>`);
  if (p.board && p.board.items) chips.push(`<span class=\"chip\">${t('pull_board')} · ${nf(p.board.items)}</span>`);
  out += `<small class=\"vhint\">${t('pull_at', { d: dtm(v.pulledAt) })}</small>`;
  out += chips.length ? `<div class=\"chips\" style=\"margin-top:10px\">${chips.join('')}</div>` : `<div class=\"vhint\">${t('pull_empty')}</div>`;
  return out + viewBtn;
}

const DV_TABS = [['tasks', 'pull_tasks'], ['notes', 'pull_notes'], ['sched', 'pull_sched'], ['books', 'pull_books'], ['board', 'dv_board']];
const dvCount = (p, k) => k === 'board' ? ((p.board && p.board.items) || 0) : (p[k] || []).length;
const dvDay = i => t('wd_' + ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][+i || 0]);
const dvDiff = x => t(x === 'Low' ? 'push_diff_low' : x === 'High' ? 'push_diff_high' : 'push_diff_med');
const dvBtns = (c, x) => x.tr ? `<small class=\"vhint\" style=\"margin:0\">${t('dv_trunc')}</small><button class=\"btn sm bad\" data-act=\"dvdel\" data-c=\"${c}\" data-item=\"${x.id}\">${ic('trash')}</button>`
  : `<button class=\"btn sm\" data-act=\"dvedit\" data-c=\"${c}\" data-item=\"${x.id}\" title=\"${esc(t('dv_edit'))}\">${ic('gear')}</button><button class=\"btn sm bad\" data-act=\"dvdel\" data-c=\"${c}\" data-item=\"${x.id}\" title=\"${esc(t('dv_del'))}\">${ic('trash')}</button>`;
const dvSave = (c, x) => `<div class=\"row-act\" style=\"justify-content:flex-start\"><button class=\"btn sm pri\" data-act=\"dvsave\" data-c=\"${c}\" data-item=\"${x.id}\">${ic('check')}${t('dv_save')}</button><button class=\"btn sm\" data-act=\"dvcancel\">${t('dv_cancel')}</button></div>`;
function dvRow(c, x) {
  const ed = S.dv.edit && S.dv.edit.c === c && String(S.dv.edit.id) === String(x.id);
  if (!x.id) return `<div class=\"dvr\"><div class=\"dvmain\"><b>${esc(x.t || x.title || '—')}</b><small>${t('dv_noid')}</small></div></div>`;
  if (c === 'tasks') {
    if (ed) return `<div class=\"dvr editing\"><div class=\"dvform\"><label>${t('dv_task_text')}</label><input class=\"inp\" data-f=\"t\" maxlength=\"160\" value=\"${esc(x.t)}\"><div class=\"dvgrid\"><select class=\"inp\" data-f=\"p\">${['Low', 'Medium', 'High'].map(k => `<option value=\"${k}\" ${x.p === k ? 'selected' : ''}>${dvDiff(k)}</option>`).join('')}</select><label class=\"chk\" style=\"display:flex;gap:8px;align-items:center;color:var(--text)\"><input type=\"checkbox\" data-f=\"d\" ${x.d ? 'checked' : ''}> ${t('dv_done')}</label></div></div>${dvSave(c, x)}</div>`;
    return `<div class=\"dvr\"><span class=\"dvchk ${x.d ? 'on' : ''}\">${x.d ? ic('check') : ''}</span><div class=\"dvmain\"><b class=\"${x.d ? 'dn' : ''}\">${esc(x.t)}</b><small>${esc(dvDiff(x.p))}${x.d ? ' · ' + t('dv_done') : ''}</small></div><div class=\"row-act\">${dvBtns(c, x)}</div></div>`;
  }
  if (c === 'notes') {
    if (ed) return `<div class=\"dvr editing\"><div class=\"dvform\"><label>${t('dv_note_title')}</label><input class=\"inp\" data-f=\"title\" maxlength=\"100\" value=\"${esc(x.title)}\"><label>${t('dv_note_body')}</label><textarea class=\"inp\" data-f=\"body\" maxlength=\"1500\" style=\"min-height:110px\">${esc(x.body)}</textarea><label class=\"chk\" style=\"display:flex;gap:8px;align-items:center;color:var(--text)\"><input type=\"checkbox\" data-f=\"pin\" ${x.pin ? 'checked' : ''}> ${t('dv_pin')}</label></div>${dvSave(c, x)}</div>`;
    return `<div class=\"dvr\"><div class=\"dvmain\"><b>${esc(x.title || t('push_note_title'))}${x.pin ? ' 📌' : ''}</b><small>${esc((x.body || '').slice(0, 220))}</small></div><div class=\"row-act\">${dvBtns(c, x)}</div></div>`;
  }
  if (c === 'sched') {
    if (ed) return `<div class=\"dvr editing\"><div class=\"dvform\"><label>${t('dv_sched_text')}</label><input class=\"inp\" data-f=\"t\" maxlength=\"100\" value=\"${esc(x.t)}\"><div class=\"dvgrid\"><div><label>${t('dv_day')}</label><select class=\"inp\" data-f=\"day\">${[0, 1, 2, 3, 4, 5, 6].map(i => `<option value=\"${i}\" ${+x.day === i ? 'selected' : ''}>${dvDay(i)}</option>`).join('')}</select></div><div><label>${t('dv_time')}</label><input class=\"inp\" type=\"time\" data-f=\"time\" value=\"${esc(x.time || '')}\"></div></div></div>${dvSave(c, x)}</div>`;
    return `<div class=\"dvr\"><div class=\"dvmain\"><b>${esc(x.t)}</b><small>${esc(dvDay(x.day))}${x.time ? ' · ' + esc(x.time) : ''}</small></div><div class=\"row-act\">${dvBtns(c, x)}</div></div>`;
  }
  if (ed) return `<div class=\"dvr editing\"><div class=\"dvform\"><label>${t('dv_book_title')}</label><input class=\"inp\" data-f=\"t\" maxlength=\"120\" value=\"${esc(x.t)}\"><label>${t('dv_book_subj')}</label><input class=\"inp\" data-f=\"s\" maxlength=\"60\" value=\"${esc(x.s)}\"></div>${dvSave(c, x)}</div>`;
  return `<div class=\"dvr\"><div class=\"dvmain\"><b>${esc(x.t || x.fn || '—')}</b><small>${esc(x.s || '')}${x.s ? ' · ' : ''}${kb(x.size)}${x.ty ? ' · ' + esc(x.ty) : ''}</small></div><div class=\"row-act\">${dvBtns(c, x)}</div></div>`;
}
function renderDV() {
  const box = $('#dvbody'); if (!S.dv || !box) return;
  const id = S.dv.id, p = viewPulled(id) || {}, k = S.dv.tab;
  const st = $('#dvstat'); if (st) st.innerHTML = opsPending(id) ? `<span class=\"pill wr\"><span class=\"live-dot\"></span>${t('dv_pending')}</span>` : (findVisitor(id) && findVisitor(id).pulledAt ? `<span class=\"pill ok\">${ic('check')}${t('dv_fetched')} · ${dtm(findVisitor(id).pulledAt)}</span>` : '');
  const tb = $('#dvtabs'); if (tb) tb.innerHTML = DV_TABS.map(([key, l]) => `<button type=\"button\" data-act=\"dvtab\" data-k=\"${key}\" class=\"${k === key ? 'on' : ''}\">${t(l)} <small>${nf(dvCount(p, key))}</small></button>`).join('');
  let h = '';
  if (k === 'board') {
    h = dvCount(p, 'board') ? `<div class=\"chips\"><span class=\"chip\">${nf(p.board.pages || 0)} ${t('dv_pages')}</span><span class=\"chip\">${nf(p.board.items || 0)} ${t('dv_items')}</span></div><div style=\"margin-top:14px\"><button class=\"btn sm bad\" data-act=\"dvboard\">${ic('trash')}${t('dv_board_clear')}</button></div><small class=\"vhint\">${t('dv_board_warn')}</small>` : emptyMsg();
  } else {
    const list = p[k] || [];
    h = list.length ? `<div class=\"dvhead\"><small style=\"color:var(--muted)\">${nf(list.length)}</small><button class=\"btn sm bad\" data-act=\"dvclear\" data-c=\"${k}\">${ic('trash')}${t('dv_clear')}</button></div>${k === 'books' ? `<small class=\"vhint\" style=\"margin:0 0 10px\">${t('dv_book_warn')}</small>` : ''}${list.map(x => dvRow(k, x)).join('')}` : emptyMsg();
  }
  box.innerHTML = h;
}
const emptyMsg = () => `<div class=\"empty\">${t('dv_empty')}</div>`;
function openData(id) {
  const v = findVisitor(id); if (!v) return;
  closeOver();
  S.dv = { id, tab: (S.dv && S.dv.id === id && S.dv.tab) || 'tasks', edit: null };
  const sh = document.createElement('div'); sh.className = 'shade l2'; sh.dataset.l = '2'; sh.onclick = closeOver;
  const m = document.createElement('div'); m.className = 'modal l2'; m.dataset.l = '2';
  m.innerHTML = `<div class=\"box vm vdatabox\"><div class=\"vhead\"><div class=\"dh\" style=\"margin-bottom:0\"><span class=\"dv\">${avt(id, v.device, 40)}</span><div style=\"flex:1;min-width:0\"><h2>${t('dv_title')}</h2><small style=\"color:var(--muted)\">${esc(v.name || short(v.id))}</small></div><button class=\"ib\" data-act=\"close\">${ic('x')}</button></div><div class=\"vstat\" id=\"dvstat\"></div><div class=\"vtabs\" id=\"dvtabs\"></div></div><div class=\"vbody\" id=\"dvbody\"></div></div>`;
  document.body.append(sh, m);
  renderDV();
}

function armed(el, label) {
  if (el.dataset.armed === '1') return true;
  el.dataset.armed = '1'; el.dataset.orig = el.innerHTML; el.classList.add('armed'); el.innerHTML = ic('trash') + label;
  setTimeout(() => { if (el.isConnected && el.dataset.armed === '1') { el.dataset.armed = ''; el.innerHTML = el.dataset.orig; el.classList.remove('armed'); } }, 3200);
  return false;
}
function dvCollect(c, row) {
  const g = f => { const e = row.querySelector('[data-f="' + f + '"]'); return e ? (e.type === 'checkbox' ? (e.checked ? 1 : 0) : e.value) : undefined; };
  if (c === 'tasks') return { t: String(g('t') || '').trim(), p: g('p'), d: g('d') };
  if (c === 'notes') return { title: String(g('title') || '').trim(), body: String(g('body') || ''), pin: g('pin') };
  if (c === 'sched') return { t: String(g('t') || '').trim(), day: +g('day') || 0, time: g('time') || '' };
  return { t: String(g('t') || '').trim(), s: String(g('s') || '').trim() };
}
function wipeBox(id) {
  const w = wipeState(id); if (!w) return '';
  return `<div class="hint-box" style="margin:14px 0">${w.done ? ic('check') + ' ' + t('wipe_done_at', { d: dtm(w.at) }) : ic('alert') + ' ' + t('wipe_wait')}</div>`;
}
const feedFor = id => { const l = S.events.filter(e => e.deviceId === id).slice(0, 25); return l.length ? l.map(e => evRow(e, false, true)).join('') : `<small style="color:var(--muted)">${t('f_none')}</small>`; };
function refreshOpen() {
  if (!S.openId || !$('#vmodal')) { S.openId = null; } else {
    const id = S.openId, set = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };
    set('#vwipe', wipeBox(id)); set('#vstat', vStat(id)); set('#vupd', vUpd(id)); set('#vacts', vActs(id)); set('#vpull', pullBox(id)); set('#voffline', offlineBtns(id, !!(S.control['d_' + id] || {}).offlineBlock));
  }
  const fe = $('#vfeed'); if (fe && S.feedId) fe.innerHTML = feedFor(S.feedId);
  if (S.dv && $('#dvbody')) { if (!S.dv.edit) renderDV(); } else S.dv = null;
}
function askWipe(id) {
  const v = vis(id), nm = (v && v.name) || short(id);
  modal({ title: t('wipe_title') + ' · ' + nm, hint: t('wipe_hint'), ok: t('a_wipe'), danger: true,
    onOk: async () => { await S.B.wipeUser(id, S.user.email || ''); toast(t('wipe_sent')); } });
}

const CLR_PRESETS = [['3600000', 'clr_1h'], ['21600000', 'clr_6h'], ['86400000', 'clr_1d'], ['259200000', 'clr_3d'], ['604800000', 'clr_7d'], ['2592000000', 'clr_30d'], ['0', 'clr_all'], ['custom', 'clr_custom']];
function clrMs(fd) {
  const k = fd.get('clrsel'); if (k !== 'custom') return +k;
  const n = Math.max(1, +fd.get('clrn') || 1); return n * ({ m: 60e3, h: 3600e3, d: 864e5 }[fd.get('clru')] || 864e5);
}
function clrTargets(ms, keep) { const cut = Date.now() - ms; return S.visitors.filter(v => (ms > 0 ? (v.last || 0) < cut : true) && !(keep && isBanned(v))); }
function askClearVisitors(def = '86400000') {
  modal({ title: t('clr_title'), hint: t('clr_hint'), ok: t('clr_ok'), danger: true,
    body: `<div class="fld"><label>${t('clr_older')}</label><select class="inp" name="clrsel" id="clrsel">${CLR_PRESETS.map(([v, k]) => `<option value="${v}" ${v === def ? 'selected' : ''}>${t(k)}</option>`).join('')}</select></div>
      <div class="fld" id="clrcus" style="display:none"><div style="display:flex;gap:8px"><input class="inp" type="number" min="1" name="clrn" id="clrn" value="1" style="flex:1"><select class="inp" name="clru" id="clru" style="flex:1"><option value="m">${t('clr_u_m')}</option><option value="h">${t('clr_u_h')}</option><option value="d" selected>${t('clr_u_d')}</option></select></div></div>
      <label class="chk" style="display:flex;gap:8px;align-items:center;margin:6px 0 12px;cursor:pointer"><input type="checkbox" name="keepban" id="clrkeep" checked> <span>${t('clr_keep')}</span></label>
      <div class="vhint" id="clrcnt" style="font-weight:700"></div>`,
    onOk: async fd => {
      const ms = clrMs(fd), keep = !!fd.get('keepban'), skip = keep ? S.visitors.filter(isBanned).map(v => v.id) : [];
      const ids = await S.B.cleanVisitors(ms, skip), set = new Set(ids);
      S.visitors = S.visitors.filter(v => !set.has(v.id)); S.sessions = S.sessions.filter(x => !set.has(x.deviceId));
      toast(t('done') + ' · ' + nf(ids.length)); renderPage(true);
    } });
  const f = $('.modal form'), upd = () => {
    $('#clrcus').style.display = $('#clrsel').value === 'custom' ? '' : 'none';
    const fd = new FormData(f); $('#clrcnt').textContent = t('clr_count', { n: nf(clrTargets(clrMs(fd), !!fd.get('keepban')).length) });
  };
  f.addEventListener('input', upd); f.addEventListener('change', upd); upd();
}
function askDel(id) {
  modal({ title: t('a_delete'), hint: t('sure'), ok: t('a_delete'), danger: true, onOk: async () => { const n = await S.B.deleteVisitor(id); S.visitors = S.visitors.filter(v => v.id !== id); S.sessions = S.sessions.filter(s => s.deviceId !== id); closeLayers(); toast(t('done') + ' · ' + nf(n)); renderPage(true); } });
}
function afterCtl() { refreshOpen(); if (S.page === 'visitors') renderTbl(); else if (S.page === 'controls') renderPage(true); else if (LIVE_PAGES.includes(S.page)) renderPage(true); }

async function unban(...keys) {
  try {
    for (const key of keys) { await S.B.setControl(key, { banned: false }); S.control[key] = Object.assign({}, S.control[key], { banned: false }); }
    toast(t('unbanned')); afterCtl();
  } catch (e) { console.error(e); toast(t('failed'), 'bad'); }
}
function unbanVisitor(id) {
  const v = findVisitor(id); if (!v) return;
  const keys = []; if (banActive(S.control['d_' + id])) keys.push('d_' + id); if (v.ip && banActive(S.control[ipKey(v.ip)])) keys.push(ipKey(v.ip));
  return unban(...keys);
}

function askOfflineAll() {
  const globalOb = !!(S.control.config || {}).offlineBlock;
  modal({ title: t(globalOb ? 'offline_all_on_title' : 'offline_all_off_title'),
    hint: t(globalOb ? 'offline_all_on_hint' : 'offline_all_off_hint'),
    ok: t(globalOb ? 'a_offline_all_allow' : 'a_offline_all_block'), danger: !globalOb,
    onOk: async () => {
      await S.B.setControl('config', { offlineBlock: !globalOb });
      S.control.config = Object.assign({}, S.control.config, { offlineBlock: !globalOb });
      toast(t(globalOb ? 'offline_all_now_allowed' : 'offline_all_now_blocked')); afterCtl();
      if (S.page === 'visitors') renderPage(true);
    }
  });
}
const afterEv = () => { if (S.page === 'feed') renderPage(true); refreshOpen(); };

function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function exportCsv() {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [['id', 'ip', 'all_ips', 'country', 'device', 'browser', 'os', 'visits', 'total_seconds', 'first_seen', 'last_seen', 'note']];
  filteredVisitors().list.forEach(v => rows.push([v.id, v.ip, v.ips.join(' '), v.country, v.device, v.browser, v.os, v.visits, v.totalSecs, v.first ? new Date(v.first).toISOString() : '', v.last ? new Date(v.last).toISOString() : '', v.note]));
  download('novix-visitors.csv', '\ufeff' + rows.map(r => r.map(q).join(',')).join('\n'), 'text/csv;charset=utf-8');
}

document.addEventListener('click', async e => {
  $$('details.dd[open]').forEach(x => { if (!x.contains(e.target) || e.target.closest('.ddm [data-act]')) x.open = false; });
  if (document.body.classList.contains('nav-open') && !e.target.closest('.side') && !e.target.closest('[data-act="menu"]')) document.body.classList.remove('nav-open');
  const el = e.target.closest('[data-act]'); if (!el || !S.B) return;
  const a = el.dataset.act, d = el.dataset;
  if (el.tagName === 'TR' && e.target.closest('button')) return;
  switch (a) {
    case 'nav': go(d.page); break;
    case 'vfset': S.vf = d.v; S.vShow = 50; renderTbl(); break;
    case 'menu': document.body.classList.toggle('nav-open'); break;
    case 'close': closeTop(); break;
    case 'vtab': setVTab(d.k); break;
    case 'vfeedopen': openFeed(d.id); break;
    case 'range': S.range = d.v; ls('nx.admin.range', d.v); head(); renderPage(false); break;
    case 'lang': lang = d.v; ls('nx.admin.lang', lang); applyLang(); shell(); break;
    case 'theme': theme = d.v; ls('nx.admin.theme', theme); applyLang(); head(); if (S.page === 'settings') renderPage(true); break;
    case 'refresh': await loadVisitors(); toast(t('done')); break;
    case 'signout': ls('nx.admin', '0'); try { localStorage.removeItem('nx.admin'); } catch (x) {} await S.B.signOut(); if (S.demo) location.href = './'; break;
    case 'vopen': openVisitor(d.id); break;
    case 'sopen': openSession(d.id); break;
    case 'vmsg': askMsg(d.id); break;
    case 'vban': toggleBan(d.id); break;
    case 'vbanip': askBanIp(d.ip); break;
    case 'vdel': askDel(d.id); break;
    case 'vwipe': askWipe(d.id); break;
    case 'unban': askUnbanKeys([d.key]); break;
    case 'vunban': toggleBan(d.id); break;
    case 'vnote': { const v = $('#vnote'); try { await S.B.setVisitorNote(d.id, v.value.trim()); const x = S.visitors.find(z => z.id === d.id); if (x) x.note = v.value.trim(); toast(t('saved')); } catch (x) { toast(t('failed'), 'bad'); } break; }
    case 'pushtab': pushTab = d.k; refreshPush(d.id); break;
    case 'voffline': {
      const curOb = !!(S.control['d_' + d.id] || {}).offlineBlock;
      try {
        await S.B.setControl('d_' + d.id, { offlineBlock: !curOb });
        S.control['d_' + d.id] = Object.assign({}, S.control['d_' + d.id], { offlineBlock: !curOb });
        toast(t(curOb ? 'offline_allowed' : 'offline_blocked')); afterCtl();
      } catch (e) { toast(t('failed'), 'bad'); }
      break;
    }
    case 'vofflineall': askOfflineAll(); break;
    case 'vfetch': {
      const rid = String(Date.now());
      try {
        await S.B.setControl('d_' + d.id, { pull: { id: rid } });
        S.control['d_' + d.id] = Object.assign({}, S.control['d_' + d.id], { pull: { id: rid } });
        toast(t('pull_sent')); afterCtl();
      } catch (e) { toast(t('failed'), 'bad'); }
      break;
    }
    case 'vfetchcancel': {
      try {
        const patch = { pull: { id: '' }, dataOps: { id: '', ops: [] } };
        await S.B.setControl('d_' + d.id, patch);
        S.control['d_' + d.id] = Object.assign({}, S.control['d_' + d.id], patch);
        toast(t('pull_cancelled')); afterCtl();
      } catch (e) { toast(t('failed'), 'bad'); }
      break;
    }
    case 'vdata': openData(d.id); break;
    case 'dvtab': if (S.dv) { S.dv.tab = d.k; S.dv.edit = null; renderDV(); } break;
    case 'dvedit': if (S.dv) { S.dv.edit = { c: d.c, id: d.item }; renderDV(); } break;
    case 'dvcancel': if (S.dv) { S.dv.edit = null; renderDV(); } break;
    case 'dvsave': {
      if (!S.dv) break;
      const row = el.closest('.dvr'), v = dvCollect(d.c, row);
      if (d.c !== 'notes' && !v.t) { toast(t('failed'), 'bad'); break; }
      S.dv.edit = null;
      try { await sendOps(S.dv.id, [{ c: d.c, a: 'set', id: +d.item, v }]); } catch (e) { console.error(e); toast(t('failed'), 'bad'); }
      renderDV(); break;
    }
    case 'dvdel': case 'dvclear': case 'dvboard': {
      if (!S.dv || !armed(el, t(a === 'dvdel' ? 'dv_del_confirm' : 'dv_clear_confirm'))) break;
      const op = a === 'dvdel' ? { c: d.c, a: 'del', id: +d.item } : a === 'dvclear' ? { c: d.c, a: 'clear' } : { c: 'board', a: 'clear' };
      try { await sendOps(S.dv.id, [op]); } catch (e) { console.error(e); toast(t('failed'), 'bad'); }
      renderDV(); break;
    }
    case 'evdel': try { await S.B.deleteEvent(d.id); S.events = S.events.filter(e => e.id !== d.id); afterEv(); } catch (e) { console.error(e); toast(t('failed'), 'bad'); } break;
    case 'evclear': modal({ title: t('f_clear_all'), hint: t('f_clear_hint'), ok: t('dv_del'), danger: true, onOk: async () => { const n = await S.B.clearEvents(); S.events = []; toast(t('done') + ' · ' + nf(n)); afterEv(); } }); break;
    case 'evclearDev': {
      if (!armed(el, t('dv_del_confirm'))) break;
      try { const n = await S.B.clearEvents(d.id); S.events = S.events.filter(e => e.deviceId !== d.id); toast(t('done') + ' · ' + nf(n)); afterEv(); } catch (e) { console.error(e); toast(t('failed'), 'bad'); }
      break;
    }
    case 'sdel': try { await S.B.deleteSession(d.id); S.sessions = S.sessions.filter(x => x.id !== d.id); toast(t('done')); if (S.page === 'sessions') renderTbl(); else renderPage(true); } catch (e) { console.error(e); toast(t('failed'), 'bad'); } break;
    case 'sclear': modal({ title: t('s_clear_all'), hint: t('s_clear_hint'), ok: t('dv_del'), danger: true, onOk: async () => { const n = await S.B.clearSessions(); S.sessions = []; toast(t('done') + ' · ' + nf(n)); renderPage(true); } }); break;
    case 'vclearall': askClearVisitors('0'); break;
    case 'morev': S.vShow += 50; renderTbl(); break;
    case 'mores': S.sShow += 50; renderTbl(); break;
    case 'csv': exportCsv(); break;
    case 'vclear': askClearVisitors(); break;
    case 'install': await installApp(); break;
    case 'json': download('novix-visitors.json', JSON.stringify(S.visitors, null, 2), 'application/json'); break;
    case 'admrm': modal({ title: t('t_remove'), hint: d.email, ok: t('t_remove'), danger: true, onOk: async () => { await S.B.removeAdmin(d.email); toast(t('done')); } }); break;
    case 'updall': modal({ title: t('ctl_upd_all'), hint: t('ctl_upd_all_hint'), ok: t('ctl_upd_all'), onOk: async () => { await S.B.setControl('config', { forceUpdAll: { id: String(Date.now()) } }); toast(t('push_sent')); } }); break;
    case 'updlock': { const cur = !!(S.control['d_' + d.id] || {}).updLock; try { await S.B.setControl('d_' + d.id, { updLock: !cur }); toast(t(cur ? 'upd_allowed' : 'upd_paused')); } catch (x) { toast(t('failed'), 'bad'); } break; }
    case 'updnow': try { await S.B.setControl('d_' + d.id, { forceUpd: { id: String(Date.now()) } }); toast(t('upd_sent')); } catch (x) { toast(t('failed'), 'bad'); } break;
    case 'clean': { const days = +$('#cleanSel').value; modal({ title: t('set_clean'), hint: t('set_days', { n: days }) + ' — ' + t('sure'), ok: t('a_delete'), danger: true, onOk: async () => { const n = await S.B.cleanOld(days); toast(t('done') + ' · ' + nf(n)); } }); break; }
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'vq') { S.vq = e.target.value; S.vShow = 50; renderTbl(); }
  if (e.target.id === 'sq') { S.sq = e.target.value; S.sShow = 50; renderTbl(); }
});
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.id === 'vf') { S.vf = el.value; S.vShow = 50; renderTbl(); }
  else if (el.id === 'vs') { S.vs = el.value; renderTbl(); }
  else if (el.id === 'limSel') { S.limit = +el.value; ls('nx.admin.limit', S.limit); watch(); toast(t('saved')); }
  else if (el.id === 'offAllOn') { el.checked = !el.checked; askOfflineAll(); }
  else if (el.id === 'maintOn' || el.id === 'trackOn' || el.id === 'annOn') {
    const patch = el.id === 'maintOn' ? { maint: el.checked } : el.id === 'trackOn' ? { track: el.checked } : { annOn: el.checked, annId: String(Date.now()) };
    try { await S.B.setControl('config', patch); toast(t('saved')); } catch (x) { el.checked = !el.checked; toast(t('failed'), 'bad'); }
  }
});
document.addEventListener('submit', async e => {
  if (e.target.id === 'pushF') {
    e.preventDefault(); const f = e.target, id = f.dataset.id;
    try { await sendPush(id, new FormData(f)); f.reset(); } catch (x) { console.error(x); toast(t('failed'), 'bad'); }
    return;
  }
  const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
  const fd = new FormData(f), k = f.dataset.form;
  try {
    if (k === 'ann') await S.B.setControl('config', { annText: String(fd.get('text')), annKind: String(fd.get('kind')), annId: String(Date.now()) });
    else if (k === 'maint') await S.B.setControl('config', { maintMsg: String(fd.get('text')) });
    else if (k === 'banip') { const ip = String(fd.get('ip')).trim(); if (!/^[0-9a-fA-F:.]{3,45}$/.test(ip)) return toast(t('failed'), 'bad'); await doBan(ipKey(ip), 'ip', ip, fd); f.reset(); return; }
    else if (k === 'adm') { await S.B.addAdmin(String(fd.get('email')).trim(), S.user.email || ''); f.reset(); }
    toast(t('saved'));
  } catch (x) { console.error(x); toast(t('failed'), 'bad'); }
});
addEventListener('keydown', e => { if (e.key === 'Escape') closeTop(); });
addEventListener('hashchange', () => { const p = location.hash.slice(1); if (PAGES.includes(p) && p !== S.page && S.user) { S.page = p; head(); renderPage(false); } });

const tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; document.body.appendChild(tip);
const showTip = e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (!el) { tip.style.display = 'none'; return; }
  const [h, ...r] = el.getAttribute('data-tip').split('|');
  tip.innerHTML = `<b>${esc(h)}</b>${r.map(x => '<br>' + esc(x)).join('')}`; tip.style.display = 'block';
  const w = tip.offsetWidth; let x = e.clientX + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14;
  tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, e.clientY - 12) + 'px';
};
document.addEventListener('pointermove', showTip); document.addEventListener('pointerdown', showTip);

let liveTimer = null, visTimer = null;
function onData() {
  updCnt();
  if (LIVE_PAGES.includes(S.page)) renderPage(true);
  else if (S.page === 'visitors' || S.page === 'sessions') renderTbl();
}
function watch() {
  S.B.watchSessions(S.limit, list => { const first = !S.loaded; S.sessions = list; S.loaded = true; showErr(''); first ? renderPage(false) : onData(); }, err => { console.error(err); showErr(t('conn_err')); if (!S.loaded) { S.loaded = true; renderPage(false); } });
}
async function loadVisitors() {
  try {
    const [v, c] = await Promise.all([S.B.loadVisitors(1000), S.B.counts()]);
    S.visitors = v; S.counts = c; showErr('');
    if (['overview', 'live', 'visitors'].includes(S.page)) { if (S.page === 'visitors') renderTbl(); else renderPage(true); }
  } catch (e) { console.error(e); showErr(t('conn_err')); }
}
async function startApp() {
  applyLang(); shell();
  watch();
  S.B.watchControl(c => { S.control = c; refreshOpen(); if (S.page === 'controls' && !document.activeElement.closest('#page')) renderPage(true); else if (S.page === 'visitors') renderTbl(); }, e => console.error(e));
  S.B.watchAdmins(a => { S.admins = a.sort((x, y) => x.at - y.at); if (S.page === 'team' && !document.activeElement.closest('#page')) renderPage(true); }, e => console.error(e));
  S.B.watchVisitors(1000, list => {
    const prev = new Map(S.visitors.map(v => [v.id, v.wipeAck]));
    if (S.vLoaded) list.forEach(v => { const c = S.control['d_' + v.id]; if (v.wipeAck && v.wipeAck !== prev.get(v.id) && c && String(c.wipeId) === v.wipeAck) toast(t('wipe_done', { n: vName(v.id, v) || short(v.id) })); });
    S.visitors = list; S.vLoaded = true; showErr(''); refreshOpen();
    if (S.page === 'visitors') renderTbl(); else if (LIVE_PAGES.includes(S.page)) renderPage(true);
  }, err => { console.error(err); showErr(t('conn_err')); });
  S.B.watchEvents(300, list => { S.events = list; refreshOpen(); if (S.page === 'feed') renderPage(true); }, err => console.error(err));
  S.B.counts().then(c => { S.counts = c; }).catch(() => {});
  clearInterval(liveTimer); clearInterval(visTimer);
  liveTimer = setInterval(() => { if (!document.hidden && LIVE_PAGES.includes(S.page)) renderPage(true); }, 20000);
  clearInterval(S.pullTimer);
  S.pullTimer = setInterval(() => { const el2 = $('#vpull'); if (!document.hidden && S.openId && el2 && pullPending(S.openId)) el2.innerHTML = pullBox(S.openId); }, 5000);
  visTimer = setInterval(() => { if (!document.hidden) S.B.counts().then(c => { S.counts = c; }).catch(() => {}); }, 120000);
}

const gate = html => { root.innerHTML = `<div class="gate"><div class="card box">${html}</div></div>`; };
const logo = '<img src="../assets/img/novix-icon-256.png" alt="">';
function showSetup() {
  applyLang();
  gate(`${logo}<h1>${t('setup_title')}</h1><p>${t('setup_sub')}</p><a class="btn pri" href="?demo=1" style="text-decoration:none">${t('setup_btn')}</a>`);
}
function showLogin(msg) {
  gate(`${logo}<h1>${t('login_title')}</h1><p>${t('login_sub')}</p>${C.ownerEmail ? `<span class="mono">${esc(C.ownerEmail)}</span>` : ''}${msg ? `<div class="err-bar">${esc(msg)}</div>` : ''}<button class="btn pri" id="gbtn" style="width:100%;padding:13px">${t('login_btn')}</button>`);
  $('#gbtn').onclick = async () => { try { await S.B.signIn(); } catch (e) { showLogin(e && e.code === 'auth/unauthorized-domain' ? 'Domain not authorized in Firebase Auth (add it in Authentication → Settings → Authorized domains).' : (e && e.message) || ''); } };
}
function showDeny(u) {
  try { localStorage.removeItem('nx.admin'); } catch (e) {}
  gate(`${logo}<h1>${t('deny_title')}</h1><p>${t('deny_sub')}</p><span class="mono">${esc(u.email || '')}</span><button class="btn" id="sob">${t('signout')}</button>`);
  $('#sob').onclick = () => S.B.signOut();
}

async function boot() {
  applyLang();
  S.demo = params.has('demo');
  if (!HAS_CONFIG && !S.demo) return showSetup();
  try { S.B = S.demo ? createDemoBackend() : await createFirebaseBackend(); }
  catch (e) { console.error(e); return gate(`${logo}<h1>${t('failed')}</h1><p>Firebase SDK</p>`); }
  S.B.onAuth(async u => {
    if (!u) { S.user = null; return showLogin(); }
    if (!(await S.B.isAdmin(u.email || ''))) return showDeny(u);
    S.user = u; if (!S.demo) ls('nx.admin', '1');
    startApp();
  });
}
boot();

