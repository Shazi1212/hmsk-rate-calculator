// Pure calculation module: no DOM, no storage. Used by the app and by `node --test tests/`.
// All statutory numbers come from config.js.
import { INCOME_TAX as T, SOLI, CHURCH_TAX, TRADE_TAX, SOCIAL, HEALTH, CARE, PENSION, KSK, SMALL_BUSINESS, VAT_RATE } from './config.js';
import { workingDays } from './holidays.js';

export const DEFAULTS = Object.freeze({
  year: 2026,
  state: 'BE',
  target: 3000,          // net amount to live on
  period: 'month',       // 'month' | 'year'
  vacation: 30,
  sick: 10,
  training: 5,
  nonBillable: 25,       // percent of working time that cannot be billed (admin, acquisition)
  hoursPerDay: 8,
  costs: { software: 80, hardware: 60, office: 150, insurance: 40, other: 70 }, // per month
  health: 'gkv',         // 'gkv' (gesetzlich, freiwillig) | 'pkv' (private)
  krankengeld: true,     // GKV with Krankengeld (14.6 %) or without (14.0 %)
  zusatz: 2.9,           // Zusatzbeitrag of your Krankenkasse, percent
  children: 0,           // for the Pflegeversicherung (0 = childless surcharge)
  pkvMonth: 650,         // private health + care insurance per month
  pension: 'drv',        // 'none' | 'drv' (18.6 % of profit) | 'regel' (Regelbeitrag) | 'custom'
  pensionCustom: 500,    // per month, for 'custom'
  ksk: false,            // Künstlersozialkasse member (artists, publicists)
  married: false,        // joint assessment (Splitting), partner without own income
  church: false,
  trade: false,          // Gewerbetreibender (true) or Freiberufler (false)
  hebesatz: 400,
});

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const floor = Math.floor;
const r2 = v => Math.round(v * 100) / 100;

/** § 32a Abs. 1 EStG tariff for one person (zvE in EUR). Returns full euros. */
export function tariff(zvE) {
  const x = floor(Math.max(0, zvE));
  let tax;
  if (x <= T.grundfreibetrag) tax = 0;
  else if (x <= T.zone2End) { const y = (x - T.grundfreibetrag) / 10000; tax = (T.zone2[0] * y + T.zone2[1]) * y; }
  else if (x <= T.zone3End) { const z = (x - T.zone2End) / 10000; tax = (T.zone3[0] * z + T.zone3[1]) * z + T.zone3[2]; }
  else if (x <= T.zone4End) tax = T.zone4[0] * x - T.zone4[1];
  else tax = T.zone5[0] * x - T.zone5[1];
  // round down to full euros; the small epsilon guards against binary float artefacts like 10547.9999999
  return floor(tax + 1e-9);
}

/** Income tax with optional Splitting (§ 32a Abs. 5 EStG). */
export function incomeTax(zvE, joint = false) {
  if (!joint) return tariff(zvE);
  return 2 * tariff(floor(Math.max(0, zvE) / 2));
}

/** Solidaritätszuschlag on the assessed income tax (§§ 3, 4 SolZG). Cents truncated. */
export function soli(est, joint = false) {
  const fg = joint ? SOLI.freigrenzeJoint : SOLI.freigrenze;
  if (est <= fg) return 0;
  const s = Math.min(SOLI.rate * est, SOLI.milderung * (est - fg));
  return floor(s * 100 + 1e-6) / 100;
}

export function churchRate(state) { return CHURCH_TAX[state] ?? CHURCH_TAX.default; }

/** Gewerbesteuer for a sole trader: Messbetrag and tax. */
export function tradeTax(gewerbeertrag, hebesatz) {
  const rounded = floor(Math.max(0, gewerbeertrag) / 100) * 100;
  const base = Math.max(0, rounded - TRADE_TAX.freibetrag);
  const messbetrag = r2(base * TRADE_TAX.messzahl);
  const tax = r2(messbetrag * Math.max(hebesatz, TRADE_TAX.minHebesatz) / 100);
  return { messbetrag, tax };
}

