// Proof round 3 (long agents): the reference solution passes every hidden check, the starting
// target leaves plenty to do, both share one spec, and the workflow differs between variants only
// in agent type. If one of these fails after an edit to proof/target-3, the hidden checks are wrong.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runCases } from '../proof/check-build.js';
import { MODULES } from '../proof/grading/hidden-3.js';
import { buildPrompt, checkVariantDirs, loadRuns, nextRunNumber, outcome, parseArgs, parseResult, resolveVariant } from '../proof/run.js';
import { plainEnv, scoreRun, scoreTable, tapCounts } from '../proof/score-build.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(ROOT, 'proof', 'target-3');
const SOLUTION = path.join(ROOT, 'proof', 'grading', 'solution-3');

// A copy of the target with the solution's source in place of its own.
function solvedCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proof3-'));
  fs.cpSync(TARGET, dir, { recursive: true });
  fs.cpSync(path.join(SOLUTION, 'src'), path.join(dir, 'src'), { recursive: true });
  return dir;
}

test('the reference solution passes every hidden check', async () => {
  const r = await runCases(SOLUTION);
  assert.deepEqual(r.failed, []);
  assert.deepEqual(r.loadErrors, {});
  assert.ok(r.total >= 100, `${r.total} checks`);
});

test('the starting target fails most hidden checks, in every area', async () => {
  const r = await runCases(TARGET);
  assert.ok(r.passed / r.total < 0.3, `${r.passed}/${r.total} already pass`);
  for (const [area, a] of Object.entries(r.byArea)) assert.ok(a.passed < a.total / 2, `${area}: ${a.passed}/${a.total}`);
});

