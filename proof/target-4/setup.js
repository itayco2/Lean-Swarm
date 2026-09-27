#!/usr/bin/env node
// Build proof round 4's target: the date-fns 2.30.0 ES-module build with planted bugs.
//   node proof/target-4/setup.js --from <unpacked date-fns 2.30.0 package> --out <dir>
// Get the package with `npm install date-fns@2.30.0` in a scratch folder (that also installs the
// @babel/runtime it imports), or point --from at any node_modules/date-fns of that version. The target is large (about 15k lines), so reviewers have
// to search it rather than read it whole, like real audits. date-fns is MIT licensed; its license
// is copied into the target.
// Every planted bug and decoy is checked against proof/grading/key-4.json; the script fails if the
// source doesn't match, so a run can't be scored against the wrong lines.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const KEY_FILE = path.join(HERE, '..', 'grading', 'key-4.json');
export const VERSION = '2.30.0';

// Each bug replaces one whole line, so no other line moves.
export const BUGS = [
  { id: 'todate-no-clone', lens: 'state', file: 'toDate/index.js',
    find: '    return new Date(argument.getTime());', replace: '    return argument;' },
  { id: 'startofweek-same-day', lens: 'logic', file: 'startOfWeek/index.js',
    find: '  var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;', replace: '  var diff = (day <= weekStartsOn ? 7 : 0) + day - weekStartsOn;' },
  { id: 'eachday-drops-end', lens: 'logic', file: 'eachDayOfInterval/index.js',
    find: '  while (currentDate.getTime() <= endTime) {', replace: '  while (currentDate.getTime() < endTime) {' },
  { id: 'overlap-inclusive-asymmetric', lens: 'logic', file: 'areIntervalsOverlapping/index.js',
    find: '    return leftStartTime <= rightEndTime && rightStartTime <= leftEndTime;', replace: '    return leftStartTime <= rightEndTime && rightStartTime < leftEndTime;' },
  // The end-of-month rule is only in the code comments; the JSDoc just says "Add the specified number
  // of months", and the task says the JSDoc is the spec. So missing it is defensible. Scored, but
  // reported apart from the unambiguous bugs.
  { id: 'addmonths-no-clamp', lens: 'logic', file: 'addMonths/index.js',
    find: '  if (dayOfMonth >= daysInMonth) {', replace: '  if (dayOfMonth === daysInMonth) {',
    ambiguous: 'the JSDoc does not state the end-of-month rule; only the code comments do' },
  { id: 'nextday-same-day', lens: 'logic', file: 'nextDay/index.js',
    find: '  if (delta <= 0) delta += 7;', replace: '  if (delta < 0) delta += 7;' },
  { id: 'leapyear-400', lens: 'logic', file: 'isLeapYear/index.js',
    find: '  return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;', replace: '  return year % 4 === 0 && year % 100 !== 0;' },
  { id: 'quarter-january', lens: 'logic', file: 'getQuarter/index.js',
    find: '  var quarter = Math.floor(date.getMonth() / 3) + 1;', replace: '  var quarter = Math.ceil(date.getMonth() / 3);' },
  { id: 'isoday-sunday', lens: 'logic', file: 'getISODay/index.js',
    find: '  if (day === 0) {', replace: '  if (day === 7) {' },
  { id: 'withininterval-end', lens: 'logic', file: 'isWithinInterval/index.js',
    find: '  return time >= startTime && time <= endTime;', replace: '  return time >= startTime && time < endTime;' },
  { id: 'endofweek-nan', lens: 'input', file: 'endOfWeek/index.js',
    find: '  if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {', replace: '  if (weekStartsOn < 0 || weekStartsOn > 6) {' },
  { id: 'eachhour-step-nan', lens: 'input', file: 'eachHourOfInterval/index.js',
    find: "  if (step < 1 || isNaN(step)) throw new RangeError('`options.step` must be a number greater than 1');",
    replace: "  if (step < 1) throw new RangeError('`options.step` must be a number greater than 1');" },
  { id: 'nearestto-range', lens: 'input', file: 'roundToNearestMinutes/index.js',
    find: '  if (nearestTo < 1 || nearestTo > 30) {', replace: '  if (nearestTo < 1 || nearestTo > 60) {' },
];

