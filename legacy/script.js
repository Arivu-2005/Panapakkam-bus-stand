(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
function loadScript(src, timeout = 7000) {
  return new Promise(res => {
    const s = document.createElement('script'); s.src = src;
    s.onload = () => res(true); s.onerror = () => res(false);
    document.head.appendChild(s); setTimeout(() => res(false), timeout);
  });
}

/* ================= i18n ================= */
const I = {
  en: {
    skip: 'Skip to timetable', istLabel: 'Panapakkam time',
    heroHead: 'Every bus leaving Panapakkam, in one glance.',
    intro: 'Pick a route, see what leaves next, and pin the buses you take every day.',
    next: 'Find next bus', download: 'Download PKM data board (PDF)',
    stBuses: 'Buses today', stRoutes: 'Routes', stSpan: 'First to last',
    stageTag: '3D bus terminal', hint: 'Tap a bus to pick its route. Drag to turn.', load: 'Loading 3D bus terminal…',
    no3d: "3D view isn't available on this device. The timetable works normally.",
    boardTitle: 'Departing next', search: 'Search',
    fromLabel: 'From', toLabel: 'To', extraLabel: 'Bus name, number or time',
    upcoming: 'Upcoming only', pinnedOnly: 'Pinned only', h24: '24-hour time', reset: 'Reset filters',
    all: 'All day', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night',
    routeTabsTitle: 'Routes', allRoutes: 'All routes', bay: 'Bay',
    n_buses: '{n} buses', n_bus1: '1 bus',
    inMin: 'in {n} min', inHM: 'in {h} h {m} min', leaving: 'Leaving now', departed: 'Departed',
    noMore: 'No more buses today.', firstTomorrow: 'First bus tomorrow at {t}.',
    emptyTitle: 'No buses match', emptyBody: 'Every bus here departs from Panapakkam. Try a destination in “To”, or reset the filters.',
    noReturn: 'This timetable only lists buses departing from Panapakkam. Return-journey timings are not available.',
    doneTitle: 'No more buses today', doneBody: 'Switch off Upcoming only to see the full day.',
    showAll: 'Show all of today', jumpNext: 'Jump to next bus', nextTag: 'Next', chk: 'Check board',
    pin: 'Pin this bus', unpin: 'Unpin', pinned: 'Pinned', share: 'Share on WhatsApp', copyLink: 'Copy link',
    copied: 'Link copied', pinnedMsg: 'Pinned. Find it under Pinned only.', unpinnedMsg: 'Unpinned',
    cal: 'Add reminder', show3d: 'Show on 3D bus', otherDeps: 'Other departures of this bus today', routeLbl: 'Route',
    cmdPh: 'Search routes, destinations or buses', cmdRoute: 'Routes', cmdDest: 'Destinations', cmdBus: 'Buses', cmdNone: 'Nothing found',
    nextFound: 'Next bus: {bus} to {to} at {t}, {eta}.',
    sample: 'Showing sample data because data/timetable.js did not load. Check that the file exists next to index.html.',
    foot: 'Panapakkam bus stand timetable. Timings are subject to operational conditions; check the board before travel.',
    credit: 'Developed by', devEyebrow: 'Creator and developer',
    devText: 'Developer of Panapakkam Bus, built to put the local bus stand timetable on every phone.', close: 'Close',
    loadingMsg: 'Loading timetable'
  },
  ta: {
    skip: 'அட்டவணைக்குச் செல்', istLabel: 'பனப்பாக்கம் நேரம்',
    heroHead: 'பனப்பாக்கத்திலிருந்து புறப்படும் எல்லாப் பேருந்துகளும், ஒரே பார்வையில்.',
    intro: 'வழித்தடத்தைத் தேர்ந்தெடுங்கள், அடுத்த பேருந்தைப் பாருங்கள், தினமும் பயணிக்கும் பேருந்துகளைக் குறித்து வையுங்கள்.',
    next: 'அடுத்த பேருந்து', download: 'PKM தகவல் பலகை பதிவிறக்கம் (PDF)',
    stBuses: 'இன்றைய பேருந்துகள்', stRoutes: 'வழித்தடங்கள்', stSpan: 'முதல் – கடைசி',
    stageTag: '3D பேருந்து நிலையம்', hint: 'வழித்தடத்தைத் தேர்ந்தெடுக்க பேருந்தைத் தொடுங்கள். சுழற்ற இழுக்கவும்.', load: '3D பேருந்து நிலையம் தயாராகிறது…',
    no3d: 'இந்த சாதனத்தில் 3D காட்சி இல்லை. அட்டவணை வழக்கம்போல் செயல்படும்.',
    boardTitle: 'அடுத்த புறப்பாடுகள்', search: 'தேடு',
    fromLabel: 'புறப்படும் இடம்', toLabel: 'சேரும் இடம்', extraLabel: 'பேருந்து பெயர், எண் அல்லது நேரம்',
    upcoming: 'இனி வருபவை மட்டும்', pinnedOnly: 'குறித்தவை மட்டும்', h24: '24 மணி நேர வடிவம்', reset: 'வடிகட்டிகளை அழி',
    all: 'நாள் முழுவதும்', morning: 'காலை', afternoon: 'மதியம்', evening: 'மாலை', night: 'இரவு',
    routeTabsTitle: 'வழித்தடங்கள்', allRoutes: 'அனைத்தும்', bay: 'நடைமேடை',
    n_buses: '{n} பேருந்துகள்', n_bus1: '1 பேருந்து',
    inMin: '{n} நிமிடத்தில்', inHM: '{h} மணி {m} நிமிடத்தில்', leaving: 'இப்போது புறப்படுகிறது', departed: 'புறப்பட்டது',
    noMore: 'இன்று இனி பேருந்துகள் இல்லை.', firstTomorrow: 'நாளை முதல் பேருந்து {t} மணிக்கு.',
    emptyTitle: 'பொருந்தும் பேருந்து இல்லை', emptyBody: 'அனைத்தும் பனப்பாக்கத்திலிருந்து புறப்படுகின்றன. “சேரும் இடம்” பகுதியில் ஊரைத் தேடுங்கள் அல்லது வடிகட்டிகளை அழிக்கவும்.',
    noReturn: 'இந்த அட்டவணையில் பனப்பாக்கத்திலிருந்து புறப்படும் பேருந்துகள் மட்டுமே உள்ளன. திரும்பும் பயண நேரங்கள் இல்லை.',
    doneTitle: 'இன்று இனி பேருந்துகள் இல்லை', doneBody: 'முழு நாளையும் காண “இனி வருபவை மட்டும்” என்பதை அணைக்கவும்.',
    showAll: 'இன்றைய அனைத்தையும் காட்டு', jumpNext: 'அடுத்த பேருந்துக்குச் செல்', nextTag: 'அடுத்து', chk: 'பலகையைப் பார்க்கவும்',
    pin: 'இந்தப் பேருந்தைக் குறி', unpin: 'குறியை நீக்கு', pinned: 'குறிக்கப்பட்டது', share: 'WhatsApp-ல் பகிர்', copyLink: 'இணைப்பை நகலெடு',
    copied: 'இணைப்பு நகலெடுக்கப்பட்டது', pinnedMsg: 'குறிக்கப்பட்டது. “குறித்தவை மட்டும்” என்பதில் காணலாம்.', unpinnedMsg: 'குறி நீக்கப்பட்டது',
    cal: 'நினைவூட்டல் சேர்', show3d: '3D பேருந்தில் காட்டு', otherDeps: 'இந்தப் பேருந்தின் பிற புறப்பாடுகள்', routeLbl: 'வழித்தடம்',
    cmdPh: 'வழித்தடம், இடம் அல்லது பேருந்து தேடுங்கள்', cmdRoute: 'வழித்தடங்கள்', cmdDest: 'இடங்கள்', cmdBus: 'பேருந்துகள்', cmdNone: 'எதுவும் கிடைக்கவில்லை',
    nextFound: 'அடுத்த பேருந்து: {t}-க்கு {bus} ({to}), {eta}.',
    sample: 'data/timetable.js ஏற்றப்படாததால் மாதிரித் தரவு காட்டப்படுகிறது. கோப்பு index.html அருகில் உள்ளதா எனப் பார்க்கவும்.',
    foot: 'பனப்பாக்கம் பேருந்து நிலைய கால அட்டவணை. நேரங்கள் மாறலாம்; பயணத்திற்கு முன் பலகையைச் சரிபார்க்கவும்.',
    credit: 'உருவாக்கியவர்', devEyebrow: 'உருவாக்குநர்',
    devText: 'பனப்பாக்கம் பேருந்து நிலைய கால அட்டவணையை ஒவ்வொரு தொலைபேசியிலும் கொண்டு சேர்க்க உருவாக்கப்பட்ட Panapakkam Bus-இன் டெவலப்பர்.', close: 'மூடு',
    loadingMsg: 'அட்டவணை ஏற்றப்படுகிறது'
  }
};
/* English -> Tamil word list for bus names without "busTa" */
const TA_WORDS = [
  ['Bharathi Roadways', 'பாரதி ரோட்வேஸ்'], ['Bharathi Motors', 'பாரதி மோட்டார்ஸ்'], ['M.S. Roadways', 'M.S. ரோட்வேஸ்'], ['City bus', 'சிட்டி பஸ்'], ['Small bus', 'சிற்றுந்து'],
  ['Vijayalakshmi', 'விஜயலட்சுமி'], ['Kalaimagal', 'கலைமகள்'], ['Dhanapathi', 'தனபதி'], ['Balaji', 'பாலாஜி'], ['Thulasi', 'துளசி'], ['(Super)', '(சூப்பர்)'],
  ['Thirumalpur', 'திருமால்பூர்'], ['Thakkolam', 'தக்கோலம்'], ['Koor', 'கூர்'], ['Jagirthandalam', 'ஜாகீர்தண்டலம்'], ['Kaveripakkam', 'காவேரிப்பாக்கம்'],
  ['Guruvarajapettai', 'குருவராஜபேட்டை'], ['Arakkonam', 'அரக்கோணம்'], ['Thiruthani', 'திருத்தணி'], ['Kanchipuram', 'காஞ்சிபுரம்'], ['Chengalpattu', 'செங்கல்பட்டு'],
  ['Tambaram', 'தாம்பரம்'], ['Sholinghur', 'சோளிங்கர்'], ['Kalathur', 'களத்தூர்'], ['Chennai', 'சென்னை'], ['Panapakkam', 'பனப்பாக்கம்'], ['Vellore', 'வேலூர்'], ['Arcot', 'ஆற்காடு']
];
const PERIODS = ['all', 'morning', 'afternoon', 'evening', 'night'];
const S = {
  rows: [], routes: [], sample: false, has3d: false, selId: null,
  lang: store.get('pkm-lang', (navigator.language || '').toLowerCase().startsWith('ta') ? 'ta' : 'en'),
  h12: store.get('pkm-h12', true),
  pins: new Set(store.get('pkm-pins', [])),
  f: { from: '', to: '', q: '', route: '', up: true, period: 'all', pinned: false }
};
const t = (k, v) => {
  let s = I[S.lang][k] ?? I.en[k] ?? k;
  if (v) for (const x in v) s = s.replace('{' + x + '}', v[x]);
  return s;
};
function T(text) {
  if (S.lang !== 'ta') return text;
  let out = String(text).replace(/via ([A-Za-z]+)/g, '$1 வழி');
  TA_WORDS.forEach(w => { out = out.split(w[0]).join(w[1]); });
  return out;
}

/* ================= Time (Panapakkam / IST) ================= */
const ISTF = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function nowIST() {
  const p = {};
  for (const x of ISTF.formatToParts(new Date())) p[x.type] = x.value;
  const h = +p.hour % 24, mi = +p.minute;
  return { y: +p.year, mo: +p.month, d: +p.day, h, mi, s: +p.second, min: h * 60 + mi };
}
function fmt(min) {
  const h = Math.floor(min / 60) % 24, m = min % 60;
  if (!S.h12) return { main: `${pad(h)}:${pad(m)}`, ap: '' };
  return { main: `${h % 12 || 12}:${pad(m)}`, ap: h >= 12 ? 'PM' : 'AM' };
}
const fmtStr = min => { const f = fmt(min); return f.ap ? `${f.main} ${f.ap}` : f.main; };
const periodOf = min => min >= 240 && min < 720 ? 'morning' : min >= 720 && min < 1020 ? 'afternoon' : min >= 1020 && min < 1260 ? 'evening' : 'night';
function etaText(min, now) {
  const sec = min * 60 - (now.min * 60 + now.s);
  if (sec < -60) return { txt: t('departed'), soon: false, past: true };
  const m = Math.max(0, Math.ceil(sec / 60));
  if (m <= 0) return { txt: t('leaving'), soon: true, past: false };
  if (m < 60) return { txt: t('inMin', { n: m }), soon: m <= 10, past: false };
  return { txt: t('inHM', { h: Math.floor(m / 60), m: m % 60 }), soon: false, past: false };
}
const toMin = s => {
  const m = /(\d+):(\d+)\s*(AM|PM)?/i.exec(String(s));
  if (!m) return null;
  let h = parseInt(m[1], 10); const mi = parseInt(m[2], 10);
  if (m[3]) h = (h % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return (h % 24) * 60 + mi;
};

/* ================= Data (window.TIMETABLE from data/timetable.js) ================= */
const splitArrow = s => { const p = String(s || '').split('→').map(x => x.trim()); return p.length > 1 ? [p[0], p.slice(1).join(' → ')] : ['', p[0] || '']; };
function buildRows(DATA) {
  const rows = [];
  S.routes = DATA.routes.map(r => ({ id: r.id, name: r.name || r.id, tamil: r.tamil || '', color: r.color || '', bay: r.bay || '' }));
  DATA.routes.forEach(r => (r.entries || []).forEach(e => {
    const min = toMin(e.time); if (min == null) return;
    const [f, to] = splitArrow(e.dest), [fTa, toTa] = splitArrow(e.destTa);
    rows.push({
      id: 0, routeKey: r.id, route: S.routes.find(x => x.id === r.id), time: e.time, min,
      bus: e.bus || '', busTa: e.busTa || '', dest: e.dest || '', destTa: e.destTa || e.dest || '',
      from: f || 'Panapakkam', fromTa: fTa || 'பனப்பாக்கம்', to, toTa: toTa || to,
      verify: !!e.verify, key: `${e.bus}|${to}`
    });
  }));
  rows.sort((a, b) => a.min - b.min);
  rows.forEach((r, i) => { r.id = i; });
  return rows;
}
function demoData() {
  const R = [['vellore', 'Vellore', 'வேலூர்', 1, '#38BDF8', 'Bharathi Roadways via Arcot', 290, 1300, 30], ['chennai', 'Chennai', 'சென்னை', 2, '#FF7A66', 'M.S. Roadways (Super) via Kanchipuram', 315, 1305, 40],
    ['arakkonam', 'Arakkonam', 'அரக்கோணம்', 3, '#46E0A0', 'Balaji via Kaveripakkam', 330, 1290, 35], ['kanchipuram', 'Kanchipuram', 'காஞ்சிபுரம்', 4, '#FFB224', 'City bus', 345, 1260, 45]];
  const f = m => { const h = Math.floor(m / 60) % 24; return `${pad(h % 12 || 12)}:${pad(m % 60)} ${h >= 12 ? 'PM' : 'AM'}`; };
  return { routes: R.map(([id, name, tamil, bay, color, bus, s, e, step]) => {
    const entries = []; for (let m = s, j = 0; m <= e; m += step, j++) entries.push({ time: f(m + (j * 7 % 5)), bus, dest: `Panapakkam → ${name}`, destTa: `பனப்பாக்கம் → ${tamil}`, ...(j === 3 ? { verify: true } : {}) });
    return { id, name, tamil, bay, color, entries };
  }) };
}
let DATA = null;

/* ================= Naming helpers ================= */
const BUS = r => S.lang === 'ta' ? (r.busTa || T(r.bus)) : r.bus;
const DEST = r => S.lang === 'ta' ? r.destTa : r.dest;
const ORIGIN = r => S.lang === 'ta' ? r.fromTa : r.from;
const TO = r => S.lang === 'ta' ? r.toTa : r.to;
const routeName = rt => (S.lang === 'ta' && rt.tamil) ? rt.tamil : rt.name;
const dispTo = r => (S.lang === 'ta' && r.toTa) ? { a: r.toTa, b: r.to } : { a: r.to, b: r.toTa && r.toTa !== r.to ? r.toTa : '' };
const tagOf = r => {
  const m = String(r.bus).match(/(?:^|\s)([A-Za-z]{0,3}\d{1,3}[A-Za-z]?)(?=\s|$)/);
  if (m) return m[1];
  return r.route?.bay ? `${t('bay')} ${r.route.bay}` : '';
};
const byId = id => S.rows.find(r => r.id === +id);
const hay = (...a) => a.filter(Boolean).join(' ').toLowerCase();
const rowHay = r => r._h || (r._h = hay(r.time, r.bus, r.busTa, r.dest, r.destTa, r.route?.name, r.route?.tamil));

function match(r, now) {
  const f = S.f, L = s => s.toLowerCase().trim();
  if (f.up && r.min < now.min) return false;
  if (f.route && r.routeKey !== f.route) return false;
  if (f.period !== 'all' && periodOf(r.min) !== f.period) return false;
  if (f.pinned && !S.pins.has(r.key)) return false;
  if (f.from && !hay(r.from, r.fromTa).includes(L(f.from))) return false;
  if (f.to && !hay(r.to, r.toTa).includes(L(f.to))) return false;
  if (f.q && !rowHay(r).includes(L(f.q))) return false;
  return true;
}
const ICON = {
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.86L2.05 22l5.25-1.38A9.9 9.9 0 1 0 12.04 2m0 1.67a8.24 8.24 0 1 1-4.2 15.3l-.3-.18-3.12.82.83-3.04-.2-.32A8.24 8.24 0 0 1 12.04 3.67m4.52 11.66c-.19-.09-1.12-.55-1.3-.61-.17-.06-.3-.09-.43.09-.13.19-.49.61-.6.74-.11.13-.23.15-.42.06-.19-.09-.81-.3-1.55-.95-.57-.51-.96-1.14-1.07-1.33-.11-.19-.01-.3.08-.39.09-.08.19-.23.29-.34.1-.11.13-.19.19-.32.06-.13.03-.25-.01-.34-.05-.09-.43-1.04-.59-1.42-.16-.38-.32-.33-.43-.33h-.37c-.13 0-.34.05-.51.23s-.68.66-.68 1.61.69 1.87.79 2c.1.13 1.36 2.08 3.3 2.91.46.2.82.32 1.1.41.46.15.89.13 1.22.08.37-.06 1.12-.46 1.28-.9.16-.45.16-.83.11-.91-.04-.09-.17-.15-.36-.25"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  cube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5"/></svg>'
};

/* ================= Render ================= */
function renderBoard(flip = true) {
  const now = nowIST();
  const up = S.rows.filter(r => r.min >= now.min).slice(0, 5);
  const host = $('#board-rows');
  const prev = host.dataset.prev ? JSON.parse(host.dataset.prev) : [];
  if (!up.length) {
    const first = S.rows[0];
    host.innerHTML = `<div class="board-empty"><strong>${t('noMore')}</strong>${first ? `<div>${t('firstTomorrow', { t: fmtStr(first.min) })}</div>` : ''}</div>`;
    host.dataset.prev = '[]'; return;
  }
  host.innerHTML = up.map((r, i) => {
    const f = fmt(r.min), e = etaText(r.min, now), d = dispTo(r), tag = tagOf(r);
    const changed = flip && prev[i] !== r.id;
    return `<button type="button" class="b-row${changed ? ' flip' : ''}" data-open="${r.id}">
      <span class="b-time">${f.main}${f.ap ? `<small>${f.ap}</small>` : ''}</span>
      <span class="b-dest"><span class="d1">${esc(d.a)}</span><span class="d2">${esc(BUS(r))}</span></span>
      ${tag ? `<span class="b-bus">${esc(tag)}</span>` : '<span></span>'}
      <span class="b-eta${e.soon ? ' soon' : ''}">${esc(e.txt)}</span></button>`;
  }).join('');
  host.dataset.prev = JSON.stringify(up.map(r => r.id));
}
function renderTabs() {
  const cur = S.f.route, counts = {};
  S.rows.forEach(r => { counts[r.routeKey] = (counts[r.routeKey] || 0) + 1; });
  $('#tabs').innerHTML = `<button type="button" class="tab" data-route="" aria-pressed="${!cur}">${t('allRoutes')}<em>${S.rows.length}</em></button>` +
    S.routes.map(r => `<button type="button" class="tab" data-route="${esc(r.id)}" aria-pressed="${cur === r.id}"><i class="rdot" style="background:${esc(r.color || 'var(--accent)')}"></i>${esc(routeName(r))}<em>${counts[r.id] || 0}</em></button>`).join('');
}
function renderStats() {
  $('#st-n').textContent = S.rows.length;
  $('#st-r').textContent = S.routes.length;
  const a = S.rows[0], b = S.rows[S.rows.length - 1];
  $('#st-t').textContent = a ? `${fmtStr(a.min)} – ${fmtStr(b.min)}`.replace(/ (AM|PM)/g, '$1') : '–';
}
function renderLists() {
  $('#from-list').innerHTML = ['Panapakkam', 'பனப்பாக்கம்'].map(x => `<option value="${x}">`).join('');
  const tos = [...new Set(S.rows.flatMap(r => [r.to, r.toTa]))].filter(Boolean);
  $('#to-list').innerHTML = tos.map(x => `<option value="${esc(x)}">`).join('');
}
function renderPeriods() {
  $('#period').innerHTML = PERIODS.map(p => `<button type="button" role="radio" aria-checked="${S.f.period === p}" data-p="${p}">${t(p)}</button>`).join('');
}
function tripHTML(r, now, isNext) {
  const f = fmt(r.min), e = etaText(r.min, now), pinned = S.pins.has(r.key), tag = tagOf(r), d = dispTo(r);
  return `<li class="trip${e.past ? ' past' : ''}${isNext ? ' next' : ''}" data-id="${r.id}" style="--rc:${esc(r.route?.color || 'transparent')}">
    <button type="button" class="t-open" data-open="${r.id}">
      <span class="t-time">${f.main}${f.ap ? `<small>${f.ap}</small>` : ''}</span>
      <span class="t-main"><span class="t-dest">${esc(d.a)}${d.b ? `<span class="alt">${esc(d.b)}</span>` : ''}${isNext ? `<span class="next-tag">${t('nextTag')}</span>` : ''}</span>
        <span class="t-sub">${esc(BUS(r))}${r.verify ? `<small class="chk">⚠ ${t('chk')}</small>` : ''}</span></span>
      ${tag ? `<span class="busno">${esc(tag)}</span>` : '<span></span>'}
      <span class="t-eta${e.soon ? ' soon' : ''}">${e.past ? '' : esc(e.txt)}</span>
    </button>
    <div class="t-actions">
      <button type="button" class="icon-btn${pinned ? ' on' : ''}" data-pin="${r.id}" aria-pressed="${pinned}" aria-label="${pinned ? t('unpin') : t('pin')}">${ICON.star}</button>
      <button type="button" class="icon-btn wa" data-share="${r.id}" aria-label="${t('share')}: ${esc(r.time)}, ${esc(BUS(r))}, ${esc(TO(r))}">${ICON.wa}</button>
    </div></li>`;
}
function renderTable() {
  const now = nowIST();
  const list = S.rows.filter(r => match(r, now));
  const activeId = document.activeElement?.closest?.('.trip')?.dataset.id;
  $('#count').textContent = list.length === 1 ? t('n_bus1') : t('n_buses', { n: list.length });
  const host = $('#rows');
  if (!list.length) {
    const qF = S.f.from.trim().toLowerCase();
    const fromOther = qF && !'panapakkam'.includes(qF) && !'பனப்பாக்கம்'.includes(qF);
    const anyLater = S.f.up && S.rows.some(r => r.min < now.min);
    const noneLeft = S.f.up && !S.rows.some(r => r.min >= now.min) && !fromOther;
    host.innerHTML = `<div class="empty"><h3>${noneLeft ? t('doneTitle') : t('emptyTitle')}</h3><p>${fromOther ? t('noReturn') : noneLeft ? t('doneBody') : t('emptyBody')}</p>
      <div class="cta">${anyLater && !fromOther ? `<button type="button" class="primary" id="show-all">${t('showAll')}</button>` : ''}<button type="button" class="secondary" id="empty-reset">${t('reset')}</button></div></div>`;
    $('#jump').classList.remove('show'); return;
  }
  const firstUp = list.find(r => r.min >= now.min);
  let html = '', curH = -1, open = false, nowDone = S.f.up || !list.some(r => r.min < now.min) || !firstUp;
  for (const r of list) {
    const h = Math.floor(r.min / 60);
    if (!nowDone && r === firstUp) { if (open) { html += '</ul></div>'; open = false; curH = -1; } html += `<div class="now-line">${fmtStr(now.min)}</div>`; nowDone = true; }
    if (h !== curH) {
      if (open) html += '</ul></div>';
      const hf = fmt(h * 60);
      html += `<div class="hour"><h3>${S.h12 ? `${hf.main.split(':')[0]} ${hf.ap}` : `${pad(h)}:00`}</h3><ul>`;
      curH = h; open = true;
    }
    html += tripHTML(r, now, r === firstUp);
  }
  if (open) html += '</ul></div>';
  host.innerHTML = html;
  if (activeId) host.querySelector(`.trip[data-id="${activeId}"] .t-open`)?.focus({ preventScroll: true });
  updateJump();
}
function syncInputs() {
  $('#from-search').value = S.f.from; $('#to-search').value = S.f.to; $('#search').value = S.f.q;
  $('#upcoming-toggle').checked = S.f.up; $('#pinned-toggle').checked = S.f.pinned; $('#h24-toggle').checked = !S.h12;
  $('#clear-from-btn').classList.toggle('on', !!S.f.from);
  $('#clear-to-btn').classList.toggle('on', !!S.f.to);
  $('#clear-q-btn').classList.toggle('on', !!S.f.q);
}
function writeHash() {
  const p = new URLSearchParams(), f = S.f;
  if (f.route) p.set('r', f.route); if (f.from) p.set('from', f.from); if (f.to) p.set('to', f.to); if (f.q) p.set('q', f.q);
  if (f.period !== 'all') p.set('p', f.period); if (!f.up) p.set('up', '0'); if (f.pinned) p.set('pin', '1');
  const h = p.toString();
  try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch {}
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.has('r')) S.f.route = p.get('r'); if (p.has('from')) S.f.from = p.get('from'); if (p.has('to')) S.f.to = p.get('to'); if (p.has('q')) S.f.q = p.get('q');
  if (PERIODS.includes(p.get('p'))) S.f.period = p.get('p');
  if (p.get('up') === '0') S.f.up = false; if (p.get('pin') === '1') S.f.pinned = true;
}
function applyFilters() { syncInputs(); renderPeriods(); renderTabs(); renderTable(); writeHash(); }
function refreshAll() {
  renderStats(); renderLists(); renderBoard(false); applyFilters(); applyI18n();
  $('#banner').innerHTML = S.sample ? `<div class="banner">${esc(t('sample'))}</div>` : '';
  drawAll3D();
}

/* ================= i18n DOM ================= */
function applyI18n() {
  document.documentElement.lang = S.lang;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $('#lang-label').textContent = S.lang === 'ta' ? 'English' : 'தமிழ்';
  $('#lang-btn').setAttribute('aria-label', S.lang === 'ta' ? 'Switch to English' : 'Switch to Tamil');
  const l = $('#stage .stage-loading'); if (l && $('#stage').dataset.no3d) l.textContent = t('no3d');
  setThemeIcon();
}

/* ================= Theme ================= */
function setThemeIcon() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#theme-icon').innerHTML = dark
    ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
    : '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  $('#theme-btn').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#082026' : '#EAF1EE';
}
function toggleTheme() {
  const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = n; store.set('pkm-theme', n); setThemeIcon();
}

