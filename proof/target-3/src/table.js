// Records are plain objects whose values are numbers, strings, null or undefined.

/**
 * Sort records by one or more fields and return a new array. The input is not changed.
 * - keys are field names, each optionally prefixed with "-" for descending order. The first key
 *   decides; later keys only break ties.
 * - In ascending order, numbers come before strings; numbers compare as numbers and strings by
 *   UTF-16 code units. A descending key reverses how two values compare, except that null,
 *   undefined and missing values come last in both directions.
 * - The sort is stable: records that tie on every key keep their input order.
 * - Throws a TypeError if keys is not a non-empty array.
 * @param {object[]} records
 * @param {string[]} keys
 * @returns {object[]}
 */
export function sortBy(records, keys) {
  return records.sort((a, b) => {
    for (const key of keys) {
      const desc = key.startsWith('-');
      const field = desc ? key.slice(1) : key;
      if (a[field] < b[field]) return desc ? 1 : -1;
      if (a[field] > b[field]) return desc ? -1 : 1;
    }
    return 0;
  });
}

/**
 * Group records by the value of one field and compute aggregates for each group.
 * - Returns one object per group, in the order in which each group's key first appears. Each
 *   object holds the group's key under the name `by`, plus one property per aggregate.
 * - Records whose `by` field is null, undefined or missing all go in one group with key null.
 * - Keys are compared with strict equality: 1 and '1' are different groups.
 * - aggs maps each output name to [op, field]. The ops are:
 *     count:    the number of records in the group (field is ignored and may be left out);
 *     sum:      the sum of the field's number values, or 0 if there are none;
 *     min, max: the smallest or largest number value, or null if there are none;
 *     avg:      the mean of the number values, or null if there are none;
 *     distinct: how many different values the field has, by strict equality, not counting null
 *               or undefined.
 *   sum, min, max and avg ignore values that are not numbers, and NaN.
 * - Throws an Error whose message contains the op's name if an op is not one of these.
 * - The input records are not changed.
 * @param {object[]} records
 * @param {string} by
 * @param {Record<string, [string, string?]>} aggs
 * @returns {object[]}
 */
export function groupBy(records, by, aggs) {
  throw new Error('not implemented');
}
