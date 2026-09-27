# Proof round 4: long agents in a large codebase (2026-09-26)

> **Update 2026-09-27.** The [quality series](2026-09-27-quality-series.md) ran 32 more runs on this target. The missed bug below, `addmonths-no-clamp`, turned out to be badly planted: `addMonths`' JSDoc never states the end-of-month rule, and reviewers are told the JSDoc is the spec. Default agents' two reports of it are the two below, in this round; in the 9 default runs after, they found it 0 times, like every lean variant, so there's no supported difference. Every variant found all 12 other bugs in every run. A scoring fix (decoys inside a bug's line window) changed no result here.

**Short version:** when reviewers work like real audits, 15–20 turns each in a 15,000-line library, the lean roles read **27% fewer tokens per turn** (23% fewer per run) and cost about **10% less**. That's much less than the 59–83% of the short-agent rounds, because on long agents most of what's re-read is tool output, not the fixed start. Quality: plain found 13, 12 and 13 of the 13 planted bugs, lean 12 in every run. Lean missed the same bug each time, which could be chance with three runs but needs checking. Wall-clock didn't change beyond the noise.

Raw output: [`2026-09-26-long-agents-raw.md`](2026-09-26-long-agents-raw.md). Short-agent rounds: [cloud 1](2026-09-25-review.md), [cloud 2](2026-09-25-review-round2.md), [local](2026-09-26-local-review.md).

## Why a new round

Across Itay's 2,249 real workflow agents, 70% ran 10 turns or more, and those long agents read 97% of all tokens. Most of them were audits and investigations in large codebases, searching with `grep` and reading ranges with `sed -n` over 20+ turns. The earlier rounds had 2–3-turn agents, and a round-3 coding task (`proof/target-3`) still gave a median of 3 turns: Opus 5.5 read the whole small target at once. So this round uses a codebase too big to read whole.

## Setup

- **Target:** the date-fns 2.30.0 ES-module build (MIT), 333 files and 15,172 lines, built by `proof/target-4/setup.js` with **13 planted one-line bugs** (9 logic, 1 state, 3 input validation), each breaking its function's JSDoc, and **9 decoys** (3 later dropped: the planted `toDate` bug made them wrong; rescoring changed nothing). Answer key: `proof/grading/key-4.json`.
- **Workflow:** the unchanged round-1 review workflow: three reviewers (logic, state, input) → three checkers → one judge.
- **Runs:** six headless sessions with `proof/run.js`, alternating plain and lean, back to back on one evening. Claude Code 2.1.281, the plugin loaded with `--plugin-dir`, `claude-opus-5-5` at `medium` effort for all 382 turns.
- **Same machine and setup as the local round:** a default agent starts at 52.3k tokens, a lean reviewer at 19.0k.

## The agents were long

| Stage | Variant | Turns per agent | First turn | Context at the last turn |
|---|---|---:|---:|---:|
| find (3 reviewers) | plain | 15–27, median 16 | 51k | 97–231k |
| find (3 reviewers) | lean | 16–23, median 18 | 18k | 90–190k |
| verify (3 checkers) | both | 2–3 | 53k plain, 19k lean | 62–70k plain, 29–35k lean |
| report (judge) | both | 1 | 55k plain, 19k lean | – |

The find reviewers match the real long agents (median 15–24 turns): context grows three- to four-fold and almost every turn makes one tool call. Across all agents, the fixed start was 50% of plain reading (real history: 41%), against 93% in the short rounds.

## Quality

| Variant | Planted bugs found | Missed | Other findings | Decoy hits | Touched answer key |
|---|---|---|---:|---:|---|
| plain | 13, 12, 13 | `addmonths-no-clamp` once | 1, 1, 1 | 0 | no |
| lean | 12, 12, 12 | `addmonths-no-clamp` every time | 0, 0, 1 | 0 | no |

