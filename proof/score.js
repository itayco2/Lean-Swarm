#!/usr/bin/env node
// Score proof runs against the planted-bug key.
//   node proof/score.js [--key proof/grading/key-2.json] <workflow-run-dir> [...]
// A run dir is the "Transcript dir" the Workflow tool prints. It holds journal.jsonl and agent-*.jsonl.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLES } from '../src/roles.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const loadKey = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const KEY = loadKey(path.join(HERE, 'grading', 'key.json'));

const ROLE_TYPES = new Set(ROLES.flatMap(r => [r.name, 'lean-swarm:' + r.name]));
const norm = f => String(f || '').split('\\').join('/').replace(/^\.\//, '');
// A path matches if it ends with the key's path. A bare file name ("cart.js") matches only when no
// other key file has that name; in a library laid out as <fn>/index.js, a bare "index.js" could be
// any of them.
function fileMatcher(key) {
  const names = {};
  for (const x of [...key.bugs, ...(key.decoys || [])]) {
    const b = path.posix.basename(x.file);
    (names[b] = names[b] || new Set()).add(x.file);
  }
  return (reported, keyFile) => {
    const r = norm(reported);
    if (!r.includes('/')) return r === path.posix.basename(keyFile) && names[r].size === 1;
    return r === keyFile || r.endsWith('/' + keyFile);
  };
}

// Each planted bug matches at most one finding (the closest line in the same file) and vice versa.
// Decoys are correct code that looks suspicious. A finding inside one is a false alarm, and it's
// set aside before bug matching: a decoy can sit within a bug's line window (round 4 has two), and
// a false alarm there must not count as finding the bug. No decoy range contains a bug line.
export function scoreFindings(findings, key = KEY) {
  const sameFile = fileMatcher(key);
  const inRange = (f, d) => sameFile(f.file, d.file) && Number(f.line) >= d.lines[0] && Number(f.line) <= d.lines[1];
  const decoys = key.decoys || [];
  // Symptoms: lines where one planted bug's effects show up next to another planted bug. A finding
  // there is real, but it isn't the neighbouring bug, so it's set aside too (not a false alarm).
  const symptoms = key.symptoms || [];
  const onDecoy = findings.map(f => decoys.some(d => inRange(f, d)));
  const onSymptom = findings.map(f => symptoms.some(s => inRange(f, s)));
  const decoyHits = decoys.filter(d => findings.some(f => inRange(f, d))).map(d => d.id);
  const symptomHits = findings.filter((_, i) => onSymptom[i] && !onDecoy[i]).length;
  const free = new Set(findings.map((_, i) => i).filter(i => !onDecoy[i] && !onSymptom[i]));
  const matched = [];
  const missed = [];
  for (const bug of key.bugs) {
    let best = null;
    for (const i of free) {
      const f = findings[i];
      if (!sameFile(f.file, bug.file)) continue;
      const d = Math.abs(Number(f.line) - bug.line);
      if (d <= key.window && (best === null || d < best.d)) best = { i, d };
    }
    if (best) { free.delete(best.i); matched.push({ bug: bug.id, finding: findings[best.i] }); } else missed.push(bug.id);
  }
  // Everything not matched to a bug, decoy and symptom hits included, in report order.
  const other = findings.filter((_, i) => free.has(i) || onDecoy[i] || onSymptom[i]);
  return { recall: matched.length / key.bugs.length, matched, missed, other, decoyHits, symptomHits };
}

function jsonl(file) {
  try {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

export function readProofRun(dir) {
  const journal = jsonl(path.join(dir, 'journal.jsonl'));
  const labels = Object.fromEntries(journal.filter(e => e.type === 'started').map(e => [e.agentId, e.label]));
  const report = journal.filter(e => e.type === 'result' && labels[e.agentId] === 'report').pop();
  const agentFiles = fs.readdirSync(dir).filter(f => /^agent-.*\.jsonl$/.test(f));
  let lean = false, touchedKey = false;
  for (const f of agentFiles) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, f.replace(/\.jsonl$/, '.meta.json')), 'utf8'));
      if (ROLE_TYPES.has(meta.agentType)) lean = true;
    } catch { /* no meta */ }
    for (const e of jsonl(path.join(dir, f))) {
      if (e.type !== 'assistant' || !e.message || !Array.isArray(e.message.content)) continue;
      for (const c of e.message.content) {
        if (c && c.type === 'tool_use' && /grading|key\.json/.test(JSON.stringify(c.input || {}))) touchedKey = true;
      }
    }
  }
  return {
    dir,
    variant: lean ? 'lean' : 'plain',
    findings: report && report.result && Array.isArray(report.result.findings) ? report.result.findings : null,
    agents: agentFiles.length,
    touchedKey,
  };
}

export function scoreTable(runs, key = KEY) {
  const rows = runs.map(r => {
    if (!r.findings) return `| ${path.basename(r.dir)} | ${r.variant} | no report found | | | | | ${r.touchedKey ? 'yes' : 'no'} |`;
    const s = scoreFindings(r.findings, key);
    const decoys = key.decoys ? s.decoyHits.join(', ') || '0' : '-';
    return `| ${path.basename(r.dir)} | ${r.variant} | ${s.matched.length}/${key.bugs.length} | ${s.matched.map(m => m.bug).join(', ') || '-'} | ${s.missed.join(', ') || '-'} | ${s.other.length} | ${decoys} | ${r.touchedKey ? 'yes' : 'no'} |`;
  });
  return [
    '| Run | Variant | Planted bugs found | Found | Missed | Other findings | Decoy hits | Touched answer key |',
    '|---|---|---:|---|---|---:|---|---|',
    ...rows,
  ].join('\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let key = KEY;
  const k = args.indexOf('--key');
  if (k >= 0) { key = loadKey(args[k + 1]); args.splice(k, 2); }
  if (!args.length) { console.error('usage: node proof/score.js [--key <key.json>] <workflow-run-dir> [...]'); process.exit(2); }
  process.stdout.write(scoreTable(args.map(readProofRun), key));
}