/** Pflegeversicherung rate for the member (full rate, not KSK). */
export function careRate(children) {
  if (!children) return CARE.rate + CARE.childlessSurcharge;
  const discount = Math.min(Math.max(children - 1, 0), CARE.maxDiscountChildren) * CARE.perChildDiscount;
  return CARE.rate - discount;
}

/** Social contributions for a yearly profit. */
export function contributions(profit, o) {
  const pMonth = profit / 12;
  const kvRate = (o.krankengeld ? HEALTH.generalRate : HEALTH.reducedRate) + (Number(o.zusatz) || 0) / 100;
  let kv = 0, pv = 0, rv = 0, kvBase = 0, rvDeductible = true;

  if (o.ksk) {
    // KSK pays half; no minimum base like for voluntary members
    kvBase = clamp(pMonth, 0, SOCIAL.bbgKvPvMonth);
    kv = kvBase * kvRate * KSK.memberShare * 12;
    const pvMember = CARE.rate * KSK.memberShare + (o.children ? 0 : CARE.childlessSurcharge)
      - Math.min(Math.max((o.children || 0) - 1, 0), CARE.maxDiscountChildren) * CARE.perChildDiscount;
    pv = kvBase * pvMember * 12;
    rv = clamp(pMonth, 0, SOCIAL.bbgRvMonth) * PENSION.rate * KSK.memberShare * 12;
  } else {
    if (o.health === 'pkv') {
      kv = (Number(o.pkvMonth) || 0) * 12;
    } else {
      kvBase = clamp(pMonth, SOCIAL.mindestbemessungMonth, SOCIAL.bbgKvPvMonth);
      kv = kvBase * kvRate * 12;
      pv = kvBase * careRate(o.children) * 12;
    }
    if (o.pension === 'drv') rv = clamp(pMonth, PENSION.minBaseMonth, SOCIAL.bbgRvMonth) * PENSION.rate * 12;
    else if (o.pension === 'regel') rv = PENSION.regelbeitragMonth * 12;
    else if (o.pension === 'custom') { rv = (Number(o.pensionCustom) || 0) * 12; rvDeductible = false; }
  }
  kv = r2(kv); pv = r2(pv); rv = r2(rv);

  const withKrankengeld = o.health !== 'pkv' && (o.ksk || o.krankengeld);
  const deductible =
    kv * (withKrankengeld ? 1 - HEALTH.krankengeldTaxCut : 1) + pv +
    (rvDeductible ? Math.min(rv, PENSION.deductibleMax) : 0);
  return { kv, pv, rv, kvBase: r2(kvBase), deductible: r2(deductible) };
}

/** Everything that follows from a yearly revenue (net of VAT). */
export function fromRevenue(revenue, input) {
  const o = { ...DEFAULTS, ...input, costs: { ...DEFAULTS.costs, ...(input.costs || {}) } };
  const costs = costsYear(o);
  const profit = revenue - costs;
  const c = contributions(profit, o);
  const pausch = T.sonderausgabenPauschbetrag * (o.married ? 2 : 1);
  const zvE = floor(Math.max(0, profit - c.deductible - pausch));
  const estTarif = incomeTax(zvE, o.married);

  let gew = { messbetrag: 0, tax: 0 }, credit = 0;
  if (o.trade) {
    gew = tradeTax(profit, Number(o.hebesatz) || TRADE_TAX.defaultHebesatz);
    // § 35 EStG: 4.0 x Messbetrag, at most the trade tax paid and the income tax on trade income (all income here)
    credit = Math.min(TRADE_TAX.anrechnungFactor * gew.messbetrag, gew.tax, estTarif);
  }
  const est = r2(estTarif - credit);
  const solz = soli(est, o.married);
  const kist = o.church ? r2(estTarif * churchRate(o.state)) : 0; // § 51a Abs. 2 Satz 3: without § 35
  const taxes = r2(est + solz + kist + gew.tax);
  const net = r2(profit - c.kv - c.pv - c.rv - taxes);
  return {
    revenue: r2(revenue), costs, profit: r2(profit), ...c, zvE, estTarif, credit: r2(credit), est, soli: solz, kist,
    messbetrag: gew.messbetrag, gewst: gew.tax, taxes, net,
  };
}