/* ================= Toast ================= */
let toastT;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2400); }

/* ================= 3D terminal (bus3d.js) ================= */
function sign3D(r) { if (S.has3d && r) window.Bus3D.setSign(r.routeKey, DEST(r), BUS(r), r.time); }
function drawAll3D() {
  if (!S.has3d) return;
  const now = nowIST();
  S.routes.forEach(rt => {
    const r = S.rows.find(x => x.routeKey === rt.id && x.min >= now.min) || S.rows.find(x => x.routeKey === rt.id);
    sign3D(r);
  });
  const cur = byId(S.selId); if (cur) sign3D(cur);
}
function setActive(r) {
  S.selId = r.id;
  if (S.has3d) { sign3D(r); window.Bus3D.focus(r.routeKey); }
}
function pick3D(routeId) {
  S.f.route = routeId; applyFilters();
  const now = nowIST();
  const r = S.rows.find(x => x.routeKey === routeId && x.min >= now.min) || S.rows.find(x => x.routeKey === routeId);
  if (r) setActive(r);
  const rt = S.routes.find(x => x.id === routeId); if (rt) toast(routeName(rt));
}
function init3D(ok) {
  const stage = $('#stage');
  const fail = () => { stage.dataset.no3d = '1'; const l = $('.stage-loading', stage); if (l) l.textContent = t('no3d'); $$('.stage-ctrl,.stage-hint').forEach(e => e.style.display = 'none'); };
  if (!ok || !window.Bus3D || !window.THREE) return fail();
  try { S.has3d = !!window.Bus3D.init(stage, DATA.routes, pick3D); } catch (e) { console.warn('3D failed', e); S.has3d = false; }
  if (!S.has3d) return fail();
  drawAll3D();
  const now = nowIST(), nx = S.rows.find(r => r.min >= now.min) || S.rows[0];
  if (nx) setActive(nx);
}

