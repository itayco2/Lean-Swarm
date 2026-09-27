import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { aggregate, bootstrapDiff, markdownSummary, pp, unusable } from '../proof/summarize.js';

const KEY = { window: 3, bugs: [{ id: 'a' }, { id: 'b' }] };
const row = (variant, found, read, turns, cost, extra = {}) => ({
  variant, run: `wf_${variant}_${read}`, found, reported: true, other: 0, decoyHits: 0,
  touchedKey: false, read, turns, cost, minutes: 3, firstTurn: variant === 'plain' ? 52000 : 19000, ...extra,
});

test('bootstrapDiff: exact difference, seeded interval, and nothing to compare', () => {
  const same = bootstrapDiff([1, 1, 1], [1, 1, 1]);
  assert.deepEqual(same, { diff: 0, low: 0, high: 0 });
  const r1 = bootstrapDiff([1, 0.5, 1], [0.5, 0.5, 1]);
  const r2 = bootstrapDiff([1, 0.5, 1], [0.5, 0.5, 1]);
  assert.deepEqual(r1, r2, 'same seed, same interval');
  assert.ok(Math.abs(r1.diff - (2 / 3 - 5 / 6)) < 1e-12);
  assert.ok(r1.low <= r1.diff && r1.diff <= r1.high);
  assert.equal(bootstrapDiff([], [1]), null);
});

test('pp never prints floating-point noise as -0.0', () => {
  assert.equal(pp(-1e-17), '+0.0');
  assert.equal(pp(0), '+0.0');
  assert.equal(pp(-0.019), '-1.9');
  assert.equal(pp(0.25), '+25.0');
});

test('aggregate groups by variant, counts bugs and compares with the baseline', () => {
  const rows = [
    row('plain', ['a', 'b'], 6e6, 60, 5),
    row('plain', ['a', 'b'], 7e6, 70, 6),
    row('lean', ['a'], 4e6, 60, 4.5),
    row('lean', ['a', 'b'], 5e6, 65, 4.5, { other: 2, decoyHits: 1 }),
  ];
  const agg = aggregate(rows, KEY);
  const [plain, lean] = agg.variants;
  assert.deepEqual([plain.name, lean.name], ['plain', 'lean']);
  assert.deepEqual(plain.perBug, { a: 2, b: 2 });
  assert.deepEqual(lean.perBug, { a: 2, b: 1 });
  assert.equal(lean.recall, 0.75);
  assert.equal(lean.read, 4.5e6);
  assert.equal(lean.perTurn, 9e6 / 125);
  assert.equal(lean.turns, 62.5);
  assert.equal(lean.other, 1);
  assert.equal(lean.decoyHits, 1);
  assert.equal(plain.recallVsBase, null);
  assert.equal(lean.recallVsBase.diff, -0.25);
  const md = markdownSummary(agg, KEY);
  assert.match(md, /\| lean \| 2 \| 1\.5\/2 \(1-2\) \| -25\.0 \(/);
  assert.match(md, /\| 4\.50M \(-31%\) \|/);
  assert.match(md, /\| b \| 2\/2 \| 1\/2 \|/);
});

test('ambiguous bugs stay out of the main recall but show per bug and in all-bug recall', () => {
  const key = { window: 3, bugs: [{ id: 'a' }, { id: 'b' }, { id: 'amb', ambiguous: 'the JSDoc does not say' }] };
  const agg = aggregate([row('plain', ['a', 'b', 'amb'], 1e6, 10, 1), row('lean', ['a', 'b'], 1e6, 10, 1)], key);
  const [plain, lean] = agg.variants;
  assert.equal(agg.clearBugs, 2);
  assert.deepEqual([plain.recall, lean.recall], [1, 1]);
  assert.deepEqual([plain.recallAll, lean.recallAll], [1, 2 / 3]);
  assert.equal(lean.recallVsBase.diff, 0);
  const md = markdownSummary(agg, key);
  assert.match(md, /Bugs found \(of 2 unambiguous; mean, range\)/);
  assert.match(md, /\| amb \(ambiguous\) \| 1\/1 \| 0\/1 \|/);
  assert.match(md, /amb is ambiguous: the JSDoc does not say\./);
});

test('flags runs without a report, that touched the key, or that were left out', () => {
  const agg = aggregate(
    [row('plain', [], 1e6, 10, 1, { reported: false }), row('plain', ['a'], 1e6, 10, 1, { touchedKey: true })],
    KEY, 'plain', { plain: { 'session error': 2 }, omit: { 'no transcript dir': 1 } },
  );
  const md = markdownSummary(agg, KEY);
  assert.match(md, /plain: 1 runs without a report/);
  assert.match(md, /plain: 1 runs touched the answer key/);
  assert.match(md, /plain: 2 runs left out \(session error\)/);
  assert.match(md, /omit: 1 runs left out \(no transcript dir\)/);
  assert.equal(agg.variants.find(v => v.name === 'omit').runs, 0);
  assert.match(md, /\| omit \| 0 \| all runs left out \|( - \|){10}\n/, 'no zero recall or -100% for an empty variant');
  assert.doesNotMatch(md, /-100%/);
  assert.match(md, /\| a \| 1\/2 \| - \|/);
});

test('unusable explains why a run cannot be scored', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unusable-'));
  assert.equal(unusable({ isError: true, transcriptDir: dir }), 'session error');
  assert.equal(unusable({ transcriptDir: null }), 'no transcript dir');
  assert.equal(unusable({ transcriptDir: path.join(dir, 'missing') }), 'no transcript dir');
  assert.equal(unusable({ transcriptDir: dir }), 'no agent transcripts');
  fs.writeFileSync(path.join(dir, 'agent-a1.jsonl'), '{}\n');
  assert.equal(unusable({ transcriptDir: dir, variant: 'plain' }), null);
  // The transcripts' agents are default ones, so a run recorded as lean doesn't match them.
  assert.equal(unusable({ transcriptDir: dir, variant: 'lean' }), 'transcripts show a different variant');
  fs.writeFileSync(path.join(dir, 'agent-a1.meta.json'), JSON.stringify({ agentType: 'lean-swarm:reviewer' }));
  assert.equal(unusable({ transcriptDir: dir, variant: 'omit', workflowVariant: 'lean' }), null, 'an extra variant runs as lean');
});