test('every function has the same JSDoc in the target and the solution', () => {
  const docs = file => {
    const src = fs.readFileSync(file, 'utf8');
    return [...src.matchAll(/(\/\*\*[\s\S]*?\*\/)\nexport function (\w+)\(/g)].map(m => [m[2], m[1]]);
  };
  for (const name of Object.keys(MODULES)) {
    const t = docs(path.join(TARGET, 'src', `${name}.js`));
    const s = docs(path.join(SOLUTION, 'src', `${name}.js`));
    assert.ok(t.length > 0, name);
    assert.deepEqual(t, s, `${name}.js`);
  }
});

test('the visible tests pass with the solution and fail on the starting target', () => {
  const run = cwd => spawnSync(process.execPath, ['--test', '--test-reporter=tap'], { cwd, encoding: 'utf8', env: plainEnv() });
  const solved = run(solvedCopy());
  assert.equal(solved.status, 0, solved.stdout.slice(-500));
  const start = run(TARGET);
  assert.notEqual(start.status, 0);
  assert.ok(tapCounts(start.stdout).passed < tapCounts(solved.stdout).passed);
});

// Run the workflow script the way the Workflow runtime does: an async body with injected helpers.
async function runWorkflow(args) {
  const src = fs.readFileSync(path.join(ROOT, 'proof', 'build.workflow.js'), 'utf8').replace(/^export const meta/m, 'const meta');
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const fn = new AsyncFunction('args', 'agent', 'pipeline', 'parallel', 'phase', 'log', src);
  const calls = [];
  const agent = async (prompt, opts) => {
    calls.push({ prompt, opts });
    return opts.label.startsWith('review') ? { findings: [{ file: 'src/csv.js', fn: 'toCsv', call: 'c', expected: 'e', actual: 'a' }] } : { changed: [], testsPass: true };
  };
  const pipeline = (items, ...stages) => Promise.all(items.map(async (item, i) => {
    let r = item;
    for (const stage of stages) r = await stage(r, item, i);
    return r;
  }));
  const result = await fn(args, agent, pipeline, null, () => {}, () => {});
  calls.sort((a, b) => a.opts.label.localeCompare(b.opts.label));
  return { result, calls };
}

test('workflow: lean uses coder and reviewer roles, plain uses default agents, prompts are identical', async () => {
  const target = '/abs/copy/of/target-3';
  const lean = await runWorkflow({ variant: 'lean', target });
  const plain = await runWorkflow({ variant: 'plain', target });
  assert.equal(lean.calls.length, 9);
  assert.deepEqual(lean.calls.map(c => `${c.opts.label}=${c.opts.agentType}`), [
    'build:query=lean-swarm:coder', 'build:text=lean-swarm:coder', 'build:time=lean-swarm:coder',
    'fix:query=lean-swarm:coder', 'fix:text=lean-swarm:coder', 'fix:time=lean-swarm:coder',
    'review:query=lean-swarm:reviewer', 'review:text=lean-swarm:reviewer', 'review:time=lean-swarm:reviewer',
  ]);
  assert.ok(plain.calls.every(c => !('agentType' in c.opts)));
  assert.deepEqual(lean.calls.map(c => c.prompt), plain.calls.map(c => c.prompt));
  assert.ok(lean.calls.every(c => c.prompt.includes(`Work only inside ${target}`)));
  assert.ok(lean.calls.find(c => c.opts.label === 'fix:text').prompt.includes('"fn": "toCsv"'), 'fix gets the review findings');
  assert.deepEqual(lean.result, { variant: 'lean', areas: ['text', 'time', 'query'].map(area => ({ area, testsPass: true })) });
  const project = await runWorkflow({ variant: 'lean', target, rolePrefix: '' });
  assert.deepEqual([...new Set(project.calls.map(c => c.opts.agentType))].sort(), ['coder', 'reviewer']);
  await assert.rejects(runWorkflow({ variant: 'fast', target }), /variant/);
  await assert.rejects(runWorkflow({ variant: 'lean' }), /target/);
});

test('run.js: options, variants, prompt and result parsing', () => {
  const o = parseArgs(['--workflow', 'w.js', '--target', 't', '--out', 'o', '--copy', '--order', 'plain, lean,plain', '--budget', '5']);
  assert.deepEqual([o.copy, o.order, o.budget, o.minutes, o.claude], [true, ['plain', 'lean', 'plain'], 5, 60, 'claude']);
  assert.throws(() => parseArgs(['--workflow', 'w.js']), /required/);
  assert.throws(() => parseArgs(['--workflow', 'w', '--target', 't', '--out', 'o', '--order', 'fast']), /unknown variants: fast/);
  assert.throws(() => parseArgs(['--bogus']), /unknown option/);
  assert.throws(() => parseArgs(['--out']), /needs a value/);
  const base = ['--workflow', 'w', '--target', 't', '--out', 'o'];
  const v = parseArgs([...base, '--variants', '{"omit": "/p/omit"}', '--order', 'plain,omit,lean']);
  assert.deepEqual(v.order, ['plain', 'omit', 'lean']);
  assert.equal(resolveVariant(v, 'omit').workflowVariant, 'lean');
  assert.equal(resolveVariant(v, 'omit').pluginDir, path.resolve('/p/omit'));
  assert.equal(resolveVariant(v, 'plain').workflowVariant, 'plain');
  assert.equal(resolveVariant(v, 'lean').pluginDir, ROOT);
  assert.throws(() => parseArgs([...base, '--variants', 'nope']), /JSON object/);
  assert.throws(() => parseArgs([...base, '--variants', '["a"]']), /JSON object/);
  assert.throws(() => parseArgs([...base, '--variants', '{"lean": "/x"}']), /can't redefine lean/);
  assert.throws(() => parseArgs([...base, '--variants', '{"omit": ""}']), /needs a plugin dir/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runs-'));
  assert.deepEqual(loadRuns(path.join(dir, 'runs.json')), []);
  fs.writeFileSync(path.join(dir, 'runs.json'), JSON.stringify([{ n: 1 }]));
  assert.deepEqual(loadRuns(path.join(dir, 'runs.json')), [{ n: 1 }]);
  fs.writeFileSync(path.join(dir, 'bad.json'), '{}');
  assert.throws(() => loadRuns(path.join(dir, 'bad.json')), /not a list/);
  fs.mkdirSync(path.join(dir, '7-lean'));
  assert.equal(nextRunNumber([{ n: 1 }, { n: 3 }], dir), 8, 'past both recorded runs and leftover folders');
  assert.equal(nextRunNumber([], path.join(dir, 'missing')), 1);
  assert.throws(() => parseArgs([...base, '--minutes', 'abc']), /positive numbers/);
  assert.throws(() => checkVariantDirs(parseArgs([...base, '--variants', '{"x": "/no/such/plugin"}', '--order', 'x'])), /no \.claude-plugin\/plugin\.json/);
  assert.doesNotThrow(() => checkVariantDirs(parseArgs([...base, '--variants', JSON.stringify({ self: ROOT.split('\\').join('/') }), '--order', 'self'])));
});

test('run.js: a timed-out session is recorded and the series goes on; a missing claude stops it', () => {
  const opts = { claude: 'claude', minutes: 1.5 };
  const timeout = Object.assign(new Error('spawnSync claude ETIMEDOUT'), { code: 'ETIMEDOUT' });
  assert.deepEqual(outcome({ pid: 42, error: timeout, stdout: '' }, opts), {
    transcriptDir: null, durationMs: null, costUsd: null, isError: true, error: 'timed out after 1.5 min',
  });
  const missing = Object.assign(new Error('spawnSync claude ENOENT'), { code: 'ENOENT' });
  assert.throws(() => outcome({ pid: undefined, error: missing }, opts), /could not start claude/);
  const good = outcome({ pid: 1, status: 0, stdout: JSON.stringify({ result: 'Done.\nTRANSCRIPT_DIR=`C:\\x\\wf_1`\nDURATION=40791ms', total_cost_usd: 1, is_error: false }) }, opts);
  assert.equal(good.transcriptDir, 'C:\\x\\wf_1', 'backticks around the path are dropped');
  assert.equal(good.durationMs, 40791);
  assert.equal(parseResult(JSON.stringify({ result: 'DURATION=3.5 min' })).durationMs, null, 'not milliseconds');
  assert.equal(parseResult(JSON.stringify({ result: 'x\nDURATION=1200' })).durationMs, 1200);
  const noJson = outcome({ pid: 1, status: 1, stdout: 'boom', stderr: 'Failed to authenticate' }, opts);
  assert.equal(noJson.isError, true);
  assert.match(noJson.stderr, /authenticate/);
  const p = buildPrompt('/r/proof/build.workflow.js', { variant: 'lean', target: '/t' });
  assert.match(p, /^Use a workflow: run the workflow script at \/r\/proof\/build\.workflow\.js with args \{"variant":"lean","target":"\/t"\}\./);
  assert.match(p, /TRANSCRIPT_DIR=/);
  const ok = parseResult(JSON.stringify({ result: 'Done.\n\nTRANSCRIPT_DIR=C:\\x\\wf_1\nDURATION=40791ms', total_cost_usd: 2.5, is_error: false, session_id: 's' }));
  assert.deepEqual(ok, { transcriptDir: 'C:\\x\\wf_1', durationMs: 40791, costUsd: 2.5, isError: false, sessionId: 's' });
  assert.equal(parseResult('not json').isError, true);
  assert.match(parseResult(JSON.stringify({ result: 'Failed to authenticate', is_error: true })).error, /authenticate/);
});

test('score-build: scores a run copy and prints a table', () => {
  assert.deepEqual(tapCounts('# tests 3\n# pass 2\n# fail 1\n'), { passed: 2, total: 3 });
  assert.equal(tapCounts('nothing'), null);
  const s = scoreRun({ n: 1, variant: 'plain', target: solvedCopy(), transcriptDir: null });
  assert.equal(s.checks.passed, s.checks.total);
  assert.equal(s.visible.passed, s.visible.total);
  assert.equal(s.touchedKey, null);
  const table = scoreTable([s, { ...s, variant: 'lean', workflowVariant: 'lean', transcriptVariant: 'plain', touchedKey: true, checks: null }]);
  assert.match(table, new RegExp(`\\| \\(no transcript dir\\) \\| plain \\| ${s.checks.total}/${s.checks.total} \\| 42/42 \\| 34/34 \\| 36/36 \\| 16/16 \\| \\? \\|`));
  assert.match(table, /\| lean \(transcripts say plain\) \| no result \|.*\| yes \|/);
  const extra = scoreTable([{ ...s, variant: 'omit', workflowVariant: 'lean', transcriptVariant: 'lean' }]);
  assert.match(extra, /\| omit \| 112\/112 \|/, 'an extra variant that ran as lean is not a mismatch');
});

test('score-build: output printed by the agents\' code does not spoil the hidden-check result', () => {
  const dir = solvedCopy();
  const csv = path.join(dir, 'src', 'csv.js');
  fs.writeFileSync(csv, `console.log('csv loaded');\nconsole.dir({ csv: true });\nprocess.stdout.write('raw\\n');\n${fs.readFileSync(csv, 'utf8')}`);
  const s = scoreRun({ n: 1, variant: 'lean', target: dir, transcriptDir: null });
  assert.ok(s.checks, 'hidden checks produced a result');
  assert.equal(s.checks.passed, s.checks.total);
});
