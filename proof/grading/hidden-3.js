// Hidden checks for proof round 3. The agents never see these. Each case tests one rule from the
// JSDoc in proof/target-3 and throws if the code breaks it. `m` holds the target's modules:
// { csv, wrap, intervals, recur, filter, table }.
import assert from 'node:assert/strict';

export const MODULES = { csv: 'text', wrap: 'text', intervals: 'time', recur: 'time', filter: 'query', table: 'query' };

const cases = [];
const c = (id, area, run) => cases.push({ id, area, run });
const throwsWith = (fn, type, re) => assert.throws(fn, e => e instanceof type && (!re || re.test(e.message)));

// --- text: csv ---------------------------------------------------------------------------------
c('csv-plain', 'text', m => assert.deepEqual(m.csv.parseCsv('a,b\nc,d'), [['a', 'b'], ['c', 'd']]));
c('csv-quoted-delimiter', 'text', m => assert.deepEqual(m.csv.parseCsv('"a,b",c'), [['a,b', 'c']]));
c('csv-doubled-quote', 'text', m => assert.deepEqual(m.csv.parseCsv('"say ""hi""",x'), [['say "hi"', 'x']]));
c('csv-quoted-line-break', 'text', m => assert.deepEqual(m.csv.parseCsv('"one\ntwo",z\r\nq,"r\r\ns"'), [['one\ntwo', 'z'], ['q', 'r\r\ns']]));
c('csv-crlf-and-final-break', 'text', m => assert.deepEqual(m.csv.parseCsv('a,b\r\nc,d\r\n'), [['a', 'b'], ['c', 'd']]));
c('csv-final-lf', 'text', m => assert.deepEqual(m.csv.parseCsv('x\n'), [['x']]));
c('csv-blank-line', 'text', m => assert.deepEqual(m.csv.parseCsv('a\n\nb'), [['a'], [''], ['b']]));
c('csv-empty-text', 'text', m => assert.deepEqual(m.csv.parseCsv(''), []));
c('csv-empty-fields', 'text', m => assert.deepEqual(m.csv.parseCsv(',a,'), [['', 'a', '']]));
c('csv-quoted-empty', 'text', m => assert.deepEqual(m.csv.parseCsv('"",x'), [['', 'x']]));
c('csv-inner-quote', 'text', m => assert.deepEqual(m.csv.parseCsv('ab"c,d'), [['ab"c', 'd']]));
c('csv-unterminated', 'text', m => throwsWith(() => m.csv.parseCsv('a,"bc'), Error, /unterminated/));
c('csv-delimiter-option', 'text', m => assert.deepEqual(m.csv.parseCsv('a;"b;c";d,e', { delimiter: ';' }), [['a', 'b;c', 'd,e']]));
c('tocsv-plain', 'text', m => assert.equal(m.csv.toCsv([['a', 'b'], ['c', 'd']]), 'a,b\r\nc,d'));
c('tocsv-quoting', 'text', m => assert.equal(m.csv.toCsv([['a,b', 'say "hi"', 'x\ny', 'p\rq', 'plain']]), '"a,b","say ""hi""","x\ny","p\rq",plain'));
c('tocsv-value-types', 'text', m => assert.equal(m.csv.toCsv([[1, true, null, undefined, 0, '']]), '1,true,,,0,'));
c('tocsv-empty', 'text', m => assert.equal(m.csv.toCsv([]), ''));
c('tocsv-delimiter-option', 'text', m => assert.equal(m.csv.toCsv([['a;b', 'c,d']], { delimiter: ';' }), '"a;b";c,d'));
c('tocsv-round-trip', 'text', m => {
  const rows = [['x', 'y "z"'], ['1\n2', '']];
  assert.deepEqual(m.csv.parseCsv(m.csv.toCsv(rows)), rows);
});
c('objects-basic', 'text', m => assert.deepEqual(m.csv.parseCsvObjects('name,age\nAda,36\nBob,41'), [{ name: 'Ada', age: '36' }, { name: 'Bob', age: '41' }]));
c('objects-trim-header-only', 'text', m => assert.deepEqual(m.csv.parseCsvObjects(' name , age \nAda, 36'), [{ name: 'Ada', age: ' 36' }]));
c('objects-short-row', 'text', m => assert.deepEqual(m.csv.parseCsvObjects('a,b,c\n1'), [{ a: '1', b: '', c: '' }]));
c('objects-long-row', 'text', m => throwsWith(() => m.csv.parseCsvObjects('a,b\n1,2\n1,2\n1,2,3,4,5,6'), Error, /\b3\b/));
c('objects-duplicate-header', 'text', m => throwsWith(() => m.csv.parseCsvObjects('a, a\n1,2'), Error, /duplicate/));
c('objects-no-rows', 'text', m => {
  assert.deepEqual(m.csv.parseCsvObjects(''), []);
  assert.deepEqual(m.csv.parseCsvObjects('a,b'), []);
  assert.deepEqual(m.csv.parseCsvObjects('a,b\n'), []);
});
c('objects-quoted-and-options', 'text', m => {
  assert.deepEqual(m.csv.parseCsvObjects('q\n"x,y"'), [{ q: 'x,y' }]);
  assert.deepEqual(m.csv.parseCsvObjects('a;b\n1;2', { delimiter: ';' }), [{ a: '1', b: '2' }]);
});

