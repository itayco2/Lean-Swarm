#!/usr/bin/env node
// Score proof round 3 (build workflow) runs.
//   node proof/score-build.js [--json] <runs.json>
// runs.json is what proof/run.js writes. For each run it runs the hidden checks on that run's copy
// of the target (in a child process, with a time limit), runs the visible tests, and checks the
// transcripts for the variant and for any agent that touched the answer key.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProofRun } from './score.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIMIT_MS = 120000;

// A process started by node --test inherits NODE_TEST_CONTEXT, which turns a nested node --test
// into a reporting child instead of a normal run. Drop it so the visible tests always print TAP.
export function plainEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

export function tapCounts(out) {
  const pass = /^# pass (\d+)/m.exec(out || '');
  const fail = /^# fail (\d+)/m.exec(out || '');
  return pass && fail ? { passed: Number(pass[1]), total: Number(pass[1]) + Number(fail[1]) } : null;
}

export function scoreRun(rec) {
  const hidden = spawnSync(process.execPath, [path.join(HERE, 'check-build.js'), rec.target], { encoding: 'utf8', timeout: LIMIT_MS });
  let checks = null;
  try { checks = JSON.parse(hidden.stdout); } catch { /* hung or crashed: scored as no result */ }
  const visible = spawnSync(process.execPath, ['--test', '--test-reporter=tap'], { cwd: rec.target, encoding: 'utf8', timeout: LIMIT_MS, env: plainEnv() });
  let transcript = null;
  if (rec.transcriptDir && fs.existsSync(rec.transcriptDir)) transcript = readProofRun(rec.transcriptDir);
  return {
    n: rec.n,
    variant: rec.variant,
    // Extra variants from run.js --variants run as "lean"; the transcripts can only say plain or lean.
    workflowVariant: rec.workflowVariant || rec.variant,
    transcriptVariant: transcript ? transcript.variant : null,
    touchedKey: transcript ? transcript.touchedKey : null,
    run: rec.transcriptDir ? path.basename(rec.transcriptDir) : '(no transcript dir)',
    checks,
    visible: tapCounts(visible.stdout),
  };
}

const frac = x => (x ? `${x.passed}/${x.total}` : 'no result');

export function scoreTable(scored) {
  const rows = scored.map(s => {
    const a = s.checks ? s.checks.byArea : {};
    const mismatch = s.transcriptVariant && s.transcriptVariant !== (s.workflowVariant || s.variant) ? ` (transcripts say ${s.transcriptVariant})` : '';
    const key = s.touchedKey === null ? '?' : s.touchedKey ? 'yes' : 'no';
    return `| ${s.run} | ${s.variant}${mismatch} | ${frac(s.checks)} | ${frac(a.text)} | ${frac(a.time)} | ${frac(a.query)} | ${frac(s.visible)} | ${key} |`;
  });
  return [
    '| Run | Variant | Hidden checks | text | time | query | Visible tests | Touched answer key |',
    '|---|---|---:|---:|---:|---:|---:|---|',
    ...rows,
  ].join('\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const file = args.find(a => a !== '--json');
  if (!file) { console.error('usage: node proof/score-build.js [--json] <runs.json>'); process.exit(2); }
  const scored = JSON.parse(fs.readFileSync(file, 'utf8')).map(scoreRun);
  process.stdout.write(json ? JSON.stringify(scored, null, 1) + '\n' : scoreTable(scored));
}