/* ================= Sheet / actions ================= */
function shareURL(r) { try { return `${location.origin}${location.pathname}#r=${encodeURIComponent(r.routeKey)}&q=${encodeURIComponent(r.time)}`; } catch { return location.href; } }
function shareWA(r) {
  const text = `🚌 *Panapakkam Bus Timings*\n📍 *Route:* ${ORIGIN(r)} ➔ ${TO(r)}\n🕒 *Time:* ${r.time}\n🚍 *Bus:* ${BUS(r)}\n\nCheck the board before travel.`;
  window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank', 'noopener');
}
async function copyLink(r) { const u = shareURL(r); try { await navigator.clipboard.writeText(u); toast(t('copied')); } catch { toast(u); } }
function togglePin(r) {
  const was = S.pins.has(r.key);
  was ? S.pins.delete(r.key) : S.pins.add(r.key);
  store.set('pkm-pins', [...S.pins]);
  toast(was ? t('unpinnedMsg') : t('pinnedMsg'));
  renderTable();
  if ($('#sheet').open) openSheet(r.id, true);
}
function ics(r) {
  const n = nowIST();
  const utc = new Date(Date.UTC(n.y, n.mo - 1, n.d, 0, 0) + (r.min - 330) * 60000);
  const z = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Panapakkam Bus//EN', 'BEGIN:VEVENT', `UID:${r.id}-${n.y}${n.mo}${n.d}@panapakkam-bus`, `DTSTAMP:${z(new Date())}`,
    `DTSTART:${z(utc)}`, `DTEND:${z(new Date(utc.getTime() + 30 * 60000))}`, `SUMMARY:${(r.bus + ' to ' + r.to).replace(/[,;\n]/g, ' ')}`, 'LOCATION:Panapakkam bus stand',
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Bus leaves soon', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); a.download = 'panapakkam-bus.ics';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function openSheet(id, keep = false) {
  const r = byId(id); if (!r) return;
  const now = nowIST(), f = fmt(r.min), e = etaText(r.min, now), pinned = S.pins.has(r.key);
  const same = S.rows.filter(x => x.key === r.key), tag = tagOf(r), to = dispTo(r);
  const fr = (S.lang === 'ta' && r.fromTa) ? { a: r.fromTa, b: r.from } : { a: r.from, b: r.fromTa };
  const sh = $('#sheet');
  sh.innerHTML = `<div class="sheet-body">
    <div class="sheet-top"><span class="busno">${esc(tag || r.route?.name || '')}</span><button type="button" class="icon-btn" data-close aria-label="${t('close')}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="sheet-time">${f.main}${f.ap ? `<small>${f.ap}</small>` : ''}</div>
    <p class="sheet-eta${e.soon ? ' soon' : ''}">${esc(e.txt)}</p>
    <p class="sheet-bus">${esc(BUS(r))}${r.verify ? `<small class="chk">⚠ ${t('chk')}</small>` : ''}</p>
    <div class="route"><div class="stop">${esc(fr.a)}${fr.b && fr.b !== fr.a ? `<small>${esc(fr.b)}</small>` : ''}</div><div class="line">${r.route ? `<span>${t('routeLbl')}: ${esc(routeName(r.route))}${r.route.bay ? ` · ${t('bay')} ${esc(r.route.bay)}` : ''}</span>` : ''}</div><div class="stop">${esc(to.a)}${to.b && to.b !== to.a ? `<small>${esc(to.b)}</small>` : ''}</div></div>
    <div class="sheet"><h4>${t('otherDeps')}</h4><div class="deps">${same.map(x => `<span class="dep${x.min < now.min ? ' past' : ''}${x.id === r.id ? ' cur' : ''}">${fmtStr(x.min)}</span>`).join('')}</div></div>
    <div class="sheet-actions">
      <button type="button" data-sheet-pin="${r.id}" class="${pinned ? 'on' : ''}">${ICON.star}${pinned ? t('pinned') : t('pin')}</button>
      <button type="button" data-sheet-wa="${r.id}" class="wa">${ICON.wa}${t('share')}</button>
      <button type="button" data-sheet-link="${r.id}">${ICON.link}${t('copyLink')}</button>
      <button type="button" data-sheet-ics="${r.id}">${ICON.cal}${t('cal')}</button>
      ${S.has3d ? `<button type="button" data-sheet-3d="${r.id}">${ICON.cube}${t('show3d')}</button>` : ''}
    </div></div>`;
  setActive(r);
  if (!keep && !sh.open) sh.showModal();
}