// --- text: wrap --------------------------------------------------------------------------------
c('wrap-greedy', 'text', m => assert.equal(m.wrap.wrapText('the quick brown fox', 10), 'the quick\nbrown fox'));
c('wrap-space-runs', 'text', m => assert.equal(m.wrap.wrapText('  a   b  ', 10), 'a b'));
c('wrap-exact-fit', 'text', m => assert.equal(m.wrap.wrapText('abc def', 7), 'abc def'));
c('wrap-input-lines', 'text', m => {
  assert.equal(m.wrap.wrapText('ab cd\n\nef', 2), 'ab\ncd\n\nef');
  assert.equal(m.wrap.wrapText('ab\ncd ef', 5), 'ab\ncd ef');
});
c('wrap-blank-line-of-spaces', 'text', m => assert.equal(m.wrap.wrapText('a\n   \nb', 5), 'a\n\nb'));
c('wrap-long-word', 'text', m => assert.equal(m.wrap.wrapText('abcdefgh', 3), 'abc\ndef\ngh'));
c('wrap-pieces-are-words', 'text', m => assert.equal(m.wrap.wrapText('abcd e', 3), 'abc\nd e'));
c('wrap-bad-width', 'text', m => {
  for (const w of [0, -1, 2.5, '3']) throwsWith(() => m.wrap.wrapText('a b', w), RangeError);
});
c('truncate-short', 'text', m => {
  assert.equal(m.wrap.truncate('hello', 5), 'hello');
  assert.equal(m.wrap.truncate('', 3), '');
});
c('truncate-at-space', 'text', m => assert.equal(m.wrap.truncate('the quick brown fox', 12), 'the quick…'));
c('truncate-mid-word', 'text', m => assert.equal(m.wrap.truncate('a verylongword', 8), 'a veryl…'));
c('truncate-space-before-half', 'text', m => assert.equal(m.wrap.truncate('ab cdefghijk', 10), 'ab cdefgh…'));
c('truncate-space-at-half', 'text', m => assert.equal(m.wrap.truncate('abcde fghijkl', 10), 'abcde…'));
c('truncate-trailing-spaces', 'text', m => assert.equal(m.wrap.truncate('ab    cdefgh', 7), 'ab…'));
c('truncate-max-one', 'text', m => assert.equal(m.wrap.truncate('abc', 1), '…'));
c('truncate-bad-max', 'text', m => {
  for (const x of [0, 1.5, -2]) throwsWith(() => m.wrap.truncate('abc', x), RangeError);
});

