import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCsv, parseCsvObjects, toCsv } from '../src/csv.js';
import { truncate, wrapText } from '../src/wrap.js';

test('parseCsv splits rows and fields', () => {
  assert.deepEqual(parseCsv('a,b\nc,d'), [['a', 'b'], ['c', 'd']]);
});

test('parseCsv keeps a delimiter inside quotes', () => {
  assert.deepEqual(parseCsv('"a,b",c'), [['a,b', 'c']]);
});

test('toCsv joins fields and rows', () => {
  assert.equal(toCsv([['a', 'b'], ['c', 'd']]), 'a,b\r\nc,d');
});

test('parseCsvObjects keys rows by the header', () => {
  assert.deepEqual(parseCsvObjects('name,age\nAda,36'), [{ name: 'Ada', age: '36' }]);
});

test('wrapText wraps greedily', () => {
  assert.equal(wrapText('the quick brown fox', 10), 'the quick\nbrown fox');
});

test('truncate keeps short text and cuts long text at a space', () => {
  assert.equal(truncate('hello', 5), 'hello');
  assert.equal(truncate('the quick brown fox', 12), 'the quick…');
});
