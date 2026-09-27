// An interval is a [start, end] pair of integer minutes that covers start up to, but not
// including, end. A valid interval has start < end.

/**
 * Merge intervals that overlap or touch: [0, 10] and [10, 20] become [0, 20].
 * - Returns new [start, end] arrays sorted by start. The input array and its intervals are not
 *   changed.
 * - Throws a RangeError whose message contains the index of the first interval whose start is not
 *   less than its end.
 * @param {Array<[number, number]>} intervals
 * @returns {Array<[number, number]>}
 */
export function mergeIntervals(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const iv of intervals) {
    const last = out[out.length - 1];
    if (last && iv[0] < last[1]) last[1] = Math.max(last[1], iv[1]);
    else out.push(iv);
  }
  return out;
}

/**
 * The free time inside the day [dayStart, dayEnd) that no busy interval covers, as sorted
 * [start, end] pairs.
 * - Busy intervals may overlap each other and may reach outside the day; only the part inside the
 *   day counts.
 * - Free gaps shorter than minLength minutes are left out.
 * - If dayStart is not less than dayEnd, the result is [].
 * - The busy list is not changed. Throws like mergeIntervals if a busy interval is invalid.
 * @param {Array<[number, number]>} busy
 * @param {number} dayStart
 * @param {number} dayEnd
 * @param {number} [minLength]
 * @returns {Array<[number, number]>}
 */
export function freeSlots(busy, dayStart, dayEnd, minLength = 1) {
  throw new Error('not implemented');
}

/**
 * Total minutes covered by at least one interval. Time covered by several intervals counts once.
 * [] gives 0. Throws like mergeIntervals if an interval is invalid.
 * @param {Array<[number, number]>} intervals
 * @returns {number}
 */
export function coveredMinutes(intervals) {
  throw new Error('not implemented');
}
