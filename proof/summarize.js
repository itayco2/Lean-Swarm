#!/usr/bin/env node
// Summarize a proof series by variant: quality (planted-bug recall, per-bug found rates, false
// alarms) next to tokens, cost and time, each compared with a baseline variant.
//   node proof/summarize.js --key proof/grading/key-4.json [--baseline plain] [--json] <runs.json> [...]
// runs.json files are what proof/run.js writes; several can be combined. Recall differences get
// a 90% bootstrap interval (resampling runs, fixed seed), the spec's non-inferiority check.
// Bugs marked "ambiguous" in the key (their JSDoc doesn't state the broken rule) are shown per bug
// but left out of the main recall figure; recall over all bugs is shown next to it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRun, runFromDir } from '../src/logs.js';
import { median, runStats } from '../src/measure.js';
import { loadKey, readProofRun, scoreFindings } from './score.js';

// Why a run can't be scored, or null if it can. Extra variants from run.js --variants run as
// "lean", and the transcripts can only say plain or lean, so compare with the workflow variant.
export function unusable(rec) {
  if (rec.isError) return 'session error';
  if (!rec.transcriptDir || !fs.existsSync(rec.transcriptDir)) return 'no transcript dir';
  if (!runFromDir(rec.transcriptDir)) return 'no agent transcripts';
  if (readProofRun(rec.transcriptDir).variant !== (rec.workflowVariant || rec.variant)) return 'transcripts show a different variant';
  return null;
}

// Everything the summary needs from one run: quality from the judge's report, cost from X-ray.
export function scoreRecord(rec, key) {
  const proof = readProofRun(rec.transcriptDir);
  const stats = runStats(readRun(runFromDir(rec.transcriptDir)));
  const s = proof.findings ? scoreFindings(proof.findings, key) : null;
  const firsts = stats.agents.map(a => a.firstTurn).filter(x => x > 0);
  return {
    variant: rec.variant,
    run: path.basename(rec.transcriptDir),
    found: s ? s.matched.map(m => m.bug) : [],
    reported: Boolean(proof.findings),
    other: s ? s.other.length : 0,
    decoyHits: s ? s.decoyHits.length : 0,
    touchedKey: proof.touchedKey,
    read: stats.read,
    turns: stats.turns,
    cost: stats.costTotal,
    minutes: rec.durationMs ? rec.durationMs / 60000 : stats.wallMinutes,
    firstTurn: median(firsts),
  };
}

// Small seeded PRNG so the bootstrap is reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// 90% bootstrap interval for mean(b) - mean(a).
export function bootstrapDiff(a, b, { iterations = 10000, seed = 7 } = {}) {
  if (!a.length || !b.length) return null;
  const rand = mulberry32(seed);
  const pick = xs => xs[Math.floor(rand() * xs.length)];
  const diffs = [];
  for (let i = 0; i < iterations; i++) {
    let sa = 0, sb = 0;
    for (let j = 0; j < a.length; j++) sa += pick(a);
    for (let j = 0; j < b.length; j++) sb += pick(b);
    diffs.push(sb / b.length - sa / a.length);
  }
  diffs.sort((x, y) => x - y);
  return { diff: mean(b) - mean(a), low: diffs[Math.floor(0.05 * iterations)], high: diffs[Math.floor(0.95 * iterations) - 1] };
}

// Share of the given bugs a run found.
const recallOf = (row, bugs) => (bugs.length ? bugs.filter(b => row.found.includes(b.id)).length / bugs.length : 0);

// excluded: { variant: { reason: count } } for runs that couldn't be scored.
export function aggregate(rows, key, baseline = 'plain', excluded = {}) {
  const clear = key.bugs.filter(b => !b.ambiguous);
  const names = [...new Set([...rows.map(r => r.variant), ...Object.keys(excluded)])];
  const groups = Object.fromEntries(names.map(n => [n, rows.filter(r => r.variant === n)]));
  const base = groups[baseline] || [];
  const variants = names.map(name => {
    const g = groups[name];
    const read = g.map(r => r.read);
    const turns = g.reduce((a, r) => a + r.turns, 0);
    const recall = g.map(r => recallOf(r, clear));
    const perTurn = g.map(r => r.read / Math.max(1, r.turns));
    return {
      name,
      runs: g.length,
      excluded: excluded[name] || {},
      recall: mean(recall),
      recallRange: g.length ? [Math.min(...recall), Math.max(...recall)] : [0, 0],
      recallAll: mean(g.map(r => recallOf(r, key.bugs))),
      perBug: Object.fromEntries(key.bugs.map(b => [b.id, g.filter(r => r.found.includes(b.id)).length])),
      other: mean(g.map(r => r.other)),
      decoyHits: g.reduce((a, r) => a + r.decoyHits, 0),
      missingReports: g.filter(r => !r.reported).length,
      touchedKey: g.filter(r => r.touchedKey).length,
      read: mean(read),
      readRange: g.length ? [Math.min(...read), Math.max(...read)] : [0, 0],
      perTurn: turns ? read.reduce((a, b) => a + b, 0) / turns : 0,
      perTurnRange: g.length ? [Math.min(...perTurn), Math.max(...perTurn)] : [0, 0],
      turns: g.length ? turns / g.length : 0,
      cost: mean(g.map(r => r.cost)),
      minutes: mean(g.map(r => r.minutes)),
      firstTurn: median(g.map(r => r.firstTurn)),
      recallVsBase: name === baseline ? null : bootstrapDiff(base.map(r => recallOf(r, clear)), recall),
    };
  });
  return { baseline, clearBugs: clear.length, variants };
}

