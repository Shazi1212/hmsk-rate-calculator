// Income tax 2026 against values computed by hand from § 32a Abs. 1 EStG (VZ 2026),
// https://www.gesetze-im-internet.de/estg/__32a.html
import test from 'node:test';
import assert from 'node:assert/strict';
import { tariff, incomeTax, soli, tradeTax, careRate, churchRate } from '../public/calc.js';

test('zone 1: up to the Grundfreibetrag 12,348 no tax', () => {
  assert.equal(tariff(0), 0);
  assert.equal(tariff(12348), 0);
  assert.equal(tariff(12349), 0); // (914.51*0.0001+1400)*0.0001 = 0.14
});

test('zone 2: (914.51 y + 1400) y', () => {
  // y = 0.2652 -> (242.528 + 1400) * 0.2652 = 435.598
  assert.equal(tariff(15000), 435);
  // end of zone 2 meets the constant of zone 3 (1034.87)
  assert.equal(tariff(17799), 1034);
});

test('zone 3: (173.10 z + 2397) z + 1034.87', () => {
  // z = 3.2201 -> (557.399 + 2397) * 3.2201 + 1034.87 = 10548.33
  assert.equal(tariff(50000), 10548);
  // z = 2.873 -> (497.316 + 2397) * 2.873 + 1034.87 = 9350.24
  assert.equal(tariff(46529), 9350);
  assert.equal(tariff(69878), 18213);
});

test('zone 4 and 5: 42 % and 45 %', () => {
  assert.equal(tariff(69879), 18213);   // 0.42 * 69879 - 11135.63 = 18213.55
  assert.equal(tariff(100000), 30864);  // 42000 - 11135.63
  assert.equal(tariff(277825), 105550); // 116686.50 - 11135.63 = 105550.87
  assert.equal(tariff(300000), 115529); // 135000 - 19470.38
});

test('fractional income is rounded down to full euros first', () => {
  assert.equal(tariff(50000.99), tariff(50000));
});

test('Splitting doubles the tax on half the joint income', () => {
  assert.equal(incomeTax(100000, true), 2 * 10548);
  assert.equal(incomeTax(24696, true), 0); // 2 x Grundfreibetrag
});

test('Soli: Freigrenze 20,350 and Milderungszone 11.9 %', () => {
  assert.equal(soli(20350), 0);
  assert.equal(soli(25000), 553.35);     // min(1375, 0.119 * 4650)
  assert.equal(soli(40000), 2200);       // full 5.5 %
  assert.equal(soli(40700, true), 0);    // joint Freigrenze
  assert.equal(soli(45000, true), 511.7); // min(2475, 0.119 * 4300)
});

test('Gewerbesteuer: round to 100, Freibetrag 24,500, 3.5 %', () => {
  const g = tradeTax(60099, 400);
  assert.equal(g.messbetrag, 1242.5); // (60000 - 24500) * 0.035
  assert.equal(g.tax, 4970);          // 1242.5 * 400 %
  assert.deepEqual(tradeTax(24599, 400), { messbetrag: 0, tax: 0 });
});

test('Pflegeversicherung rates 2026', () => {
  assert.equal(careRate(0).toFixed(4), '0.0420');
  assert.equal(careRate(1).toFixed(4), '0.0360');
  assert.equal(careRate(2).toFixed(4), '0.0335');
  assert.equal(careRate(5).toFixed(4), '0.0260');
  assert.equal(careRate(7).toFixed(4), '0.0260');
});

test('Kirchensteuer 8 % in BY/BW, 9 % elsewhere', () => {
  assert.equal(churchRate('BY'), 0.08);
  assert.equal(churchRate('BW'), 0.08);
  assert.equal(churchRate('NW'), 0.09);
});
