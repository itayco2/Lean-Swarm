import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = path.join(ROOT, 'hooks');
const ROLES = fs.readdirSync(path.join(ROOT, 'agents')).map(f => f.replace(/\.md$/, ''));

test('hooks.json runs session-start through the cross-platform wrapper at session start', () => {
  const config = JSON.parse(fs.readFileSync(path.join(HOOKS, 'hooks.json'), 'utf8'));
  const [entry] = config.hooks.SessionStart;
  assert.match(entry.matcher, /startup/);
  const [hook] = entry.hooks;
  assert.equal(hook.type, 'command');
  assert.equal(hook.command, '"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd" session-start');
  for (const f of ['run-hook.cmd', 'session-start']) assert.ok(fs.existsSync(path.join(HOOKS, f)), f);
});

test('hook scripts keep LF endings, so bash can run them from a Windows clone', () => {
  for (const f of ['run-hook.cmd', 'session-start']) {
    assert.ok(!fs.readFileSync(path.join(HOOKS, f), 'utf8').includes('\r'), `${f} has CR`);
  }
});

test('session-start prints the instruction as SessionStart context, naming every role', () => {
  const r = spawnSync('bash', [path.join(HOOKS, 'session-start')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  const text = out.hookSpecificOutput.additionalContext;
  assert.match(text, /^When you write a workflow, give each agent the lean-swarm agent type/);
  for (const role of ROLES) assert.match(text, new RegExp(`lean-swarm:${role}\\b`), role);
  assert.equal(ROLES.length, 5);
});