export function costsYear(o) {
  const c = o.costs || {};
  return r2(Object.values(c).reduce((s, v) => s + (Number(v) || 0), 0) * 12);
}

/** Time: working days and billable hours. */
export function time(o) {
  const wd = workingDays(o.year, o.state);
  const daysOff = (Number(o.vacation) || 0) + (Number(o.sick) || 0) + (Number(o.training) || 0);
  const workDays = Math.max(0, wd.workingDays - daysOff);
  const hpd = Number(o.hoursPerDay) || 0;
  const workHours = workDays * hpd;
  const billableHours = r2(workHours * (1 - clamp(Number(o.nonBillable) || 0, 0, 95) / 100));
  return { ...wd, daysOff, workDays, hoursPerDay: hpd, workHours, billableHours, allWeekdayHours: wd.weekdays * hpd };
}

export function targetYear(o) {
  const t = Number(o.target) || 0;
  return o.period === 'year' ? t : t * 12;
}

/** Revenue so that net income equals the target (bisection; net is non-decreasing in revenue). */
export function solveRevenue(input) {
  const o = { ...DEFAULTS, ...input };
  const goal = targetYear(o);
  let lo = costsYear(o), hi = Math.max(lo * 2, 50000);
  if (fromRevenue(lo, o).net >= goal) return lo;
  let guard = 0;
  while (fromRevenue(hi, o).net < goal && guard++ < 40) hi *= 2;
  for (let i = 0; i < 100 && hi - lo > 0.005; i++) {
    const mid = (lo + hi) / 2;
    if (fromRevenue(mid, o).net < goal) lo = mid; else hi = mid;
  }
  return hi;
}

/** Full result for the UI. */
export function compute(input) {
  const o = { ...DEFAULTS, ...input, costs: { ...DEFAULTS.costs, ...(input?.costs || {}) } };
  const t = time(o);
  if (t.billableHours <= 0) return { ok: false, error: 'noHours', time: t };
  const revenue = solveRevenue(o);
  const res = fromRevenue(revenue, o);
  const B = t.billableHours;
  const rate = revenue / B;
  // Where every euro of the hourly rate goes. Net income is split by what it pays for:
  // the hour itself (as if every weekday were billed), time off (holidays, vacation, sick, training),
  // and non-billable working time (admin, acquisition).
  const netYear = res.net;
  const income = t.allWeekdayHours > 0 ? netYear / t.allWeekdayHours : 0;
  const timeOff = t.workHours > 0 ? netYear / t.workHours - income : 0;
  const nonBillable = netYear / B - netYear / (t.workHours || B);
  const breakdown = [
    { key: 'costs', value: res.costs / B },
    { key: 'health', value: (res.kv + res.pv) / B },
    { key: 'pension', value: res.rv / B },
    { key: 'tax', value: res.taxes / B },
    { key: 'nonBillable', value: nonBillable },
    { key: 'timeOff', value: timeOff },
    { key: 'income', value: income },
  ].map(s => ({ ...s, value: r2(s.value), share: rate > 0 ? s.value / rate : 0 }));
  const sb = revenue <= SMALL_BUSINESS.priorYear ? 'possible' : revenue <= SMALL_BUSINESS.currentYear ? 'priorLimit' : 'no';
  return {
    ok: true, input: o, time: t, ...res,
    target: targetYear(o),
    rate: r2(rate), dayRate: r2(rate * t.hoursPerDay),
    rateGross: r2(rate * (1 + VAT_RATE)), dayRateGross: r2(rate * t.hoursPerDay * (1 + VAT_RATE)),
    breakdown, smallBusiness: sb,
  };
}

/** What if: net income for a chosen hourly rate. */
export function whatIf(rate, input) {
  const o = { ...DEFAULTS, ...input, costs: { ...DEFAULTS.costs, ...(input?.costs || {}) } };
  const t = time(o);
  return fromRevenue(rate * t.billableHours, o);
}