// Correct code that looks suspicious. A finding inside one is a false alarm.
// `needle` marks the first line; `span` is how many lines the decoy covers.
// Three earlier decoys were dropped after review: the planted toDate bug (no clone) makes them
// wrong, because they return or change the caller's own Date (addMonths' zero-amount return,
// addBusinessDays' weekend fix, eachDayOfInterval's hour reset).
export const DECOYS = [
  { id: 'addmonths-end-of-month', file: 'addMonths/index.js', needle: '  endOfDesiredMonth.setMonth(date.getMonth() + amount + 1, 0);', span: 1 },
  { id: 'closestindex-nan', file: 'closestIndexTo/index.js', needle: '    if (isNaN(Number(currentDate))) {', span: 5 },
  { id: 'calendardays-round', file: 'differenceInCalendarDays/index.js', needle: '  return Math.round((timestampLeft - timestampRight) / MILLISECONDS_IN_DAY);', span: 1 },
  { id: 'tointeger-booleans', file: '_lib/toInteger/index.js', needle: '  if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {', span: 3 },
  { id: 'endofweek-diff', file: 'endOfWeek/index.js', needle: '  var diff = (day < weekStartsOn ? -7 : 0) + 6 - (day - weekStartsOn);', span: 1 },
  { id: 'daysinmonth-day-zero', file: 'getDaysInMonth/index.js', needle: '  var lastDayOfMonth = new Date(0);', span: 3 },
];

// Where the planted toDate bug shows up inside another planted bug's line window: these lines
// change or share the caller's Date only because toDate no longer clones it. A finding there is
// a real effect of the toDate bug, not of its neighbour, so scoring sets it aside rather than
// crediting the neighbouring bug.
export const SYMPTOMS = [
  { of: 'todate-no-clone', file: 'startOfWeek/index.js', needle: '  date.setDate(date.getDate() - diff);', span: 2 },
  { of: 'todate-no-clone', file: 'endOfWeek/index.js', needle: '  var date = toDate(dirtyDate);', span: 1 },
  { of: 'todate-no-clone', file: 'eachDayOfInterval/index.js', needle: '  var currentDate = startDate;', span: 2 },
  { of: 'todate-no-clone', file: 'eachDayOfInterval/index.js', needle: '    dates.push(toDate(currentDate));', span: 3 },
  { of: 'todate-no-clone', file: 'eachHourOfInterval/index.js', needle: '  var currentDate = startDate;', span: 2 },
  { of: 'todate-no-clone', file: 'eachHourOfInterval/index.js', needle: '    dates.push(toDate(currentDate));', span: 1 },
];

const README = `# date-fns 2.30.0 (ES modules)

A copy of the ES-module build of [date-fns](https://date-fns.org) 2.30.0: one folder per function,
each with an \`index.js\`, plus shared helpers in \`_lib/\` and the \`en-US\` locale. MIT licensed (see
LICENSE.md).

The JSDoc on each function is its spec: code that does something different from its JSDoc is a bug.
Code that matches its JSDoc is correct, even if it looks unusual.

Every file is an ES module (\`package.json\` sets \`"type": "module"\`), so you can try a function with,
for example: \`node -e "import('./addDays/index.js').then(m => console.log(m.default(new Date(2024, 0, 1), 3)))"\`
`;

// Which files to keep from the package's esm/ folder: every function and helper, and only the
// en-US locale (the default locale imports it). Types, flow files and the fp/ build are left out.
function keep(rel) {
  const parts = rel.split('/');
  if (!rel.endsWith('.js')) return false;
  if (parts[0] === 'fp' || parts[0] === 'docs') return false;
  if (parts[0] === 'locale') return parts[1] === 'en-US' || parts[1] === '_lib';
  return true;
}

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

// 1-based line of the first line equal to `text` in a file's lines.
const lineOf = (lines, text) => lines.indexOf(text) + 1;

export function plant(files) {
  const out = { ...files };
  for (const b of BUGS) {
    const src = out[b.file];
    if (src === undefined) throw new Error(`${b.id}: ${b.file} is missing`);
    const hits = src.split('\n').filter(l => l === b.find).length;
    if (hits !== 1) throw new Error(`${b.id}: expected the line once in ${b.file}, found it ${hits} times`);
    out[b.file] = src.split('\n').map(l => (l === b.find ? b.replace : l)).join('\n');
  }
  return out;
}

