import test from 'node:test';
import assert from 'node:assert/strict';
import { easterSunday, iso, holidays, weekdays, workingDays, STATES } from '../public/holidays.js';

const dates = (y, s) => Object.fromEntries(holidays(y, s).map(h => [h.key, h.date]));

test('Easter Sunday', () => {
  assert.equal(iso(easterSunday(2024)), '2024-03-31');
  assert.equal(iso(easterSunday(2025)), '2025-04-20');
  assert.equal(iso(easterSunday(2026)), '2026-04-05');
  assert.equal(iso(easterSunday(2027)), '2027-03-28');
});

test('Easter-based holidays 2026 and 2027', () => {
  const a = dates(2026, 'NW');
  assert.equal(a.goodfriday, '2026-04-03');
  assert.equal(a.eastermonday, '2026-04-06');
  assert.equal(a.ascension, '2026-05-14');
  assert.equal(a.whitmonday, '2026-05-25');
  assert.equal(a.corpus, '2026-06-04');
  const b = dates(2027, 'BY');
  assert.equal(b.goodfriday, '2027-03-26');
  assert.equal(b.eastermonday, '2027-03-29');
  assert.equal(b.ascension, '2027-05-06');
  assert.equal(b.whitmonday, '2027-05-17');
  assert.equal(b.corpus, '2027-05-27');
});

test('Buß- und Bettag only in Sachsen', () => {
  assert.equal(dates(2026, 'SN').repentance, '2026-11-18');
  assert.equal(dates(2027, 'SN').repentance, '2027-11-17');
  assert.equal(dates(2026, 'BE').repentance, undefined);
});

test('number of statewide holidays per Bundesland', () => {
  const n = s => holidays(2026, s).length;
  assert.equal(n('BE'), 10); // 9 national + Frauentag
  assert.equal(n('BY'), 12); // + Epiphany, Corpus Christi, All Saints
  assert.equal(n('BW'), 12);
  assert.equal(n('SL'), 12); // + Corpus, Assumption, All Saints
  assert.equal(n('SN'), 11); // + Reformation, Buß- und Bettag
  assert.equal(n('TH'), 11); // + Children's Day, Reformation
  assert.equal(n('HH'), 10);
  assert.equal(n('MV'), 11); // + Frauentag, Reformation
  assert.equal(Object.keys(STATES).length, 16);
});

test('weekdays per year', () => {
  assert.equal(weekdays(2026), 261);
  assert.equal(weekdays(2027), 261);
  assert.equal(weekdays(2028), 260);
});

test('working days 2026 and 2027', () => {
  assert.equal(workingDays(2026, 'BE').workingDays, 254); // 7 holidays on weekdays
  assert.equal(workingDays(2026, 'BY').workingDays, 252); // + 6 Jan (Tue), Corpus Christi; 1 Nov is a Sunday
  assert.equal(workingDays(2026, 'NW').workingDays, 253);
  assert.equal(workingDays(2026, 'SN').workingDays, 253); // 31 Oct is a Saturday, + Buß- und Bettag
  assert.equal(workingDays(2027, 'BE').workingDays, 255); // 1 May, 3 Oct, 25/26 Dec on weekends; + 8 Mar (Mon)
});
