// UI: reads the form, calls the pure calc module, renders. State in localStorage and the URL hash.
import { DEFAULTS, compute, whatIf } from './calc.js';
import { holidays, STATES } from './holidays.js';
import { YEARS, SOURCES, LINK_BASE } from './config.js';
import { TEXT } from './i18n.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORE = 'hmsk-rate-calculator-v1';
const COST_KEYS = Object.keys(DEFAULTS.costs);
const BOOL = ['krankengeld', 'ksk', 'married', 'church', 'trade'];
const NUM = ['year', 'target', 'vacation', 'sick', 'training', 'nonBillable', 'hoursPerDay', 'zusatz', 'children', 'pkvMonth', 'pensionCustom', 'hebesatz'];
const STR = { state: Object.keys(STATES), period: ['month', 'year'], health: ['gkv', 'pkv'], pension: ['none', 'drv', 'regel', 'custom'] };

let lang = pickLang();
let state = loadState();
let last = null;

function pickLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'de' || q === 'en') return q;
  try { const s = localStorage.getItem(STORE + '-lang'); if (s === 'de' || s === 'en') return s; } catch {}
  return (navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en';
}
const t = () => TEXT[lang];

// ---------- state <-> hash / storage ----------
function sanitize(raw) {
  const o = structuredClone(DEFAULTS);
  o.costs = { ...DEFAULTS.costs };
  if (!raw || typeof raw !== 'object') return o;
  for (const k of NUM) if (raw[k] !== undefined && raw[k] !== '' && isFinite(Number(raw[k]))) o[k] = Number(raw[k]);
  for (const k of BOOL) if (raw[k] !== undefined) o[k] = raw[k] === true || raw[k] === '1' || raw[k] === 1;
  for (const [k, allowed] of Object.entries(STR)) if (allowed.includes(raw[k])) o[k] = raw[k];
  const c = raw.costs || {};
  for (const k of COST_KEYS) {
    const v = c[k] ?? raw['c_' + k];
    if (v !== undefined && v !== '' && isFinite(Number(v))) o.costs[k] = Number(v);
  }
  if (!YEARS.includes(o.year)) o.year = DEFAULTS.year;
  o.children = Math.min(Math.max(Math.round(o.children), 0), 5);
  return o;
}
function toHash(o) {
  const p = new URLSearchParams();
  for (const k of [...NUM, ...Object.keys(STR)]) p.set(k, o[k]);
  for (const k of BOOL) p.set(k, o[k] ? '1' : '0');
  for (const k of COST_KEYS) p.set('c_' + k, o.costs[k]);
  return p.toString();
}
function loadState() {
  const h = location.hash.slice(1);
  if (h.includes('=')) return sanitize(Object.fromEntries(new URLSearchParams(h)));
  try { const s = localStorage.getItem(STORE); if (s) return sanitize(JSON.parse(s)); } catch {}
  return sanitize(null);
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
  history.replaceState(null, '', location.pathname + location.search + '#' + toHash(state));
}

// ---------- formatting ----------
const locale = () => (lang === 'de' ? 'de-DE' : 'en-GB');
const eur = (v, d = 2) => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const num = (v, d = 0) => new Intl.NumberFormat(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const pct = v => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 0 }).format(v);
const z = v => (Math.abs(v) < 0.5 ? 0 : v); // no "-0 €"
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- static texts ----------
function applyTexts() {
  const T = t();
  document.documentElement.lang = lang;
  document.title = T.docTitle;
  for (const el of $$('[data-t]')) {
    const v = T[el.dataset.t];
    if (typeof v === 'string') el.textContent = v;
  }
  $('#langBtn').setAttribute('aria-label', T.langSwitchLabel);
  const de = lang === 'de';
  const base = LINK_BASE;
  $('#lnkHome').href = $('#lnkHome2').href = base + (de ? '/de/tools/rate-calculator/' : '/tools/rate-calculator/');
  $('#lnkImprint').href = base + (de ? '/impressum/' : '/imprint/');
  $('#lnkPrivacy').href = base + (de ? '/datenschutz/' : '/privacy/');
  $('#lnkInvoice').href = base + (de ? '/de/tools/invoice/' : '/tools/invoice/');
  $('#lnkNotify').href = base + (de ? '/de/?topic=rate-calculator#contact' : '/?topic=rate-calculator#contact');

  $('#year').innerHTML = YEARS.map(y => `<option value="${y}">${y}</option>`).join('');
  $('#state').innerHTML = Object.entries(STATES).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('');
  $('#children').innerHTML = [0, 1, 2, 3, 4, 5].map(n => `<option value="${n}">${n === 0 ? T.childNone : n === 5 ? T.child5 : n}</option>`).join('');
  $('#assumptions').innerHTML = T.assumptions.map(a => `<li>${esc(a)}</li>`).join('');
  $('#sources').innerHTML = T.src.map(([label, key]) => `<li><a href="${esc(SOURCES[key])}" rel="noopener" target="_blank">${esc(label)}</a></li>`).join('');
}

