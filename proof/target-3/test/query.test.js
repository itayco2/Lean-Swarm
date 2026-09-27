import assert from 'node:assert/strict';
import test from 'node:test';
import { compileFilter } from '../src/filter.js';
import { groupBy, sortBy } from '../src/table.js';

test('compileFilter: equality, numbers and AND', () => {
  const open = compileFilter("status = 'open' and n > 2");
  assert.equal(open({ status: 'open', n: 3 }), true);
  assert.equal(open({ status: 'open', n: 1 }), false);
});

test('compileFilter: OR', () => {
  assert.equal(compileFilter('a = 1 or b = 1')({ a: 0, b: 1 }), true);
});

test('sortBy sorts ascending and descending', () => {
  const rows = [{ n: 3 }, { n: 1 }, { n: 2 }];
  assert.deepEqual(sortBy(rows, ['n']).map(r => r.n), [1, 2, 3]);
  assert.deepEqual(sortBy(rows, ['-n']).map(r => r.n), [3, 2, 1]);
});

test('groupBy counts and sums', () => {
  assert.deepEqual(
    groupBy([{ c: 'x', v: 1 }, { c: 'y', v: 2 }, { c: 'x', v: 3 }], 'c', { n: ['count'], total: ['sum', 'v'] }),
    [{ c: 'x', n: 2, total: 4 }, { c: 'y', n: 1, total: 2 }],
  );
});
