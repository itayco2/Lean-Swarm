# 0003: What to build next, and what not to

- **Date:** 2026-09-27
- **How:** proof rounds 1-4 (round 4 = long agents, see `docs/proof/2026-09-26-long-agents.md`); a web research sweep (6 angles + critic + 2 gap searches: 348 findings, 81 repos, see `research/landscape.md`); a verify pass (8 agents: two independent recomputations, two cost simulations, two source-code reads, a verbatim re-check of docs and issues, a batching analysis); and local experiments on Claude Code 2.1.281.

## Where the money goes

| Share of billed cost | Long lean reviewer, round 4 | Author's whole workflow history |
|---|---:|---:|
| First-turn writes (start of each agent) | 12% | - |
| Later cache writes (tool output entering context) | 50% | 29% (all writes) |
| Cache reads | 20% | 48% |
| Output and thinking | 17% | 23% |

Opus 5.5 prices a written token like 25 read tokens ($5 vs $0.20 per MTok, 5-minute TTL).

## Decisions

| Lever | Decision | Evidence | Expected |
|---|---|---|---|
| **`omitClaudeMd` on reader, reviewer, judge** | **Build next**, behind the proof gate | Local test on 2.1.281: drops CLAUDE.md, all 11 `~/.claude/rules` files and `AGENTS.md`; first turn 15.7k -> 3.2k. The dropped block sits in each agent's first message, so every agent writes it at $5/MTok, then re-reads it every turn. | ~ -14% cost and ~ -15% tokens read on round-4 lean runs. Lossy: rules carry review guidance. |
| **Batching nudge** | **Build**, behind the gate | 139 of 300 single-call reviewer turns were clearly independent of the previous result. Prompt-only nudges don't hold; a per-turn reminder does (Vibekanban; W&D: 3 calls per turn halved turns, +2 pts, -36% cost). `PostToolBatch` exists in 2.1.281 and takes `additionalContext`. | Ceiling ~ -37-40% tokens read, -9-10% cost. Cap width at ~3, independent calls only, Bash `|| true` (a failing call cancels its siblings). |
| Head/tail trimming of tool output | **Don't build** for readers and reviewers | In review work the large outputs *are* the code: 94-99% of trimmable dollars in round 4. 24-35% of >8k outputs in history lose a line the agent later relies on (52% by the loosest definition); 38% of round-4 findings were never visible in a 4k/4k-kept part. Worst-case re-fetch costs ~2x the saving. | The safe subset (build, test, git, listings) is worth 0.2-1.5% of cost. Maybe later for coder logs. |
| Retroactive clearing of old tool results | **Not feasible** from a plugin, and wouldn't pay | 0 of 108 simulated policies saved money on round 4: clearing forces a $5/MTok rewrite to save $0.20/MTok reads. A gated keep-1 policy saves 8-12% only with a cache breakpoint at the clear boundary, which Claude Code doesn't place (+26-36% with its default). Hooks can't edit history anyway. | Anthropic's domain (context editing, microcompact). |
| 1-hour subagent cache TTL | **Don't** | +37% per round-4 run; the longest gap inside an agent was 93 s. | - |
| Sharing the first-turn block across siblings | **Anthropic-only fix** (#82739, #74318) | Siblings share only tools + system prompt; the rest of the first message is byte-identical but written by every agent. | Worth ~7% of lean run cost if a breakpoint is added. Plugin side: keep role text in the agent body, one schema and one effort for all siblings. |
| Reviewer reading strategy | **Investigate** | Round-4 lean reviewers dumped the library to scratch files and paged them with Read in 36-59k-char chunks (30-61% of trimmable dollars); 12 Read errors on >25k-token files were wasted turns. | Role guidance or a PreToolUse Read guard. Quality-sensitive: A/B first. |
| Failed-command output | **Ignore** | 0.13-0.15% of cost; `PostToolUseFailure` can't replace output anyway. | - |

Open quality question: lean reviewers missed one planted bug (addMonths) in 3/3 round-4 runs, plain in 1/3. The next gate run should cover lean, lean + `omitClaudeMd`, and a lean reviewer whose body mirrors the default agent's prompt.

## Mechanics verified locally (2.1.281, headless, inside Workflow agents)

- A plugin `hooks/hooks.json` PostToolUse hook fires inside Workflow agents, with `agent_type` (`workflow-subagent`, `<plugin>:<role>`) and `agent_id`.
- A shape-matched `updatedToolOutput` reaches the model. Bash's response keys: `stdout, stderr, interrupted, isImage, noOutputExpected`; copy the object and change only the text.
- A non-zero exit goes to `PostToolUseFailure`: no `tool_response`, and replacements are ignored.
- The desktop app sets `DISABLE_MICROCOMPACT=1`; headless runs started from it inherit it. All proof runs so far had Claude Code's own clearing off.
- Subagent cache writes were all 5-minute.

## Outcome (2026-09-27)

Both "build" levers went through the [quality series](../proof/2026-09-27-quality-series.md): the round-4 review task, rotated with default agents and the current roles.

- **`omitClaudeMd`: shipped on reviewer and judge.** All 12 unambiguous bugs found in every run, like default agents; -47% tokens read per turn and -38% cost against default agents, against -26% and -14% for the roles without it. Not yet on reader and researcher, which weren't tested, nor on coder, which writes code under the project's rules.
- **Batching nudge: not shipped.** A soft and a firm wording, 5 runs each against `omitClaudeMd` alone: turns with 2 or more calls rose from 2% to 8% and 20%, and turns fell 12-13%, but batched turns read more, so cost fell 3% and 0%. The hook stays in `proof/variants/batch-nudge.js` to rerun the test.
- **The open quality question** turned out to be a badly planted bug: `addMonths`' JSDoc doesn't state the rule it breaks. Default agents reported it twice, both in round 4's 3 runs; nobody reported it in the 40 runs after, so there's no supported difference.

## What this means for the product

- X-ray is the part nobody else has: ccusage rejected a per-subagent breakdown, and codeburn says it can't tell whether delegation was cheaper. X-ray should grow the analyses above (cost by kind per agent, first-turn write share, independent single-call turns, trimming risk) so each user sees which lever pays on *their* workload; review work and the author's history already disagree.
- Output compression is crowded (headroom, rtk, context-mode, squeez, omni) and mostly measured in bytes/4 without quality tests. Don't compete there.
- `alexgreensh/token-optimizer` (~2.4k stars, PolyForm Noncommercial) is the closest project and shared this repo's former name, Token-Optimizer. The repo was renamed Lean-Swarm on 2026-09-27.
