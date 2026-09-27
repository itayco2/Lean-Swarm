#!/usr/bin/env node
// Run a proof workflow several times in headless Claude Code sessions, rotating variants, and
// record where each run's transcripts went.
//   node proof/run.js --workflow proof/build.workflow.js --target proof/target-3 --copy \
//     --order plain,lean,plain,lean,plain,lean --out <dir> [--claude <path>] [--budget 20] [--minutes 60]
// plain and lean run the workflow's two variants with this repo as the plugin. To test changed roles
// or hooks, name extra variants that run as "lean" from another plugin directory:
//   --variants '{"omit": "<plugin dir>", "next": "<plugin dir>"}' --order plain,lean,omit,next
// (use forward slashes in the JSON; a backslash there is an escape character).
// Each session starts in the target directory. --copy gives each run a fresh copy of the target in
// <out>/<n>-<variant>/, for workflows whose agents edit the target. Runs are appended to
// <out>/runs.json, so a series can be extended later. A session that fails or times out is recorded
// with isError and the series goes on.
// On Windows, point --claude at claude.exe, not the npm .cmd shim.
// Sessions use --permission-mode bypassPermissions so agents can work unattended. Only point this
// at targets you're happy for agents to change.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseArgs(argv) {
  const opts = { order: ['plain', 'lean'], budget: 20, minutes: 60, claude: 'claude', copy: false, variants: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--workflow') opts.workflow = next();
    else if (a === '--target') opts.target = next();
    else if (a === '--out') opts.out = next();
    else if (a === '--claude') opts.claude = next();
    else if (a === '--order') opts.order = next().split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--budget') opts.budget = Number(next());
    else if (a === '--minutes') opts.minutes = Number(next());
    else if (a === '--copy') opts.copy = true;
    else if (a === '--variants') {
      try { opts.variants = JSON.parse(next()); } catch { throw new Error('--variants must be a JSON object of name: plugin dir'); }
    } else throw new Error(`unknown option ${a}`);
  }
  if (!opts.workflow || !opts.target || !opts.out) throw new Error('--workflow, --target and --out are required');
  if (!opts.variants || typeof opts.variants !== 'object' || Array.isArray(opts.variants)) throw new Error('--variants must be a JSON object of name: plugin dir');
  for (const [name, dir] of Object.entries(opts.variants)) {
    if (name === 'plain' || name === 'lean') throw new Error(`--variants can't redefine ${name}`);
    if (typeof dir !== 'string' || !dir) throw new Error(`--variants: ${name} needs a plugin dir`);
  }
  const known = new Set(['plain', 'lean', ...Object.keys(opts.variants)]);
  const unknown = opts.order.filter(v => !known.has(v));
  if (unknown.length) throw new Error(`--order has unknown variants: ${unknown.join(', ')} (plain, lean or a name from --variants)`);
  if (!(Number.isFinite(opts.budget) && opts.budget > 0) || !(Number.isFinite(opts.minutes) && opts.minutes > 0)) {
    throw new Error('--budget and --minutes must be positive numbers');
  }
  return opts;
}

// Which workflow variant and plugin directory a named variant runs with.
export function resolveVariant(opts, name) {
  if (name === 'plain' || name === 'lean') return { workflowVariant: name, pluginDir: ROOT };
  return { workflowVariant: 'lean', pluginDir: path.resolve(opts.variants[name]) };
}

// Every variant's plugin directory must hold a plugin manifest; checked before any session starts.
export function checkVariantDirs(opts) {
  for (const name of Object.keys(opts.variants)) {
    const dir = resolveVariant(opts, name).pluginDir;
    if (!fs.existsSync(path.join(dir, '.claude-plugin', 'plugin.json'))) {
      throw new Error(`--variants: ${name} points at ${dir}, which has no .claude-plugin/plugin.json (use forward slashes in the JSON)`);
    }
  }
}

export function buildPrompt(workflowPath, args) {
  return [
    `Use a workflow: run the workflow script at ${workflowPath} with args ${JSON.stringify(args)}.`,
    'Run it from the file path exactly as written; do not rewrite or inline it. Do not do the task yourself.',
    'Wait until the workflow has finished. Then reply with the exact "Transcript dir" path the Workflow tool reported,',
    'on its own line prefixed TRANSCRIPT_DIR=, then the workflow duration in milliseconds if the tool reported one, prefixed DURATION=.',
  ].join(' ');
}

