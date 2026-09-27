// Proof round 4 (date-fns with planted bugs). date-fns isn't in this repo, so these tests use a
// synthetic file set; setup.js itself refuses to build a target whose planted lines don't match
// proof/grading/key-4.json.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { scoreFindings } from '../proof/score.js';
import { BUGS, DECOYS, keyFor, plant, SYMPTOMS, vendorBabel } from '../proof/target-4/setup.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY4 = JSON.parse(fs.readFileSync(path.join(ROOT, 'proof', 'grading', 'key-4.json'), 'utf8'));

// One file per bug, decoy or symptom path, holding every line those need, after some filler.
function syntheticFiles() {
  const files = {};
  const needed = [
    ...BUGS.map(b => ({ file: b.file, text: b.find })),
    ...DECOYS.map(d => ({ file: d.file, text: d.needle })),
    ...SYMPTOMS.map(s => ({ file: s.file, text: s.needle })),
  ];
  for (const x of needed) {
    files[x.file] = files[x.file] || ['// header', 'var a = 1;'];
    files[x.file].push(x.text, '// between');
  }
  return Object.fromEntries(Object.entries(files).map(([f, lines]) => [f, lines.join('\n')]));
}

test('key-4 lists exactly the planted bugs and decoys of setup.js', () => {
  assert.deepEqual(KEY4.bugs.map(b => [b.id, b.lens, b.file]), BUGS.map(b => [b.id, b.lens, b.file]));
  assert.deepEqual(KEY4.decoys.map(d => [d.id, d.file, d.lines[1] - d.lines[0] + 1]), DECOYS.map(d => [d.id, d.file, d.span]));
  assert.equal(new Set(BUGS.map(b => b.id)).size, BUGS.length);
  for (const b of BUGS) assert.notEqual(b.find, b.replace, b.id);
});

test('plant swaps each bug line once and refuses a line that is missing or repeated', () => {
  const files = syntheticFiles();
  const planted = plant(files);
  for (const b of BUGS) {
    const lines = planted[b.file].split('\n');
    assert.ok(lines.includes(b.replace), b.id);
    assert.ok(!lines.includes(b.find), b.id);
    assert.equal(lines.length, files[b.file].split('\n').length, `${b.id} keeps the line count`);
  }
  const b = BUGS[0];
  assert.throws(() => plant({ ...files, [b.file]: 'nothing here' }), /found it 0 times/);
  assert.throws(() => plant({ ...files, [b.file]: `${b.find}\n${b.find}` }), /found it 2 times/);
});

test('keyFor points each bug at its planted line and each decoy at its range', () => {
  const planted = plant(syntheticFiles());
  const key = keyFor(planted);
  for (const bug of key.bugs) {
    const b = BUGS.find(x => x.id === bug.id);
    assert.equal(planted[bug.file].split('\n')[bug.line - 1], b.replace, bug.id);
  }
  for (const d of key.decoys) {
    const spec = DECOYS.find(x => x.id === d.id);
    assert.equal(planted[d.file].split('\n')[d.lines[0] - 1], spec.needle, d.id);
  }
  assert.equal(key.window, 3);
});

test('vendorBabel copies the helpers the build needs, with their imports, and rewrites paths in place', () => {
  const babel = fs.mkdtempSync(path.join(os.tmpdir(), 'babel-'));
  fs.mkdirSync(path.join(babel, 'helpers', 'esm'), { recursive: true });
  fs.writeFileSync(path.join(babel, 'helpers', 'esm', 'typeof.js'), 'export default function t() {}\n');
  fs.writeFileSync(path.join(babel, 'helpers', 'esm', 'createSuper.js'), 'import g from "./getPrototypeOf.js";\nexport default g;\n');
  fs.writeFileSync(path.join(babel, 'helpers', 'esm', 'getPrototypeOf.js'), 'export default Object.getPrototypeOf;\n');
  const out = vendorBabel({
    'toDate/index.js': 'import _typeof from "@babel/runtime/helpers/esm/typeof";\nline2',
    '_lib/format/x/index.js': 'import s from "@babel/runtime/helpers/esm/createSuper";',
    'index.js': 'export {};',
  }, babel);
  assert.equal(out['toDate/index.js'], 'import _typeof from "../_babel/typeof.js";\nline2');
  assert.equal(out['_lib/format/x/index.js'], 'import s from "../../../_babel/createSuper.js";');
  assert.deepEqual(Object.keys(out).filter(k => k.startsWith('_babel/')).sort(), ['_babel/createSuper.js', '_babel/getPrototypeOf.js', '_babel/typeof.js']);
});