/* ================= Command palette ================= */
let cmdItems = [], cmdIdx = 0;
function openCmd() { const d = $('#cmd'); if (d.open) return; $('#cmd-input').value = ''; renderCmd(''); d.showModal(); setTimeout(() => $('#cmd-input').focus(), 30); }
function renderCmd(q) {
  q = q.toLowerCase().trim();
  const dests = new Map(), buses = new Map();
  S.rows.forEach(r => {
    const d = dests.get(r.to) || { n: 0, r }; d.n++; dests.set(r.to, d);
    const b = buses.get(r.bus) || { n: 0, r }; b.n++; buses.set(r.bus, b);
  });
  const rl = S.routes.filter(r => !q || hay(r.name, r.tamil).includes(q)).slice(0, 6);
  const dl = [...dests.entries()].filter(([k, v]) => k && (!q || hay(k, v.r.toTa).includes(q))).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  const bl = [...buses.entries()].filter(([k, v]) => k && (!q || hay(k, v.r.busTa).includes(q))).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  cmdItems = [
    ...rl.map(r => ({ type: 'route', val: r.id, label: routeName(r), sub: t('n_buses', { n: S.rows.filter(x => x.routeKey === r.id).length }) })),
    ...dl.map(([k, v]) => ({ type: 'to', val: k, label: dispTo(v.r).a, sub: t('n_buses', { n: v.n }) })),
    ...bl.map(([k, v]) => ({ type: 'bus', val: k, label: BUS(v.r), sub: dispTo(v.r).a }))
  ];
  cmdIdx = 0;
  let html = '', i = 0;
  const sec = (title, type) => {
    const items = cmdItems.filter(x => x.type === type); if (!items.length) return;
    html += `<h5>${title}</h5>` + items.map(x => `<button type="button" role="option" class="cmd-item" data-cmd="${i++}"><span>${esc(x.label)}</span><small>${esc(x.sub)}</small></button>`).join('');
  };
  sec(t('cmdRoute'), 'route'); sec(t('cmdDest'), 'to'); sec(t('cmdBus'), 'bus');
  $('#cmd-list').innerHTML = html || `<div class="cmd-empty">${t('cmdNone')}</div>`;
  markCmd();
}
function markCmd() { $$('.cmd-item').forEach((el, i) => { el.classList.toggle('active', i === cmdIdx); el.setAttribute('aria-selected', i === cmdIdx); if (i === cmdIdx) el.scrollIntoView({ block: 'nearest' }); }); }
function pickCmd(i) {
  const it = cmdItems[i]; if (!it) return;
  S.f.route = ''; S.f.to = ''; S.f.q = '';
  if (it.type === 'route') S.f.route = it.val; else if (it.type === 'to') S.f.to = it.val; else S.f.q = it.val;
  $('#cmd').close(); applyFilters(); $('#timetable').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}

