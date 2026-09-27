import assert from 'node:assert/strict';
import test from 'node:test';
import { coveredMinutes, freeSlots, mergeIntervals } from '../src/intervals.js';
import { addMonths, weekday, weeklyOccurrences } from '../src/recur.js';

test('mergeIntervals merges overlapping intervals', () => {
  assert.deepEqual(mergeIntervals([[5, 10], [1, 3], [2, 6]]), [[1, 10]]);
});

test('freeSlots finds the gaps in a day', () => {
  assert.deepEqual(freeSlots([[60, 120]], 0, 180), [[0, 60], [120, 180]]);
});

test('coveredMinutes counts overlaps once', () => {
  assert.equal(coveredMinutes([[0, 10], [5, 15]]), 15);
});

test('weekday: 2024-09-01 was a Sunday', () => {
  assert.equal(weekday('2024-09-01'), 0);
});

test('addMonths moves to the same day of a later month', () => {
  assert.equal(addMonths('2024-01-15', 1), '2024-02-15');
});

test('weeklyOccurrences lists a weekly event', () => {
  assert.deepEqual(
    weeklyOccurrences({ start: '2024-09-02', weekdays: [1] }, '2024-09-01', '2024-09-16'),
    ['2024-09-02', '2024-09-09', '2024-09-16'],
  );
});