// --- time: intervals ---------------------------------------------------------------------------
c('merge-overlap', 'time', m => assert.deepEqual(m.intervals.mergeIntervals([[5, 10], [1, 3], [2, 6]]), [[1, 10]]));
c('merge-touching', 'time', m => assert.deepEqual(m.intervals.mergeIntervals([[0, 10], [10, 20]]), [[0, 20]]));
c('merge-separate-sorted', 'time', m => assert.deepEqual(m.intervals.mergeIntervals([[20, 30], [0, 10]]), [[0, 10], [20, 30]]));
c('merge-contained', 'time', m => assert.deepEqual(m.intervals.mergeIntervals([[0, 100], [10, 20]]), [[0, 100]]));
c('merge-empty', 'time', m => assert.deepEqual(m.intervals.mergeIntervals([]), []));
c('merge-no-mutation', 'time', m => {
  const input = [[3, 8], [1, 4]];
  const out = m.intervals.mergeIntervals(input);
  assert.deepEqual(input, [[3, 8], [1, 4]]);
  out[0][1] = 99;
  assert.deepEqual(input, [[3, 8], [1, 4]]);
});
// Unsorted on purpose: code that sorts first and then validates reports index 1, not 2.
c('merge-invalid-index', 'time', m => throwsWith(() => m.intervals.mergeIntervals([[40, 50], [0, 10], [30, 30], [20, 15]]), RangeError, /\b2\b/));
c('free-basic', 'time', m => assert.deepEqual(m.intervals.freeSlots([[60, 120]], 0, 180), [[0, 60], [120, 180]]));
c('free-overlapping-busy', 'time', m => assert.deepEqual(m.intervals.freeSlots([[10, 30], [20, 40], [50, 60]], 0, 100), [[0, 10], [40, 50], [60, 100]]));
c('free-busy-outside-day', 'time', m => assert.deepEqual(m.intervals.freeSlots([[-50, 10], [90, 200], [300, 400]], 0, 100), [[10, 90]]));
c('free-min-length', 'time', m => assert.deepEqual(m.intervals.freeSlots([[10, 20], [25, 50]], 0, 60, 10), [[0, 10], [50, 60]]));
c('free-touching-busy', 'time', m => assert.deepEqual(m.intervals.freeSlots([[10, 20], [20, 30]], 0, 40), [[0, 10], [30, 40]]));
c('free-fully-busy', 'time', m => assert.deepEqual(m.intervals.freeSlots([[0, 100]], 0, 100), []));
c('free-empty-day', 'time', m => {
  assert.deepEqual(m.intervals.freeSlots([], 50, 50), []);
  assert.deepEqual(m.intervals.freeSlots([[0, 10]], 60, 50), []);
  assert.deepEqual(m.intervals.freeSlots([], 0, 30), [[0, 30]]);
});
c('free-no-mutation', 'time', m => {
  const busy = [[30, 40], [10, 20]];
  m.intervals.freeSlots(busy, 0, 50);
  assert.deepEqual(busy, [[30, 40], [10, 20]]);
});
c('covered-overlap', 'time', m => assert.equal(m.intervals.coveredMinutes([[0, 10], [5, 15], [20, 25]]), 20));
c('covered-empty', 'time', m => assert.equal(m.intervals.coveredMinutes([]), 0));
c('covered-invalid', 'time', m => {
  throwsWith(() => m.intervals.coveredMinutes([[5, 1]]), RangeError);
  throwsWith(() => m.intervals.freeSlots([[5, 1]], 0, 10), RangeError);
});

