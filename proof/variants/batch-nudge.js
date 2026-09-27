#!/usr/bin/env node
// Experiment, not shipped: a PostToolBatch hook that, after a lean reading role spends a whole turn
// on one tool call, reminds it to request independent reads and searches together. Each turn
// re-reads the whole context, so a call that could have shared a turn costs a full re-read.
// Tested in the quality series (docs/proof/2026-09-27-quality-series.md): the strong wording made
// reviewers batch 10 times as often, but batched turns read more, and cost didn't fall. So the
// plugin doesn't register it. To rerun the test, copy the plugin, register this script as a
// PostToolBatch command hook (`node <path>/batch-nudge.js strong`, or `soft`), and pass the copy to
// proof/run.js as a --variants plugin dir.
// Fails open: on any problem it prints nothing and exits 0.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Roles that mostly read and search; the coder's edits usually depend on what it just read.
export const NUDGED_ROLES = /^lean-swarm:(reader|researcher|reviewer)$/;
const READ_TOOLS = new Set(['Read', 'Grep', 'Glob', 'Bash', 'WebFetch', 'WebSearch']);

export const NUDGES = {
  soft: 'Batching: that turn made one tool call. If you already know other files, ranges or searches you need, and they do not depend on each other\'s results, request them together in your next turn (up to 3 parallel calls). End Bash commands with `|| true` so one failure does not cancel the others.',
  strong: 'Your last turn made one tool call. In your next turn, make 2-3 tool calls in parallel for independent files, ranges or searches you still need, for example the next chunk of a file together with the next file to check. Make a single call only when it depends on the result you are waiting for. End Bash commands with `|| true` so one failure does not cancel the others.',
};

// Returns the hook's JSON output, or null for no output.
export function decide(input, style = 'soft') {
  if (!input || !NUDGED_ROLES.test(String(input.agent_type || ''))) return null;
  const calls = Array.isArray(input.tool_calls) ? input.tool_calls : [];
  if (calls.length !== 1 || !READ_TOOLS.has(calls[0].tool_name)) return null;
  return { hookSpecificOutput: { hookEventName: 'PostToolBatch', additionalContext: NUDGES[style] || NUDGES.soft } };
}

// Run as a hook when this file is the entry point, also when reached through a symlink or junction.
function isMain() {
  try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (isMain()) {
  let raw = '';
  process.stdin.on('data', c => (raw += c));
  process.stdin.on('end', () => {
    try {
      const out = decide(JSON.parse(raw), process.argv[2]);
      if (out) process.stdout.write(JSON.stringify(out));
    } catch { /* fail open */ }
    process.exit(0);
  });
}
