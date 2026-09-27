import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { decide, NUDGES } from '../proof/variants/batch-nudge.js';
const NUDGE = NUDGES.soft;

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'proof', 'variants', 'batch-nudge.js');
const batch = (agentType, ...tools) => ({
  hook_event_name: 'PostToolBatch', agent_type: agentType,
  tool_calls: tools.map((t, i) => ({ tool_name: t, tool_input: {}, tool_use_id: `t${i}`, tool_response: 'x' })),
});

test('nudges a lean reading role after a turn with one read or search call', () => {
  for (const role of ['reader', 'researcher', 'reviewer']) {
    for (const tool of ['Read', 'Grep', 'Glob', 'Bash', 'WebFetch', 'WebSearch']) {
      assert.deepEqual(decide(batch(`lean-swarm:${role}`, tool)), { hookSpecificOutput: { hookEventName: 'PostToolBatch', additionalContext: NUDGE } });
    }
  }
});

test('stays quiet for batches, other tools, other agents and bad input', () => {
  assert.equal(decide(batch('lean-swarm:reviewer', 'Read', 'Read')), null, 'already batched');
  assert.equal(decide(batch('lean-swarm:reviewer', 'StructuredOutput')), null, 'final answer');
  assert.equal(decide(batch('lean-swarm:reviewer', 'Edit')), null);
  assert.equal(decide(batch('lean-swarm:coder', 'Read')), null, 'coder edits depend on reads');
  assert.equal(decide(batch('lean-swarm:judge', 'Read')), null);
  assert.equal(decide(batch('workflow-subagent', 'Read')), null, 'default agents are left alone');
  assert.equal(decide(batch('reviewer', 'Read')), null, 'project copies are not the plugin');
  assert.equal(decide(batch(undefined, 'Read')), null, 'main thread');
  assert.equal(decide({ agent_type: 'lean-swarm:reviewer' }), null);
  assert.equal(decide(null), null);
});

test('the script prints the nudge as JSON, and nothing on bad input', () => {
  const run = input => spawnSync(process.execPath, [SCRIPT], { input, encoding: 'utf8' });
  const ok = run(JSON.stringify(batch('lean-swarm:reviewer', 'Bash')));
  assert.equal(ok.status, 0);
  assert.equal(JSON.parse(ok.stdout).hookSpecificOutput.additionalContext, NUDGE);
  const quiet = run(JSON.stringify(batch('lean-swarm:reviewer', 'Read', 'Grep')));
  assert.equal(quiet.status, 0);
  assert.equal(quiet.stdout, '');
  const bad = run('not json');
  assert.equal(bad.status, 0);
  assert.equal(bad.stdout, '');
});

test('the wording is chosen by style: soft by default, strong on request, soft for anything unknown', () => {
  const text = style => decide(batch('lean-swarm:reviewer', 'Read'), style).hookSpecificOutput.additionalContext;
  assert.equal(text(), NUDGES.soft);
  assert.equal(text('strong'), NUDGES.strong);
  assert.equal(text('bogus'), NUDGES.soft);
  const r = spawnSync(process.execPath, [SCRIPT, 'strong'], { input: JSON.stringify(batch('lean-swarm:reviewer', 'Grep')), encoding: 'utf8' });
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, NUDGES.strong);
});

test('the script still runs when its folder is reached through a link (plugin caches can be linked)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nudge-link-'));
  const link = path.join(dir, 'variants-link');
  fs.symlinkSync(path.dirname(SCRIPT), link, process.platform === 'win32' ? 'junction' : 'dir');
  const r = spawnSync(process.execPath, [path.join(link, 'batch-nudge.js')], { input: JSON.stringify(batch('lean-swarm:reader', 'Grep')), encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, NUDGE);
});