// The session's --output-format json result, reduced to what the scorer needs.
export function parseResult(stdout) {
  let j;
  try { j = JSON.parse(stdout); } catch { return { transcriptDir: null, durationMs: null, costUsd: null, isError: true, error: 'no JSON result' }; }
  const text = String(j.result || '');
  const dir = /TRANSCRIPT_DIR=[`'"]?([^`'"\r\n]+)/.exec(text);
  // Only a whole number of milliseconds counts; anything else leaves the duration to X-ray.
  const dur = /DURATION=(\d+)\s*(?:ms)?\s*$/m.exec(text);
  return {
    transcriptDir: dir ? dir[1].trim() : null,
    durationMs: dur ? Number(dur[1]) : null,
    costUsd: typeof j.total_cost_usd === 'number' ? j.total_cost_usd : null,
    isError: Boolean(j.is_error),
    sessionId: j.session_id || null,
    ...(j.is_error ? { error: text.slice(0, 300) } : {}),
  };
}

// Earlier runs in this output folder, so numbering and the file continue.
export function loadRuns(file) {
  if (!fs.existsSync(file)) return [];
  const runs = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(runs)) throw new Error(`${file} is not a list of runs`);
  return runs;
}

// The next run number: past the highest recorded run and past any <n>-<variant> folder left behind.
export function nextRunNumber(runs, outDir) {
  const folders = fs.existsSync(outDir) ? fs.readdirSync(outDir).map(f => /^(\d+)-/.exec(f)).filter(Boolean).map(m => Number(m[1])) : [];
  return Math.max(0, ...runs.map(r => Number(r.n) || 0), ...folders) + 1;
}

// What a finished spawn means: a record for runs.json, or a thrown error if claude never started.
export function outcome(r, opts) {
  if (r.error && !r.pid) {
    const hint = process.platform === 'win32' ? ' On Windows, pass --claude with the full path to claude.exe, not the .cmd shim.' : ' Pass --claude with the full path to the claude executable.';
    throw new Error(`could not start ${opts.claude}: ${r.error.message}.${hint}`);
  }
  const parsed = parseResult(r.stdout || '');
  if (r.error) {
    const why = r.error.code === 'ETIMEDOUT' ? `timed out after ${opts.minutes} min` : r.error.code || r.error.message;
    return { ...parsed, isError: true, error: why };
  }
  if (parsed.error === 'no JSON result' && r.stderr) return { ...parsed, stderr: String(r.stderr).slice(-500) };
  return parsed;
}

function runOne(opts, n, name) {
  const { workflowVariant, pluginDir } = resolveVariant(opts, name);
  const workflow = path.resolve(opts.workflow);
  let target = path.resolve(opts.target);
  if (opts.copy) {
    const dest = path.resolve(opts.out, `${n}-${name}`);
    if (fs.existsSync(dest)) throw new Error(`${dest} already exists; refusing to copy the target over an old run`);
    fs.cpSync(target, dest, { recursive: true });
    target = dest;
  }
  // The session starts in the target, so agents that look around see the target, not this repo.
  const cwd = target;
  const prompt = buildPrompt(workflow, { variant: workflowVariant, target });
  const started = Date.now();
  const r = spawnSync(opts.claude, [
    '-p', '--plugin-dir', pluginDir, '--permission-mode', 'bypassPermissions',
    '--output-format', 'json', '--max-budget-usd', String(opts.budget), prompt,
  ], { cwd, encoding: 'utf8', timeout: Math.round(opts.minutes * 60000), maxBuffer: 64 * 1024 * 1024 });
  return {
    n, variant: name, workflowVariant, pluginDir, target, startedAt: new Date(started).toISOString(),
    exitCode: r.status, seconds: Math.round((Date.now() - started) / 1000), ...outcome(r, opts),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); checkVariantDirs(opts); } catch (e) { console.error(e.message); process.exit(2); }
  fs.mkdirSync(opts.out, { recursive: true });
  const file = path.join(opts.out, 'runs.json');
  const runs = loadRuns(file);
  let n = nextRunNumber(runs, opts.out);
  for (const [i, name] of opts.order.entries()) {
    console.log(`[${new Date().toISOString().slice(11, 19)}] run ${n} (${i + 1}/${opts.order.length}, ${name}) starting`);
    const rec = runOne(opts, n, name);
    runs.push(rec);
    fs.writeFileSync(file, JSON.stringify(runs, null, 1));
    console.log(`[${new Date().toISOString().slice(11, 19)}] run ${n} (${name}) exit=${rec.exitCode} secs=${rec.seconds} error=${rec.isError} dir=${rec.transcriptDir}`);
    n++;
  }
  console.log(`done: ${file}`);
}