const k = n => `${(n / 1000).toFixed(1)}k`;
const m = n => `${(n / 1e6).toFixed(2)}M`;
const pct = (x, base) => (base ? `${x >= base ? '+' : '-'}${Math.abs(Math.round(100 * (x / base - 1)))}%` : '-');
// Percentage points with one decimal; rounds first so floating-point noise never prints as -0.0.
export const pp = x => {
  const v = Math.round(1000 * x) / 10;
  return `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(1)}`;
};

export function markdownSummary(agg, key) {
  const base = agg.variants.find(v => v.name === agg.baseline);
  const n = agg.clearBugs;
  const ambiguous = key.bugs.filter(b => b.ambiguous);
  const lines = [];
  lines.push(`| Variant | Runs | Bugs found (of ${n}${ambiguous.length ? ' unambiguous' : ''}; mean, range) | Recall vs ${agg.baseline} (90% CI, points) | All ${key.bugs.length} bugs | Other findings per run | Decoy hits | Tokens read per run | per turn | Turns per run | Cost per run | Wall-clock | Median first turn |`);
  lines.push('|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const v of agg.variants) {
    if (!v.runs) {
      lines.push(`| ${v.name} | 0 | all runs left out |${' - |'.repeat(10)}`);
      continue;
    }
    const ci = v.recallVsBase ? `${pp(v.recallVsBase.diff)} (${pp(v.recallVsBase.low)} to ${pp(v.recallVsBase.high)})` : '-';
    const vs = field => (v.name === agg.baseline || !base ? '' : ` (${pct(v[field], base[field])})`);
    lines.push(`| ${v.name} | ${v.runs} | ${(v.recall * n).toFixed(1)}/${n} (${Math.round(v.recallRange[0] * n)}-${Math.round(v.recallRange[1] * n)}) | ${ci} | ${(v.recallAll * key.bugs.length).toFixed(1)}/${key.bugs.length} | ${v.other.toFixed(1)} | ${v.decoyHits} | ${m(v.read)}${vs('read')} | ${k(v.perTurn)}${vs('perTurn')} | ${v.turns.toFixed(1)} | $${v.cost.toFixed(2)}${vs('cost')} | ${v.minutes.toFixed(1)} min${vs('minutes')} | ${k(v.firstTurn)} |`);
  }
  lines.push('');
  lines.push('Per-bug found rate:');
  lines.push('');
  lines.push(`| Bug | ${agg.variants.map(v => v.name).join(' | ')} |`);
  lines.push(`|---|${agg.variants.map(() => '---:').join('|')}|`);
  for (const b of key.bugs) lines.push(`| ${b.id}${b.ambiguous ? ' (ambiguous)' : ''} | ${agg.variants.map(v => (v.runs ? `${v.perBug[b.id]}/${v.runs}` : '-')).join(' | ')} |`);
  for (const b of ambiguous) lines.push('', `${b.id} is ambiguous: ${b.ambiguous}.`);
  const flags = [];
  for (const v of agg.variants) {
    if (v.missingReports) flags.push(`${v.name}: ${v.missingReports} runs without a report`);
    if (v.touchedKey) flags.push(`${v.name}: ${v.touchedKey} runs touched the answer key`);
    for (const [reason, count] of Object.entries(v.excluded)) flags.push(`${v.name}: ${count} runs left out (${reason})`);
  }
  if (flags.length) lines.push('', ...flags);
  return lines.join('\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = name => { const i = args.indexOf(name); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
  const keyFile = opt('--key');
  const baseline = opt('--baseline') || 'plain';
  const json = args.includes('--json');
  const files = args.filter(a => a !== '--json');
  if (!keyFile || !files.length) { console.error('usage: node proof/summarize.js --key <key.json> [--baseline plain] [--json] <runs.json> [...]'); process.exit(2); }
  const key = loadKey(keyFile);
  const recs = files.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  const excluded = {};
  const usable = recs.filter(r => {
    const why = unusable(r);
    if (why) { excluded[r.variant] = excluded[r.variant] || {}; excluded[r.variant][why] = (excluded[r.variant][why] || 0) + 1; }
    return !why;
  });
  const rows = usable.map(r => scoreRecord(r, key));
  const agg = aggregate(rows, key, baseline, excluded);
  process.stdout.write(json ? JSON.stringify({ rows, ...agg }, null, 1) + '\n' : markdownSummary(agg, key));
}