- Every other bug was found in all six runs, and no run flagged a decoy.
- **The one difference:** `addMonths` no longer clamps to the end of the month (31 January plus one month gives 3 March). In all three lean runs the logic reviewer opened `addMonths/index.js` and didn't report it. Plain's logic reviewer reported it in two runs and missed it the same way in the third. Two out of three against none out of three isn't significant (Fisher's exact test, p ≈ 0.4), but it's the first difference in any round, so it's the first thing to recheck: more runs, and the role-prompt test from round 2 (a lean reviewer whose prompt mirrors the default agent's).

## Tokens, cost and time

`xray --compare <3 plain> --vs <3 lean>`:

| Measure | Plain | Lean | Change | Noise: plain vs plain | Noise: lean vs lean |
|---|---:|---:|---:|---|---|
| Tokens read per run | 6.36M | 4.91M | −23% | −20% to +73% | −13% to +24% |
| **Tokens read per turn** | 103.1k (87–110k) | 74.8k (69–80k) | **−27%** | ranges don't overlap | |
| Median first-turn context | 52.3k | 19.0k | −64% | 0% | 0% |
| Fixed-start share of tokens read | 50% | 24% | −51% | | |
| API-price equivalent per run | $4.86 | $4.38 | −10% | −6% to +36% | 0% to +7% |
| Turns per run | 61.7 | 65.7 | +6% | −19% to +38% | −5% to +8% |
| Wall-clock per run | 3.9 min | 3.5 min | −10% | −44% to +56% | −20% to +24% |

- **Per run, the noise is large.** How far each reviewer chooses to dig changes a run's length by up to 70%. The per-turn figure removes that: the fixed start is re-read on every turn, and per turn the two variants don't overlap at all.
- **Cost falls much less than tokens.** Here 61% of the cost is cache writes: every turn writes its new tool output into the cache, and lean roles don't touch that. Cache reads, which lean roles do cut, are the cheapest tokens. At −10% against noise of up to 36%, the cost saving isn't established by three runs.
- **Wall-clock:** no effect beyond the noise. The earlier rounds' +12–16% slowdown on short agents didn't show up here.

## X-ray's prediction

From the three plain runs alone, X-ray predicted a saving of **14–40%** of tokens read (2.7M–7.6M). Measured: **23%** (4.4M). Inside the range, for the fourth time in four rounds.

## Where a long agent's reading goes

For the find-stage reviewers, every turn re-reads the whole context, so each piece of context costs its size times the turns left. Splitting their reading that way (the calibration is in the raw output):

| Share of tokens read | Plain reviewer (18 turns, 1.97M) | Lean reviewer (19 turns, 1.57M) |
|---|---:|---:|
| Fixed start | 47% | 22% |
| Tool output (files, grep results) | 49% | **73%** |
| ↳ tool output 5 or more turns old | 24% | **35%** |
| Model output | 2% | 3% |

Also, 330 of 336 find-stage turns made exactly one tool call. Each turn re-reads the whole context, so every call that could have shared a turn costs another full re-read.

## What this means for the next cuts

Measured on this round, in order of size:

1. **Old tool output: 35% of a lean reviewer's reading.** File contents and search results the agent already used, re-read on every later turn. This is the spec's trim hook (M4): trim a large output when it's produced and keep the rest behind `expand`. Unlike lean roles, it also cuts cache writes, so it's the main lever for cost, not just tokens.
2. **One tool call per turn.** Batching independent reads (the spec's batch tools and a line in each role's prompt, §7.6) cuts turns, and each turn saved skips a full re-read, about 75k tokens for a lean reviewer here.
3. **Instruction and rules files: 9k of the lean reviewer's 19k start,** about 10% of its reading. `omitClaudeMd` on roles that don't write code. It's lossy, so it goes through the gate.
4. **Shared reads across agents:** 9–11 of the 30–35 library files each run opened were opened by two or more reviewers. Smaller, and a shared read cache mustn't make the reviewers less independent.

## Limits

- One task type (code review), one codebase, three runs per variant. The per-run numbers are noisy; the per-turn numbers are solid.
- Quality is close to the ceiling, with one unresolved difference (above).
- One model at one effort level, on one machine with its own setup (52k default start, 9k of instruction and rules files).
- The breakdown of reading into fixed start, tool output and model output is an estimate: tool output is sized from its characters, calibrated so that the parts add up to the measured growth of the context (98% of the total is accounted for).

The claim is: **on long review agents in a large codebase, on this machine,** lean roles cut tokens read by about a quarter per turn, cost by about a tenth, and left speed unchanged. The biggest remaining cost is old tool output.
