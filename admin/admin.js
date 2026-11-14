import { L } from './i18n.js';
import { HAS_CONFIG, createFirebaseBackend, createDemoBackend, ms, ipKey } from './data.js';

/* ============================== أدوات ============================== */
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
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'
};
const ic = n => `<svg class="i" viewBox="0 0 24 24">${IC[n] || ''}</svg>`;
const devIc = d => ic(d === 'mobile' ? 'phone' : d === 'tablet' ? 'tablet' : 'monitor');

/* ============================== الحالة ============================== */
const S = {
  B: null, user: null, demo: false, page: (location.hash || '#overview').slice(1) || 'overview', range: ls('nx.admin.range') || '7d',
  sessions: [], visitors: [], control: {}, admins: [], counts: null, loaded: false, err: null,
  limit: +ls('nx.admin.limit') || 500, vq: '', vf: 'all', vs: 'last', vShow: 50, sq: '', sShow: 50
};
const PAGES = ['overview', 'live', 'visitors', 'sessions', 'usage', 'controls', 'team', 'settings'];
if (!PAGES.includes(S.page)) S.page = 'overview';
const hbSec = Math.max(30, Math.min(300, +C.heartbeatSec || 60));
const onlineThr = () => Math.max(90, hbSec * 1.6) * 1000;
const root = $('#root');