/* ================= Jump button ================= */
function updateJump() {
  const el = $('.trip.next'), j = $('#jump');
  if (!el) { j.classList.remove('show'); return; }
  const r = el.getBoundingClientRect(), tt = $('#timetable').getBoundingClientRect();
  j.classList.toggle('show', tt.top < innerHeight * .4 && (r.bottom < 70 || r.top > innerHeight));
}

/* ================= Loader (LED destination board) ================= */
function Matrix(cv, cols, rows, family, weight) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.getBoundingClientRect().width || 560, pitch = w / cols;
  cv.width = Math.round(w * dpr); cv.height = Math.round(pitch * rows * dpr); cv.style.aspectRatio = `${cols}/${rows}`;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const off = document.createElement('canvas'); off.width = cols; off.height = rows; const o = off.getContext('2d', { willReadFrequently: true });
  let tgt = new Uint8Array(cols * rows), prev = new Uint8Array(cols * rows), reveal = cols;
  const tamil = family.includes('Tamil');
  function sample(text) {
    o.clearRect(0, 0, cols, rows); o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'alphabetic';
    let size = rows * (tamil ? .74 : .82);
    do { o.font = `${weight} ${size}px ${family}`; size -= .5; } while (o.measureText(text).width > cols - 8 && size > 4);
    o.fillText(text, cols / 2, rows * (tamil ? .74 : .86));
    const d = o.getImageData(0, 0, cols, rows).data, out = new Uint8Array(cols * rows);
    for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    return out;
  }
  return {
    set(text, instant) { prev = instant ? sample(text) : tgt; tgt = sample(text); reveal = instant ? cols : 0; },
    draw(speed) {
      reveal = Math.min(cols + 3, reveal + speed);
      g.clearRect(0, 0, cv.width, cv.height);
      const r = pitch * .36, offP = new Path2D(), onP = new Path2D(), haloP = new Path2D();
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const cx = x * pitch + pitch / 2, cy = y * pitch + pitch / 2;
        const scan = Math.abs(x - reveal) < 1.2;
        const lit = scan ? 1 : (x < reveal ? tgt : prev)[y * cols + x];
        if (lit) { onP.moveTo(cx + r, cy); onP.arc(cx, cy, r, 0, 6.2832); haloP.moveTo(cx + r * 1.9, cy); haloP.arc(cx, cy, r * 1.9, 0, 6.2832); }
        else { offP.moveTo(cx + r, cy); offP.arc(cx, cy, r, 0, 6.2832); }
      }
      g.fillStyle = 'rgba(255,178,36,.09)'; g.fill(offP);
      g.fillStyle = 'rgba(255,178,36,.16)'; g.fill(haloP);
      g.fillStyle = '#FFB224'; g.fill(onP);
    }
  };
}
async function runBoot(tasks) {
  const boot = $('#boot'), seen = (() => { try { return sessionStorage.getItem('pkm-seen'); } catch { return null; } })();
  $('#boot-msg').textContent = `${I.en.loadingMsg} · ${I.ta.loadingMsg}`;
  try { await Promise.race([document.fonts.load('700 16px "Noto Sans Tamil"', 'பனப்பாக்கம்'), sleep(1500)]); await Promise.race([document.fonts.load('700 16px "Public Sans"', 'A'), sleep(600)]); } catch {}
  const mta = Matrix($('#mx-ta'), 96, 18, '"Noto Sans Tamil", sans-serif', 700);
  const men = Matrix($('#mx-en'), 96, 9, '"Public Sans", Arial, sans-serif', 700);
  const seq = seen || reduce
    ? [['வணக்கம்', 'WELCOME']]
    : [['பனப்பாக்கம்', 'PANAPAKKAM'], ['வேலூர்', 'VELLORE'], ['சென்னை', 'CHENNAI'], ['வணக்கம்', 'WELCOME']];
  let si = 0, last = performance.now(), done = 0, prog = 0, finished = false;
  const minMs = seen || reduce ? 700 : 3000, total = tasks.length + 1;
  mta.set(seq[0][0], true); men.set(seq[0][1], true);
  tasks.forEach(p => p.then(() => done++, () => done++));
  sleep(minMs).then(() => done++);
  const fill = $('#boot-fill'), busEl = $('#boot-bus'), pct = $('#boot-pct'), t0 = performance.now();
  await new Promise(resolve => {
    function frame(now) {
      if (now - last > 800 && si < seq.length - 1) { si++; mta.set(seq[si][0]); men.set(seq[si][1]); last = now; }
      mta.draw(3.4); men.draw(3.4);
      const target = Math.min(done / total, 1);
      prog += (target - prog) * .09;
      const shown = target >= 1 && prog > .985 ? 1 : prog;
      fill.style.width = (shown * 100) + '%'; busEl.style.left = Math.max(44, shown * fill.parentElement.clientWidth) + 'px';
      pct.textContent = Math.round(shown * 100) + '%';
      if ((shown >= 1 && si === seq.length - 1) || now - t0 > 9000) { if (!finished) { finished = true; setTimeout(resolve, 450); } }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  try { sessionStorage.setItem('pkm-seen', '1'); } catch {}
  boot.classList.add('leaving');
  await sleep(reduce ? 50 : 1250);
}

/* ================= Events ================= */
function bind() {
  $('#lang-btn').onclick = () => { S.lang = S.lang === 'ta' ? 'en' : 'ta'; store.set('pkm-lang', S.lang); refreshAll(); };
  $('#h24-toggle').onchange = e => { S.h12 = !e.target.checked; store.set('pkm-h12', S.h12); refreshAll(); };
  $('#theme-btn').onclick = toggleTheme;
  $('#open-cmd').onclick = openCmd;
  const dev = $('#dev-modal');
  $('#open-dev-modal').onclick = () => dev.showModal();
  $('#credit-btn').onclick = () => dev.showModal();
  $('#close-dev-modal').onclick = () => dev.close();
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  $('#from-search').addEventListener('input', e => { S.f.from = e.target.value; applyFilters(); });
  $('#to-search').addEventListener('input', e => { S.f.to = e.target.value; applyFilters(); });
  $('#search').addEventListener('input', e => { S.f.q = e.target.value; applyFilters(); });
  $('#clear-from-btn').onclick = () => { S.f.from = ''; applyFilters(); $('#from-search').focus(); };
  $('#clear-to-btn').onclick = () => { S.f.to = ''; applyFilters(); $('#to-search').focus(); };
  $('#clear-q-btn').onclick = () => { S.f.q = ''; applyFilters(); $('#search').focus(); };
  $('#swap-btn').onclick = e => { [S.f.from, S.f.to] = [S.f.to, S.f.from]; e.currentTarget.classList.toggle('spin'); applyFilters(); };
  $('#upcoming-toggle').onchange = e => { S.f.up = e.target.checked; applyFilters(); };
  $('#pinned-toggle').onchange = e => { S.f.pinned = e.target.checked; applyFilters(); };
  const reset = () => { S.f = { from: '', to: '', q: '', route: '', up: true, period: 'all', pinned: false }; applyFilters(); };
  $('#clear-all-filters').onclick = reset;
  $('#period').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { S.f.period = b.dataset.p; applyFilters(); } });
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-route]'); if (!b) return;
    S.f.route = b.dataset.route; applyFilters();
    const now = nowIST(), r = S.f.route && (S.rows.find(x => x.routeKey === S.f.route && x.min >= now.min) || S.rows.find(x => x.routeKey === S.f.route));
    if (r) setActive(r);
  });

  document.addEventListener('click', e => {
    const o = e.target.closest('[data-open]'); if (o) return openSheet(o.dataset.open);
    const p = e.target.closest('[data-pin]'); if (p) return togglePin(byId(p.dataset.pin));
    const s = e.target.closest('[data-share]'); if (s) return shareWA(byId(s.dataset.share));
    if (e.target.closest('[data-close]')) return $('#sheet').close();
    const sp = e.target.closest('[data-sheet-pin]'); if (sp) return togglePin(byId(sp.dataset.sheetPin));
    const sw = e.target.closest('[data-sheet-wa]'); if (sw) return shareWA(byId(sw.dataset.sheetWa));
    const sl = e.target.closest('[data-sheet-link]'); if (sl) return copyLink(byId(sl.dataset.sheetLink));
    const si = e.target.closest('[data-sheet-ics]'); if (si) return ics(byId(si.dataset.sheetIcs));
    const s3 = e.target.closest('[data-sheet-3d]'); if (s3) { $('#sheet').close(); setActive(byId(s3.dataset.sheet3d)); $('.stage-card').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); return; }
    if (e.target.closest('#show-all')) { S.f.up = false; return applyFilters(); }
    if (e.target.closest('#empty-reset')) return reset();
    const c = e.target.closest('[data-cmd]'); if (c) pickCmd(+c.dataset.cmd);
  });
  $('#next-btn').onclick = () => {
    const now = nowIST(), r = S.rows.find(x => x.min >= now.min), msg = $('#next-msg');
    if (!r) { msg.textContent = `${t('noMore')} ${S.rows[0] ? t('firstTomorrow', { t: fmtStr(S.rows[0].min) }) : ''}`; return; }
    msg.textContent = t('nextFound', { bus: BUS(r), to: TO(r), t: fmtStr(r.min), eta: etaText(r.min, now).txt });
    openSheet(r.id);
  };
  $('#jump').onclick = () => $('.trip.next')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  addEventListener('scroll', updateJump, { passive: true });
  const stage = $('#stage');
  $('#z-in').onclick = () => stage.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true, cancelable: true }));
  $('#z-out').onclick = () => stage.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true, cancelable: true }));
  $('#z-reset').onclick = () => stage.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

  const ci = $('#cmd-input');
  ci.addEventListener('input', () => renderCmd(ci.value));
  ci.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdIdx = Math.min(cmdItems.length - 1, cmdIdx + 1); markCmd(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmdIdx = Math.max(0, cmdIdx - 1); markCmd(); }
    else if (e.key === 'Enter') { e.preventDefault(); pickCmd(cmdIdx); }
  });
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openCmd(); }
  });
}

