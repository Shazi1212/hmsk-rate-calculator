// Public holidays per Bundesland (statewide holidays only). Pure functions, no DOM.
// Not counted: holidays that apply only in some municipalities (Mariä Himmelfahrt in parts of Bayern,
// Fronleichnam in parts of Sachsen and Thüringen, Augsburger Friedensfest) and Sunday holidays
// (Oster-/Pfingstsonntag in Brandenburg), which never fall on a weekday.

export const STATES = {
  BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg',
  HE: 'Hessen', MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen',
};

// Easter Sunday (Gregorian), anonymous algorithm (Meeus/Jones/Butcher).
export function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

function utc(y, m, d) { return new Date(Date.UTC(y, m - 1, d)); }
function addDays(date, n) { return new Date(date.getTime() + n * 86400000); }
export function iso(date) { return date.toISOString().slice(0, 10); }

// Buß- und Bettag: the Wednesday before 23 November (between 16 and 22 November).
function bussUndBettag(year) {
  const nov22 = utc(year, 11, 22);
  const back = (nov22.getUTCDay() - 3 + 7) % 7;
  return addDays(nov22, -back);
}

// key, English name, German name, date function, states (null = nationwide)
const RULES = [
  ['newyear', "New Year's Day", 'Neujahr', y => utc(y, 1, 1), null],
  ['epiphany', 'Epiphany', 'Heilige Drei Könige', y => utc(y, 1, 6), ['BW', 'BY', 'ST']],
  ['womensday', "International Women's Day", 'Internationaler Frauentag', y => utc(y, 3, 8), ['BE', 'MV']],
  ['goodfriday', 'Good Friday', 'Karfreitag', y => addDays(easterSunday(y), -2), null],
  ['eastermonday', 'Easter Monday', 'Ostermontag', y => addDays(easterSunday(y), 1), null],
  ['labour', 'Labour Day', 'Tag der Arbeit', y => utc(y, 5, 1), null],
  ['ascension', 'Ascension Day', 'Christi Himmelfahrt', y => addDays(easterSunday(y), 39), null],
  ['whitmonday', 'Whit Monday', 'Pfingstmontag', y => addDays(easterSunday(y), 50), null],
  ['corpus', 'Corpus Christi', 'Fronleichnam', y => addDays(easterSunday(y), 60), ['BW', 'BY', 'HE', 'NW', 'RP', 'SL']],
  ['assumption', 'Assumption Day', 'Mariä Himmelfahrt', y => utc(y, 8, 15), ['SL']],
  ['childrensday', "World Children's Day", 'Weltkindertag', y => utc(y, 9, 20), ['TH']],
  ['unity', 'German Unity Day', 'Tag der Deutschen Einheit', y => utc(y, 10, 3), null],
  ['reformation', 'Reformation Day', 'Reformationstag', y => utc(y, 10, 31), ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH']],
  ['allsaints', "All Saints' Day", 'Allerheiligen', y => utc(y, 11, 1), ['BW', 'BY', 'NW', 'RP', 'SL']],
  ['repentance', 'Day of Repentance and Prayer', 'Buß- und Bettag', bussUndBettag, ['SN']],
  ['christmas1', 'Christmas Day', '1. Weihnachtstag', y => utc(y, 12, 25), null],
  ['christmas2', 'Boxing Day', '2. Weihnachtstag', y => utc(y, 12, 26), null],
];

/** All statewide holidays of a year in a Bundesland, sorted, with weekday flag. */
export function holidays(year, state) {
  return RULES
    .filter(r => !r[4] || r[4].includes(state))
    .map(([key, en, de, fn]) => {
      const date = fn(year);
      const dow = date.getUTCDay();
      return { key, en, de, date: iso(date), weekday: dow !== 0 && dow !== 6 };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Monday to Friday days in a year. */
export function weekdays(year) {
  let n = 0;
  for (let d = utc(year, 1, 1); d.getUTCFullYear() === year; d = addDays(d, 1)) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

/** Weekdays minus public holidays that fall on a weekday. */
export function workingDays(year, state) {
  const hol = holidays(year, state).filter(h => h.weekday).length;
  const wd = weekdays(year);
  return { weekdays: wd, holidaysOnWeekdays: hol, workingDays: wd - hol };
}
