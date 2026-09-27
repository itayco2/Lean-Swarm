#!/usr/bin/env node
// Run the hidden checks for proof round 3 against one copy of proof/target-3.
//   node proof/check-build.js <target-dir>        prints a JSON summary
// score-build.js runs this in a child process, so a hang in the agents' code can't stop scoring.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CASES, MODULES } from './grading/hidden-3.js';

export async function runCases(targetDir, cases = CASES) {
  const mods = {};
  const loadErrors = {};
  for (const name of Object.keys(MODULES)) {
    try {
      mods[name] = await import(pathToFileURL(path.join(targetDir, 'src', `${name}.js`)).href);
    } catch (e) {
      loadErrors[name] = String((e && e.message) || e).split('\n')[0];
    }
  }
  const results = cases.map(({ id, area, run }) => {
    try {
      run(mods);
      return { id, area, pass: true };
    } catch (e) {
      return { id, area, pass: false, error: String((e && e.message) || e).split('\n')[0].slice(0, 200) };
    }
  });
  const byArea = {};
  for (const r of results) {
    byArea[r.area] = byArea[r.area] || { passed: 0, total: 0 };
    byArea[r.area].total++;
    if (r.pass) byArea[r.area].passed++;
  }
  return {
    passed: results.filter(r => r.pass).length,
    total: results.length,
    byArea,
    failed: results.filter(r => !r.pass).map(r => ({ id: r.id, error: r.error })),
    loadErrors,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: node proof/check-build.js <target-dir>'); process.exit(2); }
  // stdout carries only the JSON summary: anything the agents' code prints (console.log, console.dir,
  // process.stdout.write) goes to stderr. Keep the real writer for the summary.
  const out = process.stdout.write.bind(process.stdout);
  process.stdout.write = process.stderr.write.bind(process.stderr);
  out(JSON.stringify(await runCases(path.resolve(dir))) + '\n');
}
