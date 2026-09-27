// Dates are "YYYY-MM-DD" strings for real days in the Gregorian calendar, years 1000 to 9999,
// with no time of day and no time zone.

const DAY_MS = 86400000;

function toDayNumber(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!m) throw new RangeError(`not a date: ${date}`);
  const n = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS;
  if (fromDayNumber(n) !== date) throw new RangeError(`not a date: ${date}`);
  return n;
}

function fromDayNumber(n) {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

const weekdayOf = n => (((n + 4) % 7) + 7) % 7; // day 0 (1970-01-01) was a Thursday

/**
 * The day of the week of a date: 0 is Sunday, 1 is Monday, ..., 6 is Saturday.
 * Throws a RangeError if the text is not a real date in the format above.
 * @param {string} date
 * @returns {number}
 */
export function weekday(date) {
  return weekdayOf(toDayNumber(date));
}

/**
 * Add n whole months to a date. n may be negative or 0.
 * - If the day doesn't exist in the target month, the result is the last day of that month:
 *   2024-01-31 plus 1 month is 2024-02-29.
 * - Throws a RangeError if the text is not a real date in the format above.
 * @param {string} date
 * @param {number} n
 * @returns {string}
 */
export function addMonths(date, n) {
  toDayNumber(date);
  const [y, m, d] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const pad = (v, w) => String(v).padStart(w, '0');
  return `${pad(year, 4)}-${pad(month + 1, 2)}-${pad(Math.min(d, lastDay), 2)}`;
}

/**
 * The dates of a weekly event between `from` and `to`, both included, in order.
 * - The event happens on the listed weekdays (0 is Sunday ... 6 is Saturday) of every
 *   `interval`-th week. Weeks run Sunday to Saturday, and the week that contains `start` is the
 *   event's first week.
 * - Nothing happens before `start`. `from` may be before or after `start`.
 * - Dates listed in `except` are left out.
 * - If `from` is after `to`, the result is [].
 * - Throws a RangeError if interval is not a positive integer, if weekdays is empty or holds
 *   anything other than the integers 0 to 6, or if start, from or to is not a real date.
 * @param {{ start: string, weekdays: number[], interval?: number, except?: string[] }} rule
 * @param {string} from
 * @param {string} to
 * @returns {string[]}
 */
export function weeklyOccurrences({ start, weekdays, interval = 1, except = [] }, from, to) {
  if (!Number.isInteger(interval) || interval < 1) throw new RangeError('interval must be a positive integer');
  if (!Array.isArray(weekdays) || weekdays.length === 0 || weekdays.some(w => !Number.isInteger(w) || w < 0 || w > 6)) {
    throw new RangeError('weekdays must be a non-empty list of integers 0 to 6');
  }
  const s = toDayNumber(start);
  const f = toDayNumber(from);
  const t = toDayNumber(to);
  const firstSunday = s - weekdayOf(s);
  const skip = new Set(except);
  const out = [];
  for (let d = Math.max(s, f); d <= t; d++) {
    const week = Math.floor((d - firstSunday) / 7);
    if (week % interval !== 0 || !weekdays.includes(weekdayOf(d))) continue;
    const date = fromDayNumber(d);
    if (!skip.has(date)) out.push(date);
  }
  return out;
}