// ---------- form <-> state ----------
function fillForm() {
  for (const k of [...NUM, ...Object.keys(STR)]) {
    const el = document.getElementById(k);
    if (el) el.value = state[k];
  }
  for (const el of $$('input[name=health]')) el.checked = el.value === state.health;
  for (const k of BOOL) {
    const el = document.getElementById(k);
    if (el.type === 'checkbox') el.checked = state[k]; else el.value = state[k] ? '1' : '0';
  }
  for (const k of COST_KEYS) document.getElementById('c-' + k).value = state.costs[k];
  syncFormFlags();
}
function readForm() {
  const raw = {};
  for (const k of [...NUM, ...Object.keys(STR)]) { const el = document.getElementById(k); if (el) raw[k] = el.value; }
  raw.health = ($('input[name=health]:checked') || {}).value;
  for (const k of BOOL) { const el = document.getElementById(k); raw[k] = el.type === 'checkbox' ? el.checked : el.value === '1'; }
  raw.costs = {};
  for (const k of COST_KEYS) raw.costs[k] = document.getElementById('c-' + k).value;
  // keep previous value for an empty or invalid field while typing
  for (const k of NUM) if (raw[k] === '' || !isFinite(Number(raw[k]))) raw[k] = state[k];
  for (const k of COST_KEYS) if (raw.costs[k] === '' || !isFinite(Number(raw.costs[k]))) raw.costs[k] = 0;
  state = sanitize(raw);
}
function syncFormFlags() {
  const f = $('#form');
  f.dataset.health = state.ksk ? 'gkv' : state.health;
  f.dataset.pension = state.pension;
  f.dataset.trade = state.trade ? '1' : '0';
  f.dataset.ksk = state.ksk ? '1' : '0';
}

// ---------- render ----------
function render() {
  const T = t();
  const o = state.ksk ? { ...state, health: 'gkv' } : state;
  const r = compute(o);
  last = r;
  $('#cmdYear').textContent = state.year;

  const hol = holidays(state.year, state.state);
  const hw = hol.filter(h => h.weekday).length;
  const tm = r.time;
  $('#wdInfo').textContent = T.workingDaysInfo(num(tm.weekdays), hw, state.year, STATES[state.state], num(tm.workingDays));
  $('#holList').innerHTML = hol.map(h => {
    const d = new Date(h.date + 'T00:00:00Z');
    const ds = new Intl.DateTimeFormat(locale(), { day: '2-digit', month: '2-digit', weekday: 'short', timeZone: 'UTC' }).format(d);
    return `<li class="${h.weekday ? '' : 'we'}"><time datetime="${h.date}">${esc(ds)}</time>${esc(lang === 'de' ? h.de : h.en)}${h.weekday ? '' : ` (${T.weekend})`}</li>`;
  }).join('');
  const ct = COST_KEYS.reduce((s, k) => s + state.costs[k], 0);
  $('#costsTotal').textContent = T.costsTotal(eur(ct, 0));

  if (!r.ok) {
    $('#err').textContent = T.errNoHours; $('#err').hidden = false; $('#out').hidden = true;
    $('#yearTbl tbody').innerHTML = '';
    return;
  }
  $('#err').hidden = true; $('#out').hidden = false;

  $('#rate').textContent = eur(r.rate);
  $('#rateGross').textContent = eur(r.rateGross) + ' ' + T.perHour;
  $('#dayRate').textContent = eur(r.dayRate, 0);
  $('#dayRateGross').textContent = `${T.withVat}: ${eur(r.dayRateGross, 0)}`;
  $('#billable').textContent = num(r.time.billableHours);
  $('#revenue').textContent = eur(r.revenue, 0);

  // stacked bar
  const parts = r.breakdown.filter(b => b.value > 0.004);
  $('#bar').innerHTML = parts.map(b => `<span style="width:${(b.share * 100).toFixed(3)}%;background:var(--s-${b.key})" title="${esc(T.seg[b.key])}: ${esc(eur(b.value))}"></span>`).join('');
  $('#bar').setAttribute('aria-label', parts.map(b => `${T.seg[b.key]} ${eur(b.value)}`).join(', '));
  $('#legend').innerHTML = parts.map(b => `<li><i style="background:var(--s-${b.key})"></i><span>${esc(T.seg[b.key])}</span><span class="v">${esc(eur(b.value))}</span><span class="p">${esc(pct(b.share))}</span></li>`).join('');

  $('#sbNote').textContent = r.smallBusiness === 'possible' ? T.sbPossible : r.smallBusiness === 'priorLimit' ? T.sbPriorLimit : T.sbNo;

  // year table
  const R = T.rows;
  const rows = [
    ['revenue', r.revenue], ['costs', -r.costs], ['profit', r.profit, 'tot0'],
    ['kv', -r.kv], ...(o.health === 'pkv' ? [] : [['pv', -r.pv]]), ...(r.rv ? [['rv', -r.rv]] : []),
    ['est', -r.est], ...(r.credit > 0 ? [['credit', r.credit, 'sub']] : []),
    ['soli', -r.soli], ...(state.church ? [['kist', -r.kist]] : []), ...(state.trade ? [['gewst', -r.gewst]] : []),
    ['net', r.net, 'tot'], ['zvE', r.zvE, 'sub'],
  ];
  $('#yearTbl tbody').innerHTML = `<tr><td></td><td class="n m">${esc(T.perYearShort)}</td><td class="n m">${esc(T.perMonthShort)}</td></tr>` +
    rows.map(([k, v, cls]) => `<tr class="${cls || ''}"><td>${esc(R[k])}</td><td class="n">${esc(eur(z(v), 0))}</td><td class="n">${cls === 'sub' ? '' : esc(eur(z(v / 12), 0))}</td></tr>`).join('');

  // what-if slider
  const s = $('#whatIf');
  s.min = Math.max(1, Math.floor(r.rate * 0.5));
  s.max = Math.ceil(r.rate * 2);
  s.value = Math.round(r.rate);
  renderWhatIf(r.rate);
}

