# Does ultracode use the roles? (2026-09-27)

**Short version:** with version 0.3, yes, with nothing to set up. In 0.2 the plugin only added the agent types, and plain ultracode gave its agents no type, so they all ran as default agents. 0.3 adds a SessionStart hook with one line that tells Claude to give workflow agents the lean-swarm type that fits each step. On a 15,000-line review, one run each, installing 0.3 cut tokens read by the agents by 64% and session cost by 39%, and both runs found all 13 planted bugs.

## Setup

- Plugin installed the way the README says, from GitHub: `claude plugin marketplace add itayco2/Lean-Swarm`, then `claude plugin install lean-swarm@lean-swarm` (user scope), and `claude plugin update` for 0.3.0. Claude Code 2.1.281, Opus 5.5, Windows, the same heavy setup as the other rounds.
- Each session ran headless in a fresh copy of the target: `claude -p --permission-mode bypassPermissions --output-format json "<prompt>"`.
- Agent types were read from each agent's `.meta.json`; tokens and first turns come from `xray --json` on the workflow run folder, and a separate count straight from the transcripts gave the same tokens read. Bugs were scored by file and line against `proof/grading/key-4.json` (window 3).

## Large target: `proof/target-4` (date-fns, 15,172 lines, 13 planted bugs, 6 decoys)

Prompt in every run: `ultracode: review this library for bugs, using the JSDoc on each function as the spec. Report each bug with file, function and why.` No CLAUDE.md in the target folder unless the column says so.

| | 0.2 installed (default agents) | 0.3 installed, nothing else | 0.2 + a line in CLAUDE.md |
|---|---:|---:|---:|
| Agents | 10 workflow-subagent | 15 lean-swarm:reviewer | 15 lean-swarm:reviewer, 1 lean-swarm:judge |
| First turn per agent (median) | 52.6k | 6.5k | 6.1k (reviewer), 11.7k (judge) |
| Turns | 127 | 116 | 105 |
| Tokens read by the agents | 11.54M | 4.16M (−64%) | 3.08M (−73%) |
| Agents' cost (API prices) | $9.52 | $5.39 | $4.76 |
| Session cost, `total_cost_usd` | $10.58 | $6.44 (−39%) | $5.66 (−46%) |
| Workflow wall-clock | 6.5 min | 3.1 min | 3.1 min |
| Planted bugs found | 13 of 13 | 13 of 13 | 13 of 13 |
| Decoys reported | 0 | 0 | 0 |

- **The session-start line reaches only the main session.** It appears in the main transcript and in none of the 15 agent transcripts. The 0.3 agents' first turn is 0.4k above the CLAUDE.md run's because Claude wrote longer task prompts in that run (median 3,126 characters against 2,275).
- **Each run designed its own workflow** (10, 15 and 16 agents), so the gaps are not only the start of each agent.
- Every answer listed 13 items, all of them planted bugs. The `addMonths` report sits within the scoring window of an `addMonths` decoy line; it is the planted bug.

The CLAUDE.md line, which 0.3's hook now adds by itself:

```
When you write a workflow, give each agent the lean-swarm agent type that fits its step: lean-swarm:reader to map code, lean-swarm:researcher for web research, lean-swarm:coder to build or fix, lean-swarm:reviewer to review or check, lean-swarm:judge to decide or summarize.
```

## Small target: `proof/target` (4 files, 109 lines, 6 bugs), plugin 0.2

| Arm | What happened |
|---|---|
| Plain ultracode | No workflow and no agents: Claude read the 4 files itself and found the 6 bugs ($0.54). |
| "Use a workflow:" with no hint | 8 workflow-subagent agents, median first turn 51.9k. |
| Ultracode + "Use the lean-swarm agents." | 22 lean-swarm:reviewer agents, median first turn 5.8k, 6 bugs. |
| Ultracode + the CLAUDE.md line | 8 lean-swarm:reviewer + 1 lean-swarm:judge, median first turn 6.0k, 6 bugs. |

On a job this small, plain ultracode is the cheapest, because it starts no agents; the plugin changes nothing there.

## Limits

- One run per arm. Identical runs vary by tens of percent in tokens and time; the [quality series](2026-09-27-quality-series.md) has the repeated measurements.
- Code review only, one machine, one model. The session-start line steers Claude's choice of agent type; a future Claude Code version may pick the roles on its own, or weigh the line differently.