// --- time: recur -------------------------------------------------------------------------------
c('weekday-known', 'time', m => {
  assert.equal(m.recur.weekday('2024-02-29'), 4);
  assert.equal(m.recur.weekday('2000-01-01'), 6);
  assert.equal(m.recur.weekday('1970-01-04'), 0);
});
c('weekday-invalid', 'time', m => {
  for (const d of ['2023-02-29', '2024-13-01', '24-01-01']) throwsWith(() => m.recur.weekday(d), RangeError);
});
c('addmonths-basic', 'time', m => assert.equal(m.recur.addMonths('2024-01-15', 1), '2024-02-15'));
c('addmonths-clamp', 'time', m => {
  assert.equal(m.recur.addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(m.recur.addMonths('2023-01-31', 1), '2023-02-28');
});
c('addmonths-over-year', 'time', m => assert.equal(m.recur.addMonths('2024-11-30', 3), '2025-02-28'));
c('addmonths-negative', 'time', m => {
  assert.equal(m.recur.addMonths('2024-03-31', -1), '2024-02-29');
  assert.equal(m.recur.addMonths('2024-01-10', -13), '2022-12-10');
});
c('addmonths-zero', 'time', m => assert.equal(m.recur.addMonths('2024-05-05', 0), '2024-05-05'));
c('addmonths-invalid', 'time', m => throwsWith(() => m.recur.addMonths('2024-02-30', 1), RangeError));
c('weekly-basic', 'time', m => assert.deepEqual(
  m.recur.weeklyOccurrences({ start: '2024-09-02', weekdays: [1, 3] }, '2024-09-01', '2024-09-14'),
  ['2024-09-02', '2024-09-04', '2024-09-09', '2024-09-11']));
c('weekly-interval-from-start-week', 'time', m => assert.deepEqual(
  m.recur.weeklyOccurrences({ start: '2024-09-04', weekdays: [1, 5], interval: 2 }, '2024-09-01', '2024-09-30'),
  ['2024-09-06', '2024-09-16', '2024-09-20', '2024-09-30']));
c('weekly-from-long-after-start', 'time', m => assert.deepEqual(
  m.recur.weeklyOccurrences({ start: '2024-01-01', weekdays: [0], interval: 3 }, '2024-09-01', '2024-09-30'),
  ['2024-09-08', '2024-09-29']));
c('weekly-except', 'time', m => assert.deepEqual(
  m.recur.weeklyOccurrences({ start: '2024-09-02', weekdays: [1], except: ['2024-09-09'] }, '2024-09-01', '2024-09-23'),
  ['2024-09-02', '2024-09-16', '2024-09-23']));
c('weekly-inclusive-ends', 'time', m => assert.deepEqual(
  m.recur.weeklyOccurrences({ start: '2024-09-02', weekdays: [1] }, '2024-09-09', '2024-09-16'),
  ['2024-09-09', '2024-09-16']));
c('weekly-year-boundary', 'time', m => assert.deepEqual(
  m.recur.weeklyOccurrences({ start: '2024-12-25', weekdays: [3], interval: 2 }, '2024-12-01', '2025-01-31'),
  ['2024-12-25', '2025-01-08', '2025-01-22']));
c('weekly-from-after-to', 'time', m => assert.deepEqual(
  m.recur.weeklyOccurrences({ start: '2024-09-02', weekdays: [1] }, '2024-09-20', '2024-09-10'), []));
c('weekly-errors', 'time', m => {
  const rule = { start: '2024-09-02', weekdays: [1] };
  const bad = [
    { ...rule, interval: 0 }, { ...rule, interval: 1.5 }, { ...rule, weekdays: [] },
    { ...rule, weekdays: [7] }, { ...rule, start: '2024-02-30' },
  ];
  for (const r of bad) throwsWith(() => m.recur.weeklyOccurrences(r, '2024-09-01', '2024-09-30'), RangeError);
  throwsWith(() => m.recur.weeklyOccurrences(rule, '2024-02-30', '2024-09-30'), RangeError);
  throwsWith(() => m.recur.weeklyOccurrences(rule, '2024-09-01', '2024-13-01'), RangeError);
});

// --- query: filter -----------------------------------------------------------------------------
const f = (m, expr, rec) => m.filter.compileFilter(expr)(rec);
const failsAt = (m, expr, index) => throwsWith(() => m.filter.compileFilter(expr), SyntaxError, new RegExp(`\\b${index}\\b`));
c('filter-equality', 'query', m => {
  assert.equal(f(m, "status = 'open'", { status: 'open' }), true);
  assert.equal(f(m, "status = 'open'", { status: 'closed' }), false);
});
c('filter-numbers', 'query', m => {
  assert.equal(f(m, 'age >= 18', { age: 18 }), true);
  assert.equal(f(m, 'age >= 18', { age: 17 }), false);
  assert.equal(f(m, 'x < -2.5', { x: -3 }), true);
  assert.equal(f(m, 'x != 0.5', { x: 0.5 }), false);
});
c('filter-and-or-precedence', 'query', m => {
  const e = 'a = 1 or b = 1 and c = 1';
  assert.equal(f(m, e, { a: 1, b: 0, c: 0 }), true);
  assert.equal(f(m, e, { a: 0, b: 1, c: 0 }), false);
  assert.equal(f(m, e, { a: 0, b: 1, c: 1 }), true);
});
c('filter-not-precedence', 'query', m => {
  const e = 'not a = 1 and b = 1';
  assert.equal(f(m, e, { a: 0, b: 1 }), true);
  assert.equal(f(m, e, { a: 1, b: 1 }), false);
  assert.equal(f(m, e, { a: 0, b: 0 }), false);
  assert.equal(f(m, 'not not a = 1', { a: 1 }), true);
});
c('filter-parentheses', 'query', m => {
  assert.equal(f(m, '(a = 1 or b = 1) and c = 1', { a: 1, b: 0, c: 0 }), false);
  assert.equal(f(m, '((a = 1))', { a: 1 }), true);
});
c('filter-keywords-any-case', 'query', m => {
  assert.equal(f(m, 'a = 1 AND b = TRUE', { a: 1, b: true }), true);
  assert.equal(f(m, 'a = 2 Or NoT b = False', { a: 1, b: true }), true);
  assert.equal(f(m, "tags CONTAINS 'x'", { tags: ['x'] }), true);
  assert.equal(f(m, 'a = Null', {}), true);
  assert.equal(f(m, 'order = 1', { order: 1 }), true, 'a field may start with a keyword');
  assert.equal(f(m, 'nullable = 1', { nullable: 1 }), true);
});
c('filter-strict-equality', 'query', m => {
  assert.equal(f(m, 'a = 1', { a: '1' }), false);
  assert.equal(f(m, 'a != 1', { a: '1' }), true);
  assert.equal(f(m, 'a = false', { a: 0 }), false);
});
c('filter-null-and-missing', 'query', m => {
  assert.equal(f(m, 'a = null', {}), true);
  assert.equal(f(m, 'a = null', { a: null }), true);
  assert.equal(f(m, 'a = null', { a: 0 }), false);
  assert.equal(f(m, 'a != null', {}), false);
  assert.equal(f(m, 'a != null', { a: false }), true);
});
c('filter-dotted-fields', 'query', m => {
  assert.equal(f(m, 'user.age > 30', { user: { age: 31 } }), true);
  assert.equal(f(m, 'user.age > 30', { user: null }), false);
  assert.equal(f(m, 'user.age > 30', {}), false);
  assert.equal(f(m, 'user.name = null', { user: null }), true);
  assert.equal(f(m, 'a_1.b2 = 5', { a_1: { b2: 5 } }), true);
});
c('filter-order-needs-same-type', 'query', m => {
  assert.equal(f(m, 'a > 5', { a: '10' }), false);
  assert.equal(f(m, "a < 'm'", { a: 'apple' }), true);
  assert.equal(f(m, "a < 'm'", { a: 5 }), false);
  assert.equal(f(m, 'a >= 0', {}), false);
  assert.equal(f(m, 'a <= 0', { a: null }), false);
});
c('filter-strings-by-code-unit', 'query', m => {
  assert.equal(f(m, "a < 'b'", { a: 'B' }), true);
  assert.equal(f(m, "a > 'Z'", { a: 'a' }), true);
});
c('filter-contains', 'query', m => {
  assert.equal(f(m, "tags contains 'x'", { tags: ['x', 'y'] }), true);
  assert.equal(f(m, "tags contains 'x'", { tags: ['xy'] }), false);
  assert.equal(f(m, "name contains 'li'", { name: 'alice' }), true);
  assert.equal(f(m, 'n contains 1', { n: [1, 2] }), true);
  assert.equal(f(m, 'n contains 1', { n: '1' }), false);
  assert.equal(f(m, 'n contains 1', { n: 5 }), false);
  assert.equal(f(m, "n contains 'a'", {}), false);
});
c('filter-string-escapes', 'query', m => {
  assert.equal(f(m, "s = 'it\\'s'", { s: "it's" }), true);
  assert.equal(f(m, "p = 'a\\\\b'", { p: 'a\\b' }), true);
  assert.equal(f(m, "s = 'a and b'", { s: 'a and b' }), true);
});
c('filter-whitespace', 'query', m => assert.equal(f(m, 'a=1\tand\n b =2', { a: 1, b: 2 }), true));
c('filter-returns-boolean', 'query', m => {
  assert.equal(f(m, "a contains 'x'", { a: 'xyz' }), true);
  assert.equal(f(m, 'a = 1 or b = 1', {}), false);
});
c('filter-error-at-end', 'query', m => {
  failsAt(m, 'a = ', 4);
  failsAt(m, '(a = 1', 6);
  failsAt(m, 'a = 5 and', 9);
});
c('filter-error-at-token', 'query', m => {
  failsAt(m, 'a = 1 b = 7', 6);
  failsAt(m, 'a == 5', 3);
  failsAt(m, 'and = 1', 0);
});
c('filter-error-bad-input', 'query', m => {
  failsAt(m, "a = 'x", 4);
  failsAt(m, 'a ~ 5', 2);
});

// --- query: table ------------------------------------------------------------------------------
const col = (rows, k) => rows.map(r => r[k]);
c('sort-ascending', 'query', m => assert.deepEqual(col(m.table.sortBy([{ n: 3 }, { n: 1 }, { n: 2 }], ['n']), 'n'), [1, 2, 3]));
c('sort-descending', 'query', m => assert.deepEqual(col(m.table.sortBy([{ n: 3 }, { n: 1 }, { n: 2 }], ['-n']), 'n'), [3, 2, 1]));
c('sort-several-keys', 'query', m => assert.deepEqual(
  m.table.sortBy([{ a: 1, b: 2 }, { a: 0, b: 5 }, { a: 1, b: 1 }], ['a', '-b']),
  [{ a: 0, b: 5 }, { a: 1, b: 2 }, { a: 1, b: 1 }]));
c('sort-nulls-last', 'query', m => {
  const rows = [{ n: 2, id: 'a' }, { n: null, id: 'b' }, { id: 'c' }, { n: 1, id: 'd' }];
  assert.deepEqual(col(m.table.sortBy(rows, ['n']), 'id'), ['d', 'a', 'b', 'c']);
  assert.deepEqual(col(m.table.sortBy(rows, ['-n']), 'id'), ['a', 'd', 'b', 'c']);
});
c('sort-stable', 'query', m => {
  const rows = [{ k: 1, id: 'a' }, { k: 0, id: 'b' }, { k: 1, id: 'c' }, { k: 0, id: 'd' }];
  assert.deepEqual(col(m.table.sortBy(rows, ['k']), 'id'), ['b', 'd', 'a', 'c']);
  assert.deepEqual(col(m.table.sortBy(rows, ['-k']), 'id'), ['a', 'c', 'b', 'd']);
});
c('sort-mixed-types', 'query', m => {
  const rows = [{ v: 'b' }, { v: 2 }, { v: 'a' }, { v: 10 }];
  assert.deepEqual(col(m.table.sortBy(rows, ['v']), 'v'), [2, 10, 'a', 'b']);
  assert.deepEqual(col(m.table.sortBy(rows, ['-v']), 'v'), ['b', 'a', 10, 2]);
});
c('sort-strings-by-code-unit', 'query', m => assert.deepEqual(col(m.table.sortBy([{ s: 'b' }, { s: 'B' }, { s: 'a' }], ['s']), 's'), ['B', 'a', 'b']));
c('sort-no-mutation', 'query', m => {
  const rows = [{ n: 2 }, { n: 1 }];
  const out = m.table.sortBy(rows, ['n']);
  assert.deepEqual(rows, [{ n: 2 }, { n: 1 }]);
  assert.notEqual(out, rows);
});
c('sort-bad-keys', 'query', m => {
  throwsWith(() => m.table.sortBy([{ n: 1 }], []), TypeError);
  throwsWith(() => m.table.sortBy([{ n: 1 }], undefined), TypeError);
});
c('group-count-sum', 'query', m => assert.deepEqual(
  m.table.groupBy([{ c: 'x', v: 1 }, { c: 'y', v: 2 }, { c: 'x', v: 3 }], 'c', { n: ['count'], total: ['sum', 'v'] }),
  [{ c: 'x', n: 2, total: 4 }, { c: 'y', n: 1, total: 2 }]));
c('group-first-appearance-order', 'query', m => assert.deepEqual(
  col(m.table.groupBy([{ g: 'b' }, { g: 'a' }, { g: 'b' }, { g: 'c' }], 'g', { n: ['count'] }), 'g'), ['b', 'a', 'c']));
c('group-null-key', 'query', m => assert.deepEqual(
  m.table.groupBy([{ c: null, v: 1 }, { v: 2 }, { c: undefined, v: 3 }, { c: 'z', v: 4 }], 'c', { n: ['count'] }),
  [{ c: null, n: 3 }, { c: 'z', n: 1 }]));
c('group-strict-keys', 'query', m => assert.deepEqual(
  m.table.groupBy([{ k: 1 }, { k: '1' }], 'k', { n: ['count'] }), [{ k: 1, n: 1 }, { k: '1', n: 1 }]));
c('group-number-aggregates', 'query', m => assert.deepEqual(
  m.table.groupBy([{ g: 1, v: 4 }, { g: 1, v: 'x' }, { g: 1, v: 10 }, { g: 1, v: NaN }, { g: 1, v: null }], 'g',
    { lo: ['min', 'v'], hi: ['max', 'v'], mean: ['avg', 'v'], s: ['sum', 'v'] }),
  [{ g: 1, lo: 4, hi: 10, mean: 7, s: 14 }]));
c('group-no-numbers', 'query', m => assert.deepEqual(
  m.table.groupBy([{ g: 'a', v: 'x' }], 'g', { lo: ['min', 'v'], hi: ['max', 'v'], mean: ['avg', 'v'], s: ['sum', 'v'] }),
  [{ g: 'a', lo: null, hi: null, mean: null, s: 0 }]));
c('group-distinct', 'query', m => assert.deepEqual(
  m.table.groupBy([{ g: 1, t: 'a' }, { g: 1, t: 'b' }, { g: 1, t: 'a' }, { g: 1, t: null }, { g: 1 }, { g: 1, t: 1 }, { g: 1, t: '1' }], 'g', { d: ['distinct', 't'] }),
  [{ g: 1, d: 4 }]));
c('group-unknown-op', 'query', m => throwsWith(() => m.table.groupBy([{ g: 1, v: 1 }], 'g', { m: ['median', 'v'] }), Error, /median/));
c('group-no-mutation-and-empty', 'query', m => {
  const rows = [{ g: 1, v: 2 }];
  m.table.groupBy(rows, 'g', { s: ['sum', 'v'] });
  assert.deepEqual(rows, [{ g: 1, v: 2 }]);
  assert.deepEqual(m.table.groupBy([], 'g', { n: ['count'] }), []);
});

export const CASES = cases;
