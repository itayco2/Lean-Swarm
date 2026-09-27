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
  if (!Array.isArray(keys) || keys.length === 0) throw new TypeError('keys must be a non-empty array');
  const specs = keys.map(k => (k.startsWith('-') ? { field: k.slice(1), dir: -1 } : { field: k, dir: 1 }));
  const rank = v => (v === null || v === undefined ? 2 : typeof v === 'number' ? 0 : 1);
  const compareRecords = (a, b) => {
    for (const { field, dir } of specs) {
      const x = a[field], y = b[field];
      const rx = rank(x), ry = rank(y);
      if (rx === 2 || ry === 2) {
        if (rx !== ry) return rx === 2 ? 1 : -1;
        continue;
      }
      if (rx !== ry) return (rx - ry) * dir;
      if (x < y) return -dir;
      if (x > y) return dir;
    }
    return 0;
  };
  return records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => compareRecords(a.record, b.record) || a.index - b.index)
    .map(x => x.record);
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
  const OPS = ['count', 'sum', 'min', 'max', 'avg', 'distinct'];
  for (const [name, [op]] of Object.entries(aggs)) {
    if (!OPS.includes(op)) throw new Error(`unknown aggregate op "${op}" for "${name}"`);
  }
  const groups = new Map();
  for (const r of records) {
    const key = r[by] === undefined ? null : r[by];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return [...groups].map(([key, rows]) => {
    const out = { [by]: key };
    for (const [name, [op, field]] of Object.entries(aggs)) {
      if (op === 'count') { out[name] = rows.length; continue; }
      const values = rows.map(r => r[field]);
      if (op === 'distinct') { out[name] = new Set(values.filter(v => v !== null && v !== undefined)).size; continue; }
      const nums = values.filter(v => typeof v === 'number' && !Number.isNaN(v));
      if (op === 'sum') out[name] = nums.reduce((a, b) => a + b, 0);
      else if (nums.length === 0) out[name] = null;
      else if (op === 'min') out[name] = Math.min(...nums);
      else if (op === 'max') out[name] = Math.max(...nums);
      else out[name] = nums.reduce((a, b) => a + b, 0) / nums.length;
    }
    return out;
  });
}