function renderWhatIf(exact) {
  if (!last || !last.ok) return;
  const T = t();
  const rate = typeof exact === 'number' ? exact : Number($('#whatIf').value);
  const o = state.ksk ? { ...state, health: 'gkv' } : state;
  const w = whatIf(rate, o);
  $('#whatIfRate').textContent = eur(rate, typeof exact === 'number' ? 2 : 0);
  let diff = (w.net - last.target) / 12;
  if (Math.abs(diff) < 0.5) diff = 0;
  const sign = diff >= 0 ? '+' : '';
  $('#whatIfOut').innerHTML = `${esc(T.whatIfNet(eur(w.net / 12, 0), eur(w.net, 0)))}<br><span class="${diff >= 0 ? 'pos' : 'neg'}">${esc(T.whatIfDiff(sign + eur(diff, 0)))}</span>`;
}

// ---------- events ----------
let timer;
function onChange() {
  readForm(); syncFormFlags();
  clearTimeout(timer);
  timer = setTimeout(() => { render(); save(); }, 60);
}

function init() {
  applyTexts();
  fillForm();
  render();
  save();
  $('#form').addEventListener('input', onChange);
  $('#form').addEventListener('change', onChange);
  $('#form').addEventListener('submit', e => e.preventDefault());
  $('#whatIf').addEventListener('input', () => renderWhatIf());
  $('#langBtn').addEventListener('click', () => {
    lang = lang === 'de' ? 'en' : 'de';
    try { localStorage.setItem(STORE + '-lang', lang); } catch {}
    const u = new URL(location.href); u.searchParams.set('lang', lang);
    history.replaceState(null, '', u.pathname + u.search + u.hash);
    applyTexts(); fillForm(); render();
  });
  $('#printBtn').addEventListener('click', () => window.print());
  $('#resetBtn').addEventListener('click', () => { state = sanitize(null); fillForm(); render(); save(); });
  $('#shareBtn').addEventListener('click', async () => {
    const u = new URL(location.href); u.searchParams.set('lang', lang); u.hash = toHash(state);
    const btn = $('#shareBtn');
    try { await navigator.clipboard.writeText(u.toString()); btn.textContent = t().shared; }
    catch { window.prompt(t().share, u.toString()); }
    setTimeout(() => { btn.textContent = t().share; }, 1800);
  });
  window.addEventListener('hashchange', () => { state = loadState(); fillForm(); render(); });
}

init();