/* ================= Live clock ================= */
let lastMin = -1;
function tick() {
  const n = nowIST(), f = fmt(n.min);
  $('#clock').textContent = `${f.main}:${pad(n.s)}${f.ap ? ' ' + f.ap : ''}`;
  $('#board-clock').textContent = `${f.main}${f.ap ? ' ' + f.ap : ''}`;
  if (n.min !== lastMin) { lastMin = n.min; if (S.rows.length) { renderBoard(true); renderTable(); } }
}

/* ================= Init ================= */
async function init() {
  $('#main').setAttribute('inert', ''); $('.topbar').setAttribute('inert', '');
  document.documentElement.lang = S.lang;
  readHash(); setThemeIcon();
  const dataP = loadScript('data/timetable.js').then(ok => {
    DATA = ok && window.TIMETABLE && Array.isArray(window.TIMETABLE.routes) ? window.TIMETABLE : null;
    let rows = DATA ? buildRows(DATA) : [];
    if (!rows.length) { S.sample = true; DATA = demoData(); rows = buildRows(DATA); console.info('[Panapakkam Bus] data/timetable.js did not provide window.TIMETABLE.routes; showing sample data.'); }
    S.rows = rows;
    bind(); refreshAll(); tick(); setInterval(tick, 1000);
  });
  const threeP = loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js').then(ok => ok ? loadScript('bus3d.js') : false);
  const fontsP = Promise.race([document.fonts?.ready ?? Promise.resolve(), sleep(2500)]);
  Promise.all([dataP, threeP]).then(([, ok]) => init3D(ok));
  try { await runBoot([dataP, threeP, fontsP]); }
  finally { $('#boot')?.remove(); document.body.classList.remove('booting'); document.body.classList.add('entered'); $('#main').removeAttribute('inert'); $('.topbar').removeAttribute('inert'); }
  updateJump();
}
init();
})();