import test from 'node:test';
import assert from 'node:assert/strict';
import { fromRevenue, compute, solveRevenue, whatIf, contributions, time } from '../public/calc.js';

const base = {
  year: 2026, state: 'BE', target: 3000, period: 'month', vacation: 30, sick: 10, training: 5, nonBillable: 25,
  hoursPerDay: 8, costs: { software: 100, hardware: 100, office: 100, insurance: 50, other: 50 },
  health: 'gkv', krankengeld: true, zusatz: 2.9, children: 0, pension: 'drv',
  ksk: false, married: false, church: false, trade: false, hebesatz: 400,
};

test('forward case by hand: revenue 80,000, costs 4,800, GKV + DRV, single', () => {
  const r = fromRevenue(80000, base);
  assert.equal(r.profit, 75200);
  // KV: base capped at BBG 5,812.50/month, 14.6 % + 2.9 % = 17.5 %
  assert.equal(r.kv, 12206.25);
  // PV childless 4.2 %
  assert.equal(r.pv, 2929.5);
  // RV 18.6 % of 75,200 (below BBG 101,400)
  assert.equal(r.rv, 13987.2);
  // deductible: KV x 0.96 (Krankengeld) + PV + RV = 28,634.70; minus Pauschbetrag 36
  assert.equal(r.zvE, 46529);
  assert.equal(r.estTarif, 9350);
  assert.equal(r.soli, 0);
  assert.equal(r.net, 36727.05);
});

test('GKV minimum base 1,318.33 for low profits', () => {
  const c = contributions(6000, { ...base, pension: 'none' });
  assert.equal(c.kvBase, 1318.33);
  assert.equal(c.kv, Math.round(1318.33 * 0.175 * 12 * 100) / 100);
});

test('KSK halves KV and RV', () => {
  const c = contributions(36000, { ...base, ksk: true });
  assert.equal(c.kv, 3000 * 0.175 * 0.5 * 12);
  assert.equal(c.rv, Math.round(3000 * 0.093 * 12 * 100) / 100);
  assert.equal(c.pv, Math.round(3000 * (0.018 + 0.006) * 12 * 100) / 100);
});

test('Gewerbesteuer is (almost) offset by § 35 at Hebesatz 400', () => {
  const free = fromRevenue(100000, base);
  const trade = fromRevenue(100000, { ...base, trade: true, hebesatz: 400 });
  assert.ok(trade.gewst > 0);
  assert.equal(trade.credit, trade.gewst);
  assert.ok(Math.abs(trade.net - free.net) < 0.5);
  const high = fromRevenue(100000, { ...base, trade: true, hebesatz: 490 });
  assert.ok(high.net < free.net);
});

test('solver hits the target net income within a cent', () => {
  for (const o of [base, { ...base, married: true, church: true, state: 'BY' }, { ...base, health: 'pkv', pkvMonth: 700, pension: 'custom', pensionCustom: 400 },
    { ...base, target: 90000, period: 'year', trade: true, hebesatz: 480 }]) {
    const rev = solveRevenue(o);
    const target = o.period === 'year' ? o.target : o.target * 12;
    assert.ok(Math.abs(fromRevenue(rev, o).net - target) < 0.01, JSON.stringify(o));
  }
});

test('full result: hours, rate, breakdown adds up', () => {
  const r = compute(base);
  assert.equal(r.ok, true);
  const t = time(base);
  assert.equal(t.workingDays, 254);
  assert.equal(t.workDays, 254 - 45);
  assert.equal(t.billableHours, 209 * 8 * 0.75);
  assert.ok(Math.abs(r.rate * t.billableHours - r.revenue) < 0.01 * t.billableHours);
  const sum = r.breakdown.reduce((s, b) => s + b.value, 0);
  assert.ok(Math.abs(sum - r.rate) < 0.05, `${sum} vs ${r.rate}`);
  assert.ok(Math.abs(r.dayRate - r.rate * 8) < 0.05);
  assert.ok(Math.abs(r.rateGross - r.rate * 1.19) < 0.01);
  // sanity range for 3,000 net/month in Berlin with these settings
  assert.ok(r.rate > 50 && r.rate < 80, String(r.rate));
});

test('what-if at the minimum rate returns the target', () => {
  const r = compute(base);
  const w = whatIf(r.revenue / r.time.billableHours, base);
  assert.ok(Math.abs(w.net - 36000) < 0.02);
  assert.ok(whatIf(r.rate * 1.2, base).net > w.net);
});

test('no billable hours is an error, not a crash', () => {
  const r = compute({ ...base, vacation: 300 });
  assert.equal(r.ok, false);
});