export function keyFor(files) {
  const bugs = BUGS.map(b => ({
    id: b.id, lens: b.lens, file: b.file, line: lineOf(files[b.file].split('\n'), b.replace),
    ...(b.ambiguous ? { ambiguous: b.ambiguous } : {}),
  }));
  const decoys = DECOYS.map(d => {
    const line = lineOf(files[d.file].split('\n'), d.needle);
    return { id: d.id, file: d.file, lines: [line, line + d.span - 1] };
  });
  const symptoms = SYMPTOMS.map(s => {
    const line = lineOf(files[s.file].split('\n'), s.needle);
    return { of: s.of, file: s.file, lines: [line, line + s.span - 1] };
  });
  const starts = [...decoys, ...symptoms.map(s => ({ ...s, id: `symptom of ${s.of}` }))];
  for (const x of [...bugs, ...starts.map(d => ({ ...d, line: d.lines[0] }))]) {
    if (!(x.line > 0)) throw new Error(`${x.id}: line not found in ${x.file}`);
  }
  // Scoring sets decoy and symptom findings aside before matching bugs, which is only safe if none
  // of those ranges covers a bug line.
  for (const d of starts) {
    const hit = bugs.find(b => b.file === d.file && b.line >= d.lines[0] && b.line <= d.lines[1]);
    if (hit) throw new Error(`${d.id.startsWith('symptom') ? d.id : `decoy ${d.id}`} covers planted bug ${hit.id}`);
  }
  return { target: `date-fns ${VERSION} esm, planted by proof/target-4/setup.js`, window: 3, bugs, decoys, symptoms };
}

// The esm build imports a few Babel helpers from @babel/runtime (MIT). Copy the ones it needs, and
// the helpers they import, into _babel/, and point the imports there. Each import is rewritten in
// place, so no line moves.
const BABEL = /"@babel\/runtime\/helpers\/esm\/(\w+)"/g;

export function vendorBabel(files, babelDir) {
  const helpers = path.join(babelDir, 'helpers', 'esm');
  const needed = new Set();
  for (const text of Object.values(files)) for (const m of text.matchAll(BABEL)) needed.add(m[1]);
  const out = {};
  const queue = [...needed];
  while (queue.length) {
    const name = queue.pop();
    const text = fs.readFileSync(path.join(helpers, `${name}.js`), 'utf8').replace(/\r\n/g, '\n');
    out[`_babel/${name}.js`] = text;
    for (const m of text.matchAll(/from "\.\/(\w+)\.js"/g)) if (!out[`_babel/${m[1]}.js`] && !queue.includes(m[1])) queue.push(m[1]);
  }
  const rewritten = {};
  for (const [rel, text] of Object.entries(files)) {
    const up = '../'.repeat(rel.split('/').length - 1) || './';
    rewritten[rel] = text.replace(BABEL, (_, name) => `"${up}_babel/${name}.js"`);
  }
  return { ...rewritten, ...out };
}

export function build(fromDir, babelDir = path.join(fromDir, '..', '@babel', 'runtime')) {
  const pkg = JSON.parse(fs.readFileSync(path.join(fromDir, 'package.json'), 'utf8'));
  if (pkg.name !== 'date-fns' || pkg.version !== VERSION) throw new Error(`--from must be date-fns ${VERSION}, found ${pkg.name} ${pkg.version}`);
  const esm = path.join(fromDir, 'esm');
  const files = {};
  for (const rel of walk(esm).filter(keep)) files[rel] = fs.readFileSync(path.join(esm, rel), 'utf8').replace(/\r\n/g, '\n');
  const planted = plant(vendorBabel(files, babelDir));
  return {
    files: planted,
    key: keyFor(planted),
    license: fs.readFileSync(path.join(fromDir, 'LICENSE.md'), 'utf8'),
    babelLicense: fs.readFileSync(path.join(babelDir, 'LICENSE'), 'utf8'),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const from = opt('--from');
  const out = opt('--out');
  if (!from || !out) { console.error('usage: node proof/target-4/setup.js --from <date-fns 2.30.0 package dir> --out <dir> [--babel <@babel/runtime dir>] [--write-key]'); process.exit(2); }
  const babel = opt('--babel');
  const { files, key, license, babelLicense } = build(path.resolve(from), babel ? path.resolve(babel) : undefined);
  if (args.includes('--write-key')) {
    fs.writeFileSync(KEY_FILE, JSON.stringify(key, null, 1) + '\n');
  } else {
    const expected = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    if (['bugs', 'decoys', 'symptoms'].some(k => JSON.stringify(expected[k]) !== JSON.stringify(key[k]))) {
      throw new Error(`the planted lines don't match ${KEY_FILE}; is --from really date-fns ${VERSION}?`);
    }
  }
  if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error(`${out} is not empty`);
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.join(out, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(out, rel), text);
  }
  fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({ name: 'date-fns-esm-copy', private: true, type: 'module' }, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'README.md'), README);
  fs.writeFileSync(path.join(out, 'LICENSE.md'), license);
  fs.writeFileSync(path.join(out, '_babel', 'LICENSE'), babelLicense);
  const lines = Object.values(files).reduce((n, t) => n + t.split('\n').length, 0);
  console.log(`wrote ${Object.keys(files).length} files (${lines} lines) to ${out}; ${key.bugs.length} planted bugs, ${key.decoys.length} decoys`);
}