/* ============================== التحليلات ============================== */
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
  const sum = (key) => { const m = {}; ss.forEach(s => { for (const k in s[key]) m[k] = (m[k] || 0) + s[key][k]; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const cnt = (fn) => { const m = {}; perDev.forEach(o => { const k = fn(o.last) || '—'; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const hours = Array(24).fill(0), wd = Array(7).fill(0), durB = Array(5).fill(0);
  ss.forEach(s => { const d = new Date(s.start); hours[d.getHours()]++; wd[d.getDay()]++; durB[s.secs < 60 ? 0 : s.secs < 300 ? 1 : s.secs < 900 ? 2 : s.secs < 1800 ? 3 : 4]++; });
  const avg = ss.length ? ss.reduce((a, s) => a + s.secs, 0) / ss.length : 0;
  return {
    ss, onlineS, onlineDev, uniq: perDev.size, avg, returning, buckets, hours, wd, durB, hourly,
    devices: cnt(s => s.device), countries: cnt(s => s.country), browsers: cnt(s => s.browser), oss: cnt(s => s.os),
    vsecs: sum('vsecs'), views: sum('views'), acts: sum('acts')
  };
}

/* ============================== مكوّنات الرسم ============================== */
function spark(vals, color = 'var(--acc)') {
  const W = 96, H = 38, mx = Math.max(1, ...vals), step = W / Math.max(1, vals.length - 1);
  const pts = vals.map((v, i) => [i * step, H - 4 - (v / mx) * (H - 10)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return `<svg class="sp" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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
function lineChart(bk, hourly) {
  const W = 720, H = 240, pl = 36, pr = 10, pt = 12, pb = 28, n = bk.length;
  const mx = niceMax(Math.max(1, ...bk.map(b => b.s))), iw = W - pl - pr, ih = H - pt - pb;
  const X = i => pl + (n === 1 ? iw / 2 : i * iw / (n - 1)), Y = v => pt + ih - (v / mx) * ih;
  const ps = bk.map((b, i) => [+X(i).toFixed(1), +Y(b.s).toFixed(1)]), pu = bk.map((b, i) => [+X(i).toFixed(1), +Y(b.u.size).toFixed(1)]);
  let g = ''; for (let i = 0; i <= 4; i++) { const y = pt + ih - ih * i / 4; g += `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end">${nf(mx * i / 4)}</text>`; }
  const every = Math.ceil(n / 7); let xl = '';
  bk.forEach((b, i) => { if (i % every === 0 || i === n - 1) { const d = new Date(b.t); xl += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${hourly ? d.getHours() + ':00' : d.toLocaleDateString(loc(), { month: 'short', day: 'numeric' })}</text>`; } });
  const area = smooth(ps) + ` L${ps[n - 1][0]} ${pt + ih} L${ps[0][0]} ${pt + ih} Z`;
  const sw = n === 1 ? iw : iw / (n - 1);
  const hits = bk.map((b, i) => `<rect class="hit" x="${X(i) - sw / 2}" y="${pt}" width="${sw}" height="${ih}" data-tip="${esc((hourly ? new Date(b.t).getHours() + ':00' : new Date(b.t).toLocaleDateString(loc(), { weekday: 'short', month: 'short', day: 'numeric' })) + '|' + t('s_visits') + ': ' + b.s + '|' + t('s_unique') + ': ' + b.u.size)}"/>`).join('');
  return `<div style="direction:ltr"><svg class="chart" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".38"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>${g}${xl}<path d="${area}" fill="url(#ga)"/><path d="${smooth(ps)}" fill="none" stroke="var(--acc)" stroke-width="2.6" stroke-linecap="round"/><path d="${smooth(pu)}" fill="none" stroke="var(--acc2)" stroke-width="2" stroke-dasharray="5 5" stroke-linecap="round"/>${hits}</svg></div>
  <div class="legend"><span><i style="background:var(--acc)"></i>${t('s_visits')}</span><span><i style="background:var(--acc2)"></i>${t('s_unique')}</span></div>`;
}
function donut(items, labelFn) {
  const tot = items.reduce((a, b) => a + b[1], 0); if (!tot) return emptyBox();
  const r = 54, c = 2 * Math.PI * r; let off = 0, segs = '';
  items.slice(0, 5).forEach(([k, v], i) => { const len = v / tot * c; segs += `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${COLORS[i]}" stroke-width="16" stroke-dasharray="${Math.max(0, len - 2).toFixed(1)} ${c.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 70 70)" stroke-linecap="butt"/>`; off += len; });
  const lg = items.slice(0, 5).map(([k, v], i) => `<div><i style="background:${COLORS[i]}"></i><span>${esc(labelFn(k))}</span><b>${Math.round(v / tot * 100)}%</b></div>`).join('');
  return `<div class="donut-wrap"><svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--line)" stroke-width="16"/>${segs}<text x="70" y="68" text-anchor="middle" style="font-size:24px;font-weight:700;fill:var(--text)">${nf(tot)}</text><text x="70" y="86" text-anchor="middle" style="font-size:10.5px;fill:var(--muted)">${t('s_unique')}</text></svg><div class="lg">${lg}</div></div>`;
}
function bars(items, o = {}) {
  if (!items.length) return emptyBox();
  const mx = Math.max(1, ...items.map(i => i[1])), tot = items.reduce((a, b) => a + b[1], 0);
  return `<div class="bars">${items.slice(0, o.max || 6).map(([k, v]) => `<div class="bar"><div class="row"><span>${o.pre ? o.pre(k) : ''}${esc(o.label ? o.label(k) : k)}</span><b>${o.fmt ? o.fmt(v) : nf(v)}${o.pct === false ? '' : `<em>${Math.round(v / tot * 100)}%</em>`}</b></div><div class="tr"><i style="width:${(v / mx * 100).toFixed(1)}%"></i></div></div>`).join('')}</div>`;
}
function heat(arr) {
  const mx = Math.max(1, ...arr);
  return `<div class="heat">${arr.map((v, i) => `<i style="--a:${(v / mx).toFixed(2)}" data-tip="${esc(i + ':00|' + t('s_visits') + ': ' + v)}"><span>${i}</span></i>`).join('')}</div>`;
}
const emptyBox = () => `<div class="empty"><b>${t('nodata')}</b>${t('nodata_sub')}</div>`;
const kpi = (i, v, l, sp) => `<div class="card kpi"><div class="ic">${ic(i)}</div>${sp || ''}<div class="v">${v}</div><div class="l">${l}</div></div>`;

/* ============================== الصفحات ============================== */
function limitNote() { return S.sessions.length >= S.limit ? `<div class="note-ln">${t('limit_note', { n: nf(S.limit) })}</div>` : ''; }

function pOverview() {
  const a = calc(), spk = a.buckets.map(b => b.s), spu = a.buckets.map(b => b.u.size);
  const ret = a.uniq ? Math.round(a.returning / a.uniq * 100) : 0;
  return `<div class="grid g-kpi">
    ${kpi('pulse', `<span class="live-dot"></span> ${nf(a.onlineDev.size)}`, t('k_online'))}
    ${kpi('users', nf(a.uniq), t('k_unique'), spark(spu))}
    ${kpi('layers', nf(a.ss.length), t('k_sessions'), spark(spk, 'var(--acc2)'))}
    ${kpi('clock', fmtDur(a.avg), t('k_avg'))}
    ${kpi('globe', S.counts ? nf(S.counts.visitors) : nf(S.visitors.length), `${t('k_total')} · ${t('k_alltime')}`)}
    ${kpi('repeat', ret + '%', t('k_return'))}
  </div>
  <div class="grid g-2">
    <div class="card"><h3>${ic('pulse')} ${t('c_traffic')}</h3>${a.ss.length ? lineChart(a.buckets, a.hourly) : emptyBox()}${limitNote()}</div>
    <div class="card"><h3>${ic('eye')} ${t('c_live')}<small>${nf(a.onlineDev.size)}</small></h3>${liveList(a, 6)}</div>
  </div>
  <div class="grid g-3">
    <div class="card"><h3>${ic('monitor')} ${t('c_devices')}</h3>${donut(a.devices, devLabel)}</div>
    <div class="card"><h3>${ic('globe')} ${t('c_countries')}</h3>${bars(a.countries, { label: cname, pre: k => `<span class="flag">${flag(k)}</span>` })}</div>
    <div class="card"><h3>${ic('layers')} ${t('c_browsers')}</h3>${bars(a.browsers)}<h3 style="margin-top:18px">${ic('gear')} ${t('c_os')}</h3>${bars(a.oss, { max: 4 })}</div>
  </div>
  <div class="grid g-3">
    <div class="card"><h3>${ic('clock')} ${t('c_sections')}</h3>${bars(a.vsecs, { label: secLabel, fmt: fmtDur, pct: false, max: 6 })}</div>
    <div class="card"><h3>${ic('bolt')} ${t('c_actions')}</h3>${bars(a.acts, { label: actLabel, pct: false, max: 6 })}</div>
    <div class="card"><h3>${ic('clock')} ${t('c_hours')}</h3>${heat(a.hours)}<h3 style="margin-top:18px">${ic('layers')} ${t('c_weekday')}</h3>${bars(a.wd.map((v, i) => [t('wd')[i], v]), { max: 7, pct: false })}</div>
  </div>
  <div class="card"><h3>${ic('layers')} ${t('c_recent')}</h3>${sessionTable(a.ss.slice(0, 8), false)}</div>`;
}

function liveList(a, max) {
  const list = Array.from(a.onlineDev.values()).sort((x, y) => y.last - x.last).slice(0, max);
  if (!list.length) return `<div class="empty">${t('nobody')}</div>`;
  return list.map(s => `<div class="sl" style="align-items:center;cursor:pointer" data-act="vopen" data-id="${esc(s.deviceId)}"><span class="dv"><span class="ico">${devIc(s.device)}</span><span><b>${esc(s.ip)}</b><small>${flag(s.country)} ${esc(cname(s.country))} · ${esc(s.browser)}</small></span></span><span style="text-align:end"><span class="pill ok"><span class="live-dot"></span>${esc(secLabel(s.view))}</span><br><small style="color:var(--muted)">${fmtDur(s.secs)}</small></span></div>`).join('');
}

function pLive() {
  const a = calc(), list = Array.from(a.onlineDev.values()).sort((x, y) => y.last - x.last);
  if (!list.length) return `<div class="card"><div class="empty"><b>${t('nobody')}</b>${t('nodata_sub')}</div></div>`;
  return `<div class="grid g-3">${list.map(s => `<div class="card">
    <div class="dv" style="margin-bottom:14px"><span class="ico">${devIc(s.device)}</span><span><b>${esc(s.ip)}</b><small>${flag(s.country)} ${esc(cname(s.country))}</small></span><span class="pill ok" style="margin-inline-start:auto"><span class="live-dot"></span>${t('st_online')}</span></div>
    <div class="facts" style="margin-bottom:12px"><div class="fact"><small>${t('th_section')}</small><b>${esc(secLabel(s.view))}</b></div><div class="fact"><small>${t('th_dur')}</small><b>${fmtDur(s.secs)}</b></div><div class="fact"><small>${t('th_env')}</small><b>${esc(s.browser)} · ${esc(s.os)}</b></div><div class="fact"><small>${t('th_last')}</small><b>${ago(s.last)}</b></div></div>
    <div class="row-act" style="justify-content:flex-start"><button class="btn sm" data-act="vopen" data-id="${esc(s.deviceId)}">${ic('eye')}${t('a_details')}</button><button class="btn sm" data-act="vmsg" data-id="${esc(s.deviceId)}">${ic('msg')}</button><button class="btn sm bad" data-act="vban" data-id="${esc(s.deviceId)}">${ic('ban')}</button></div>
  </div>`).join('')}</div>`;
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
    return (v.ip + ' ' + v.ips.join(' ') + ' ' + v.id + ' ' + v.country + ' ' + cname(v.country) + ' ' + v.note + ' ' + v.browser + ' ' + v.os).toLowerCase().includes(q);
  });
  const k = { last: (x, y) => y.last - x.last, visits: (x, y) => y.visits - x.visits, time: (x, y) => y.totalSecs - x.totalSecs, first: (x, y) => x.first - y.first }[S.vs];
  return { list: list.sort(k), online: a.onlineDev };
}
function visitorTable() {
  const { list, online } = filteredVisitors();
  if (!list.length) return emptyBox();
  const rows = list.slice(0, S.vShow).map(v => `<tr class="click" data-act="vopen" data-id="${esc(v.id)}">
    <td><div class="dv"><span class="ico">${devIc(v.device)}</span><span><b>${esc(short(v.id))}</b><small>${esc(devLabel(v.device))}${v.note ? ' · ' + esc(v.note.slice(0, 24)) : ''}</small></span></div></td>
    <td class="mono">${esc(v.ip)}${v.ips.length > 1 ? ` <small style="color:var(--muted)">+${v.ips.length - 1}</small>` : ''}</td>
    <td><span class="flag">${flag(v.country)}</span>${esc(cname(v.country))}</td>
    <td>${esc(v.browser)} · ${esc(v.os)}</td><td>${nf(v.visits)}</td><td>${fmtDur(v.totalSecs)}</td><td>${ago(v.last)}</td><td>${statusPill(v, online)}</td>
    <td><div class="row-act"><button class="btn sm" data-act="vmsg" data-id="${esc(v.id)}" title="${t('a_message')}">${ic('msg')}</button>${isBanned(v) ? `<button class="btn sm" data-act="unban" data-key="d_${esc(v.id)}">${t('a_unban')}</button>` : `<button class="btn sm bad" data-act="vban" data-id="${esc(v.id)}" title="${t('a_ban')}">${ic('ban')}</button>`}</div></td></tr>`).join('');
  return `<div class="tw"><table><thead><tr><th>${t('th_device')}</th><th>${t('th_ip')}</th><th>${t('th_country')}</th><th>${t('th_env')}</th><th>${t('th_visits')}</th><th>${t('th_time')}</th><th>${t('th_last')}</th><th>${t('th_status')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  ${list.length > S.vShow ? `<div class="more"><button class="btn" data-act="morev">${t('a_load_more')} (${nf(list.length - S.vShow)})</button></div>` : ''}`;
}
function pVisitors() {
  const opt = (v, k, cur) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${t(k)}</option>`;
  return `<div class="card"><div class="tbar">
    <div class="search">${ic('search')}<input id="vq" value="${esc(S.vq)}" placeholder="${esc(t('v_search'))}" autocomplete="off"></div>
    <select class="inp" id="vf">${opt('all', 'v_all', S.vf)}${opt('online', 'v_online', S.vf)}${opt('returning', 'v_returning', S.vf)}${opt('banned', 'v_banned', S.vf)}</select>
    <select class="inp" id="vs">${opt('last', 'sort_last', S.vs)}${opt('visits', 'sort_visits', S.vs)}${opt('time', 'sort_time', S.vs)}${opt('first', 'sort_first', S.vs)}</select>
    <button class="btn" data-act="csv">${ic('download')}${t('a_export')}</button></div>
    <div id="tbl">${visitorTable()}</div></div>`;
}

function sessionTable(list, withMore) {
  if (!list.length) return emptyBox();
  const rows = list.map(s => `<tr class="click" data-act="sopen" data-id="${esc(s.id)}">
    <td>${dtm(s.start)}</td><td class="mono">${esc(s.ip)}</td><td><span class="flag">${flag(s.country)}</span>${esc(cname(s.country))}</td>
    <td><span class="dv"><span class="ico" style="width:28px;height:28px;border-radius:9px">${devIc(s.device)}</span>${esc(s.browser)}</span></td>
    <td>${fmtDur(s.secs)}</td><td>${esc(secLabel(s.view))}</td><td>${nf(Object.values(s.acts).reduce((x, y) => x + y, 0))}</td><td>${esc(s.ref || '—')}</td></tr>`).join('');
  return `<div class="tw"><table><thead><tr><th>${t('th_start')}</th><th>${t('th_ip')}</th><th>${t('th_country')}</th><th>${t('th_device')}</th><th>${t('th_dur')}</th><th>${t('th_section')}</th><th>${t('th_used')}</th><th>${t('th_ref')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function sessionsBody() {
  const a = calc(), q = S.sq.trim().toLowerCase();
  const list = a.ss.filter(s => !q || (s.ip + ' ' + s.country + ' ' + cname(s.country) + ' ' + s.browser + ' ' + s.os + ' ' + s.ref + ' ' + s.deviceId).toLowerCase().includes(q));
  return sessionTable(list.slice(0, S.sShow)) + (list.length > S.sShow ? `<div class="more"><button class="btn" data-act="mores">${t('a_load_more')} (${nf(list.length - S.sShow)})</button></div>` : '') + limitNote();
}
function pSessions() {
  return `<div class="card"><div class="tbar"><div class="search">${ic('search')}<input id="sq" value="${esc(S.sq)}" placeholder="${esc(t('v_search'))}" autocomplete="off"></div></div><div id="tbl">${sessionsBody()}</div></div>`;
}

function pUsage() {
  const a = calc();
  return `<div class="grid g-2e">
    <div class="card"><h3>${ic('clock')} ${t('c_sections')}</h3>${bars(a.vsecs, { label: secLabel, fmt: fmtDur, pct: false, max: 10 })}</div>
    <div class="card"><h3>${ic('eye')} ${t('c_views')}</h3>${bars(a.views, { label: secLabel, max: 10 })}</div></div>
  <div class="grid g-2e">
    <div class="card"><h3>${ic('bolt')} ${t('c_actions')}</h3>${bars(a.acts, { label: actLabel, pct: false, max: 10 })}</div>
    <div class="card"><h3>${ic('layers')} ${t('c_dur')}</h3>${bars(a.durB.map((v, i) => [t('dur_b')[i] || i, v]).filter(x => true), { max: 5 })}</div></div>
  <div class="grid g-2e">
    <div class="card"><h3>${ic('clock')} ${t('c_hours')}</h3>${heat(a.hours)}</div>
    <div class="card"><h3>${ic('layers')} ${t('c_weekday')}</h3>${bars(a.wd.map((v, i) => [t('wd')[i], v]), { max: 7 })}</div></div>${limitNote()}`;
}

function pControls() {
  const cfg = S.control.config || {}, bans = Object.entries(S.control).filter(([k, o]) => (k.startsWith('d_') || k.startsWith('i_')) && banActive(o));
  const kinds = ['info', 'warn', 'bad'].map(k => `<option value="${k}" ${cfg.annKind === k ? 'selected' : ''}>${t('k_' + k)}</option>`).join('');
  return `<div class="grid g-2e">
  <div class="card"><div class="ctl-h" style="--c:var(--acc)"><span class="ic">${ic('mega')}</span><div><b>${t('ctl_ann')}</b><small>${t('ctl_ann_sub')}</small></div><label class="sw"><input type="checkbox" id="annOn" ${cfg.annOn ? 'checked' : ''}><i></i></label></div>
    <form data-form="ann"><div class="fld"><label>${t('ctl_ann_text')}</label><textarea class="inp" name="text" maxlength="240">${esc(cfg.annText || '')}</textarea></div>
    <div class="inl"><div class="fld"><label>${t('ctl_kind')}</label><select class="inp" name="kind" style="width:100%">${kinds}</select></div><button class="btn pri" type="submit">${ic('check')}${t('a_save')}</button></div></form></div>
  <div class="card"><div class="ctl-h" style="--c:var(--warn)"><span class="ic">${ic('wrench')}</span><div><b>${t('ctl_maint')}</b><small>${t('ctl_maint_sub')}</small></div><label class="sw"><input type="checkbox" id="maintOn" ${cfg.maint ? 'checked' : ''}><i></i></label></div>
    <form data-form="maint"><div class="fld"><label>${t('ctl_maint_msg')}</label><textarea class="inp" name="text" maxlength="240">${esc(cfg.maintMsg || '')}</textarea></div><button class="btn pri" type="submit">${ic('check')}${t('a_save')}</button></form></div></div>
  <div class="grid g-2e">
  <div class="card"><div class="ctl-h" style="--c:var(--acc2)"><span class="ic">${ic('pulse')}</span><div><b>${t('ctl_track')}</b><small>${t('ctl_track_sub')}</small></div><label class="sw"><input type="checkbox" id="trackOn" ${cfg.track === false ? '' : 'checked'}><i></i></label></div>
    <div class="hint-box">${ic('alert')} ${t('b_hint')}</div></div>
  <div class="card"><h3>${ic('ban')} ${t('ctl_addban')}</h3><form data-form="banip"><div class="inl"><div class="fld"><label>${t('ctl_ip')}</label><input class="inp mono" name="ip" required maxlength="45" placeholder="41.34.12.9"></div>
    <div class="fld"><label>${t('b_dur')}</label><select class="inp" name="dur" style="width:100%"><option value="3600000">${t('b_1h')}</option><option value="86400000">${t('b_24h')}</option><option value="604800000">${t('b_7d')}</option><option value="0" selected>${t('b_forever')}</option></select></div></div>
    <div class="fld" style="margin-top:12px"><label>${t('b_reason')}</label><input class="inp" name="reason" maxlength="120"></div><button class="btn bad" type="submit">${ic('ban')}${t('a_banip')}</button></form></div></div>
  <div class="card"><h3>${ic('shield')} ${t('ctl_bans')}<small>${bans.length}</small></h3>${bans.length ? bans.map(([k, o]) => `<div class="banrow"><span class="ico pill bd">${ic('ban')}</span><div><b class="mono">${k.startsWith('d_') ? esc(short(k.slice(2))) + '…' : esc(o.value || k)}</b><small>${k.startsWith('d_') ? t('th_device') : t('th_ip')} · ${ms(o.until) ? t('ctl_until') + ' ' + dtm(ms(o.until)) : t('ctl_forever')}${o.reason ? ' · ' + esc(o.reason) : ''}</small></div><button class="btn sm" data-act="unban" data-key="${esc(k)}">${t('a_unban')}</button></div>`).join('') : `<div class="empty">${t('ctl_nobans')}</div>`}</div>`;
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
    <div style="margin-top:22px"><button class="btn" data-act="json">${ic('download')}${t('set_exp')}</button></div><div class="hint-box">${t('priv')}</div></div></div>`;
}

const PAGE_FN = { overview: pOverview, live: pLive, visitors: pVisitors, sessions: pSessions, usage: pUsage, controls: pControls, team: pTeam, settings: pSettings };
const NAV = [['overview', 'dash'], ['live', 'pulse'], ['visitors', 'users'], ['sessions', 'layers'], ['usage', 'bolt'], ['controls', 'sliders'], ['team', 'shield'], ['settings', 'gear']];
const RANGED = ['overview', 'usage', 'sessions'];
const LIVE_PAGES = ['overview', 'live', 'usage'];

/* ============================== الهيكل ============================== */
function shell() {
  const u = S.user, name = u.displayName || u.email || '';
  const nav = NAV.map(([p, i], idx) => `${idx === 0 ? `<div class="nav-h">${t('sec_analytics')}</div>` : ''}${p === 'controls' ? `<div class="nav-h">${t('sec_manage')}</div>` : ''}<a data-act="nav" data-page="${p}" class="${S.page === p ? 'on' : ''}">${ic(i)}<span>${t('nav_' + p)}</span>${p === 'live' ? '<span class="cnt" id="liveCnt">0</span>' : ''}</a>`).join('');
  root.innerHTML = `<div class="app"><aside class="side"><div class="brand"><img src="../assets/img/novix-icon-64.png" alt=""><div><b>NOVIX</b><small>${t('app')}</small></div></div><nav class="nav">${nav}</nav>
    <div class="side-foot"><div class="me"><span class="av">${u.photoURL ? `<img src="${esc(u.photoURL)}" referrerpolicy="no-referrer" alt="">` : esc(name.slice(0, 1).toUpperCase())}</span><div><b>${esc(name)}</b><small>${esc(u.email || '')}</small></div></div><button class="btn" data-act="signout">${ic('logout')}${t('signout')}</button></div></aside>
    <main class="main"><div class="top"><button class="ib menu-btn" data-act="menu">${ic('menu')}</button><div class="grow"><h1 id="ttl"></h1><p id="sub"></p></div><div class="tools" id="tools"></div></div><div id="err"></div><div id="page"></div></main></div>`;
  head(); renderPage(false);
}
function head() {
  $('#ttl').textContent = t('nav_' + S.page); $('#sub').textContent = t('sub_' + S.page);
  const rng = ['today', '7d', '30d', 'all'].map(r => `<button data-act="range" data-v="${r}" class="${S.range === r ? 'on' : ''}">${t('r_' + r)}</button>`).join('');
  $('#tools').innerHTML = `${S.demo ? `<span class="badge-demo">${t('demo_badge')}</span>` : ''}${RANGED.includes(S.page) ? `<div class="seg">${rng}</div>` : ''}
    <button class="ib" data-act="refresh" title="${t('a_refresh')}">${ic('refresh')}</button><button class="ib" data-act="lang" data-v="${lang === 'ar' ? 'en' : 'ar'}" title="Language"><b style="font-size:12px">${lang === 'ar' ? 'EN' : 'ع'}</b></button><button class="ib" data-act="theme" data-v="${theme === 'dark' ? 'light' : 'dark'}">${ic(theme === 'dark' ? 'sun' : 'moon')}</button>`;
  $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.page === S.page));
}
let lastPage = null;
function renderPage(again) {
  const el = $('#page'); if (!el) return;
  el.classList.toggle('again', !!again && lastPage === S.page); lastPage = S.page;
  el.innerHTML = PAGE_FN[S.page]();
  const n = calc().onlineDev.size, c = $('#liveCnt'); if (c) c.textContent = nf(n);
}
function renderTbl() { const el = $('#tbl'); if (!el) return; el.innerHTML = S.page === 'visitors' ? visitorTable() : sessionsBody(); }
function showErr(msg) { const e = $('#err'); if (e) e.innerHTML = msg ? `<div class="err-bar">${ic('alert')} ${esc(msg)}</div>` : ''; }
function go(p) { S.page = p; location.hash = p; document.body.classList.remove('nav-open'); head(); renderPage(false); window.scrollTo(0, 0); }

/* ============================== نوافذ وإجراءات ============================== */
function toast(msg, kind = 'ok') {
  $$('.toast').forEach(x => x.remove());
  const d = document.createElement('div'); d.className = 'toast ' + kind; d.innerHTML = ic(kind === 'ok' ? 'check' : 'alert') + '<span>' + esc(msg) + '</span>';
  document.body.appendChild(d); setTimeout(() => d.remove(), 2600);
}
function closeLayers() { $$('.shade,.drawer,.modal').forEach(x => x.remove()); }
function modal({ title, hint, body, ok, danger, onOk }) {
  closeLayers();
  const sh = document.createElement('div'); sh.className = 'shade'; sh.onclick = closeLayers;
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<form class="box"><h3>${esc(title)}</h3>${hint ? `<p class="hint">${esc(hint)}</p>` : ''}${body || ''}<div class="mact"><button type="button" class="btn" data-act="close">${t('a_cancel')}</button><button type="submit" class="btn ${danger ? 'bad' : 'pri'}">${esc(ok || t('a_confirm'))}</button></div></form>`;
  document.body.append(sh, m);
  const f = $('form', m); const first = $('input,textarea', f); if (first) first.focus();
  f.onsubmit = async e => { e.preventDefault(); try { await onOk(new FormData(f)); closeLayers(); } catch (err) { console.error(err); toast(t('failed') + ' — ' + (err && (err.code || err.message) || ''), 'bad'); } };
}
function drawer(html) {
  closeLayers();
  const sh = document.createElement('div'); sh.className = 'shade'; sh.onclick = closeLayers;
  const d = document.createElement('aside'); d.className = 'drawer'; d.innerHTML = html;
  document.body.append(sh, d);
}
const findVisitor = id => S.visitors.find(v => v.id === id) || (() => { const s = S.sessions.find(x => x.deviceId === id); return s ? { id, ip: s.ip, ips: [s.ip], country: s.country, device: s.device, browser: s.browser, os: s.os, lang: s.lang, visits: S.sessions.filter(x => x.deviceId === id).length, totalSecs: 0, first: s.start, last: s.last, note: '' } : null; })();

function openVisitor(id) {
  const v = findVisitor(id); if (!v) return;
  const ss = S.sessions.filter(s => s.deviceId === id), vs = {}, ac = {}, secs = {};
  ss.forEach(s => { for (const k in s.vsecs) secs[k] = (secs[k] || 0) + s.vsecs[k]; for (const k in s.acts) ac[k] = (ac[k] || 0) + s.acts[k]; });
  const last = ss[0], banned = isBanned(v);
  drawer(`<div class="dh"><span class="dv"><span class="ico" style="width:46px;height:46px">${devIc(v.device)}</span></span><div style="flex:1"><h2 class="mono">${esc(short(v.id))}…</h2><small style="color:var(--muted)">${flag(v.country)} ${esc(cname(v.country))} · ${esc(v.browser)} · ${esc(v.os)}</small></div><button class="ib" data-act="close">${ic('x')}</button></div>
    <div class="facts"><div class="fact"><small>${t('th_ip')}</small><b class="mono">${esc(v.ip)}</b></div><div class="fact"><small>${t('th_status')}</small><b>${banned ? t('st_banned') : (calc().onlineDev.has(id) ? t('st_online') : t('st_offline'))}</b></div>
    <div class="fact"><small>${t('d_visits')}</small><b>${nf(v.visits)}</b></div><div class="fact"><small>${t('d_total')}</small><b>${fmtDur(v.totalSecs || ss.reduce((a, s) => a + s.secs, 0))}</b></div>
    <div class="fact"><small>${t('d_first')}</small><b>${dtm(v.first)}</b></div><div class="fact"><small>${t('d_lastseen')}</small><b>${dtm(v.last)}</b></div>
    <div class="fact"><small>${t('d_lang')}</small><b>${esc(v.lang || '—')}</b></div><div class="fact"><small>${t('d_screen')}</small><b>${esc(last ? last.scr : '—')}</b></div></div>
    <div class="dsec">${t('d_ips')}</div><div class="chips">${(v.ips.length ? v.ips : [v.ip]).map(i => `<span class="chip mono">${esc(i)}</span>`).join('')}</div>
    ${Object.keys(secs).length ? `<div class="dsec">${t('d_sections')}</div>${bars(Object.entries(secs).sort((a, b) => b[1] - a[1]), { label: secLabel, fmt: fmtDur, pct: false, max: 6 })}` : ''}
    ${Object.keys(ac).length ? `<div class="dsec">${t('d_acts')}</div><div class="chips">${Object.entries(ac).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="chip">${esc(actLabel(k))} · ${n}</span>`).join('')}</div>` : ''}
    <div class="dsec">${t('d_note')}</div><textarea class="inp" id="vnote" maxlength="200" data-id="${esc(id)}">${esc(v.note)}</textarea><div style="margin-top:8px"><button class="btn sm" data-act="vnote" data-id="${esc(id)}">${ic('check')}${t('a_save')}</button></div>
    ${ss.length ? `<div class="dsec">${t('d_sessions')}</div>${ss.slice(0, 6).map(s => `<div class="sl"><span>${dtm(s.start)}</span><span>${esc(secLabel(s.view))}</span><b>${fmtDur(s.secs)}</b></div>`).join('')}` : ''}
    <div class="dact"><button class="btn" data-act="vmsg" data-id="${esc(id)}">${ic('msg')}${t('a_message')}</button>${banned ? `<button class="btn" data-act="unban" data-key="d_${esc(id)}">${t('a_unban')}</button>` : `<button class="btn bad" data-act="vban" data-id="${esc(id)}">${ic('ban')}${t('a_ban')}</button>${v.ip !== 'unknown' ? `<button class="btn bad" data-act="vbanip" data-ip="${esc(v.ip)}">${ic('ban')}${t('a_banip')}</button>` : ''}`}<button class="btn bad" data-act="vdel" data-id="${esc(id)}">${ic('trash')}${t('a_delete')}</button></div>`);
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
  await S.B.setControl(key, { banned: true, until: dur ? S.B.ts(Date.now() + dur) : null, reason: String(fd.get('reason') || ''), type, value, at: S.B.stamp(), by: S.user.email || '' });
  toast(t('done'));
}
function askBan(id) { modal({ title: t('b_title'), hint: t('b_hint'), body: durOpts(), ok: t('a_ban'), danger: true, onOk: fd => doBan('d_' + id, 'device', id, fd) }); }
function askBanIp(ip) { modal({ title: t('b_title') + ' · ' + ip, hint: t('b_hint'), body: durOpts(), ok: t('a_banip'), danger: true, onOk: fd => doBan(ipKey(ip), 'ip', ip, fd) }); }
function askMsg(id) {
  modal({ title: t('m_title'), hint: t('m_hint'), body: `<div class="fld"><label>${t('m_text')}</label><textarea class="inp" name="text" maxlength="300" required></textarea></div>`, ok: t('a_confirm'),
    onOk: async fd => { await S.B.setControl('d_' + id, { message: String(fd.get('text')), msgId: String(Date.now()), msgAt: S.B.stamp() }); toast(t('done')); } });
}
function askDel(id) {
  modal({ title: t('a_delete'), hint: t('sure'), ok: t('a_delete'), danger: true, onOk: async () => { const n = await S.B.deleteVisitor(id); S.visitors = S.visitors.filter(v => v.id !== id); S.sessions = S.sessions.filter(s => s.deviceId !== id); toast(t('done') + ' · ' + nf(n)); renderPage(true); } });
}
async function unban(key) { try { await S.B.setControl(key, { banned: false }); toast(t('done')); } catch (e) { toast(t('failed'), 'bad'); } }

function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function exportCsv() {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [['id', 'ip', 'all_ips', 'country', 'device', 'browser', 'os', 'visits', 'total_seconds', 'first_seen', 'last_seen', 'note']];
  filteredVisitors().list.forEach(v => rows.push([v.id, v.ip, v.ips.join(' '), v.country, v.device, v.browser, v.os, v.visits, v.totalSecs, v.first ? new Date(v.first).toISOString() : '', v.last ? new Date(v.last).toISOString() : '', v.note]));
  download('novix-visitors.csv', '\ufeff' + rows.map(r => r.map(q).join(',')).join('\n'), 'text/csv;charset=utf-8');
}

/* ============================== الأحداث ============================== */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el || !S.B) return;
  const a = el.dataset.act, d = el.dataset;
  if (el.tagName === 'TR' && e.target.closest('button')) return;
  switch (a) {
    case 'nav': go(d.page); break;
    case 'menu': document.body.classList.toggle('nav-open'); break;
    case 'close': closeLayers(); break;
    case 'range': S.range = d.v; ls('nx.admin.range', d.v); head(); renderPage(false); break;
    case 'lang': lang = d.v; ls('nx.admin.lang', lang); applyLang(); shell(); break;
    case 'theme': theme = d.v; ls('nx.admin.theme', theme); applyLang(); head(); if (S.page === 'settings') renderPage(true); break;
    case 'refresh': await loadVisitors(); toast(t('done')); break;
    case 'signout': ls('nx.admin', '0'); try { localStorage.removeItem('nx.admin'); } catch (x) {} await S.B.signOut(); if (S.demo) location.href = './'; break;
    case 'vopen': openVisitor(d.id); break;
    case 'sopen': openSession(d.id); break;
    case 'vmsg': askMsg(d.id); break;
    case 'vban': askBan(d.id); break;
    case 'vbanip': askBanIp(d.ip); break;
    case 'vdel': askDel(d.id); break;
    case 'unban': await unban(d.key); break;
    case 'vnote': { const v = $('#vnote'); try { await S.B.setVisitorNote(d.id, v.value.trim()); const x = S.visitors.find(z => z.id === d.id); if (x) x.note = v.value.trim(); toast(t('saved')); } catch (x) { toast(t('failed'), 'bad'); } break; }
    case 'morev': S.vShow += 50; renderTbl(); break;
    case 'mores': S.sShow += 50; renderTbl(); break;
    case 'csv': exportCsv(); break;
    case 'json': download('novix-visitors.json', JSON.stringify(S.visitors, null, 2), 'application/json'); break;
    case 'admrm': modal({ title: t('t_remove'), hint: d.email, ok: t('t_remove'), danger: true, onOk: async () => { await S.B.removeAdmin(d.email); toast(t('done')); } }); break;
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
  else if (el.id === 'maintOn' || el.id === 'trackOn' || el.id === 'annOn') {
    const patch = el.id === 'maintOn' ? { maint: el.checked } : el.id === 'trackOn' ? { track: el.checked } : { annOn: el.checked, annId: String(Date.now()) };
    try { await S.B.setControl('config', patch); toast(t('saved')); } catch (x) { el.checked = !el.checked; toast(t('failed'), 'bad'); }
  }
});
document.addEventListener('submit', async e => {
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
addEventListener('keydown', e => { if (e.key === 'Escape') closeLayers(); });
addEventListener('hashchange', () => { const p = location.hash.slice(1); if (PAGES.includes(p) && p !== S.page && S.user) { S.page = p; head(); renderPage(false); } });

/* التلميحات */
const tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; document.body.appendChild(tip);
document.addEventListener('mousemove', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (!el) { tip.style.display = 'none'; return; }
  const [h, ...r] = el.getAttribute('data-tip').split('|');
  tip.innerHTML = `<b>${esc(h)}</b>${r.map(x => '<br>' + esc(x)).join('')}`; tip.style.display = 'block';
  const w = tip.offsetWidth; let x = e.clientX + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14;
  tip.style.left = x + 'px'; tip.style.top = Math.max(8, e.clientY - 12) + 'px';
});

/* ============================== البيانات والتشغيل ============================== */
let liveTimer = null, visTimer = null;
function onData() {
  const c = $('#liveCnt'); if (c) c.textContent = nf(calc().onlineDev.size);
  if (LIVE_PAGES.includes(S.page)) renderPage(true);
  else if (S.page === 'visitors' || S.page === 'sessions') renderTbl();
}
function watch() {
  S.B.watchSessions(S.limit, list => { S.sessions = list; S.loaded = true; showErr(''); onData(); }, err => { console.error(err); showErr(t('conn_err')); });
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
  S.B.watchControl(c => { S.control = c; if (S.page === 'controls' && !document.activeElement.closest('#page')) renderPage(true); else if (S.page === 'visitors') renderTbl(); }, e => console.error(e));
  S.B.watchAdmins(a => { S.admins = a.sort((x, y) => x.at - y.at); if (S.page === 'team' && !document.activeElement.closest('#page')) renderPage(true); }, e => console.error(e));
  await loadVisitors();
  clearInterval(liveTimer); clearInterval(visTimer);
  liveTimer = setInterval(() => { if (!document.hidden && LIVE_PAGES.includes(S.page)) renderPage(true); }, 20000);
  visTimer = setInterval(() => { if (!document.hidden) loadVisitors(); }, 120000);
}

/* ---------- شاشات الدخول ---------- */
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