test('scoring: a decoy or a toDate symptom inside a bug window is never credited as that bug', () => {
  // addMonths' decoy (44) sits 2 lines from its planted bug (46); eachDayOfInterval 54 and
  // startOfWeek 45 are toDate symptoms next to other planted bugs.
  const near = scoreFindings([
    { file: 'addMonths/index.js', line: 44 },
    { file: 'eachDayOfInterval/index.js', line: 54 },
    { file: 'startOfWeek/index.js', line: 45 },
  ], KEY4);
  assert.deepEqual(near.matched, []);
  assert.deepEqual(near.decoyHits, ['addmonths-end-of-month'], 'a symptom is not a false alarm');
  assert.equal(near.symptomHits, 2);
  assert.equal(near.other.length, 3);
  const both = scoreFindings([{ file: 'addMonths/index.js', line: 46 }, { file: 'addMonths/index.js', line: 44 }], KEY4);
  assert.deepEqual(both.matched.map(m => m.bug), ['addmonths-no-clamp']);
  assert.deepEqual(both.decoyHits, ['addmonths-end-of-month']);
});

test('key-4 marks only the addMonths bug as ambiguous, and no decoy or symptom covers a bug line', () => {
  assert.deepEqual(KEY4.bugs.filter(b => b.ambiguous).map(b => b.id), ['addmonths-no-clamp']);
  assert.doesNotThrow(() => keyFor(plant(syntheticFiles())));
  for (const r of [...KEY4.decoys, ...KEY4.symptoms]) {
    assert.ok(!KEY4.bugs.some(b => b.file === r.file && b.line >= r.lines[0] && b.line <= r.lines[1]), `${r.id || r.of} ${r.file}`);
  }
});

test('key-4 lists the toDate symptoms, and keyFor refuses a symptom that covers a bug line', () => {
  assert.deepEqual(KEY4.symptoms.map(s => [s.of, s.file]), SYMPTOMS.map(s => [s.of, s.file]));
  assert.deepEqual(KEY4.symptoms.map(s => s.lines[1] - s.lines[0] + 1), SYMPTOMS.map(s => s.span));
  const planted = plant(syntheticFiles());
  const bug = BUGS.find(x => x.id === 'startofweek-same-day');
  const sym = SYMPTOMS.find(s => s.file === bug.file);
  const others = planted[bug.file].split('\n').filter(l => l !== bug.replace && l !== sym.needle);
  const covering = ['// header', sym.needle, bug.replace, ...others.slice(1)].join('\n');
  assert.throws(() => keyFor({ ...planted, [bug.file]: covering }), /symptom of todate-no-clone covers planted bug startofweek-same-day/);
});

test('scoring: a path must end with the key path, and a bare name must be unique in the key', () => {
  const key = { window: 3, bugs: [{ id: 'a', file: 'toDate/index.js', line: 40 }, { id: 'b', file: 'nextDay/index.js', line: 30 }, { id: 'c', file: 'src/cart.js', line: 10 }] };
  const s = scoreFindings([
    { file: 'index.js', line: 40 },
    { file: 'esm/nextDay/index.js', line: 31 },
    { file: 'getDay/index.js', line: 30 },
    { file: 'cart.js', line: 11 },
  ], key);
  assert.deepEqual(s.matched.map(m => m.bug), ['b', 'c']);
  assert.deepEqual(s.missed, ['a']);
  assert.deepEqual(s.other.map(f => f.file), ['index.js', 'getDay/index.js']);
});
