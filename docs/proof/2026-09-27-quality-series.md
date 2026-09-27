# Quality series: do lean roles make agents worse? (2026-09-27)

**Short version:** no loss that this test can see. Across 43 long review runs on a 15,000-line library, every variant found all 12 unambiguous planted bugs in every run, with no false alarm on a decoy. On a coding task, lean coders passed all 112 hidden checks in every run, like default agents. A 13th planted bug turned out to have an ambiguous spec (the rule it breaks isn't in the function's JSDoc); default agents reported it in 2 runs, both in the first block of 3, and no variant reported it in the 40 runs after. Starting lean roles without CLAUDE.md and rules files (`omitClaudeMd`) cut tokens read per turn by 47% and cost by 38% against default agents, with the same bugs found.

Raw output: [`2026-09-27-quality-series-raw.md`](2026-09-27-quality-series-raw.md). Setup of the target and the first 6 runs: [round 4](2026-09-26-long-agents.md).

## Why this round

Round 4 left one open question: lean reviewers missed one planted bug in 3 of 3 runs where default agents found it in 2 of 3. This series adds runs until that either becomes clear or goes away, and tests the two next cuts from [decision 0003](../decisions/0003-next-levers.md) on the same task.

## Variants

| Variant | What it is | Runs |
|---|---|---:|
| plain | default workflow agents | 12 |
| lean | this repo's roles as of v0.1 (tools allowlist) | 12 |
| omit | lean, plus `omitClaudeMd: true` on reviewer and judge (the v0.2 roles) | 5 |
| next | omit, plus a `PostToolBatch` hook that nudges toward batching, soft wording | 5 |
| strong | omit, plus the same hook with firmer wording | 5 |
| mirror | lean, with the role's one-line prompt replaced by the default workflow agent's | 4 |

All ran the unchanged round-1 review workflow (3 reviewers → 3 checkers → 1 judge) on `proof/target-4`, headless with `proof/run.js`, Claude Code 2.1.281, Opus 5.5 at medium effort. The runs came in four blocks, each rotating its variants so they shared conditions: round 4 (plain, lean; 6 runs, 2026-09-26), then next, omit, lean, plain (20 runs), then mirror, lean, plain (12 runs), then strong on its own (5 runs), so strong compares with omit across blocks. In the strong block the account hit its usage limit: one session stopped midway and three failed at the start; all four were rerun after the limit reset and are left out. Every session ran with `DISABLE_MICROCOMPACT=1`, inherited from the desktop app. The nudge hook now lives in `proof/variants/batch-nudge.js`, which takes the wording as an argument; the tested copies each carried the same script with its wording fixed.

## Quality

| Variant | Runs | Unambiguous bugs found | Ambiguous bug found | False alarms on decoys | Other findings per run |
|---|---:|---|---:|---:|---:|
| plain | 12 | 12/12 in every run | 2/12 | 0 | 0.5 |
| lean | 12 | 12/12 in every run | 0/12 | 0 | 0.2 |
| omit | 5 | 12/12 in every run | 0/5 | 0 | 0.6 |
| next | 5 | 12/12 in every run | 0/5 | 0 | 0.4 |
| strong | 5 | 12/12 in every run | 0/5 | 0 | 0.8 |
| mirror | 4 | 12/12 in every run | 0/4 | 0 | 0.0 |

- **The ambiguous bug.** `addMonths` was planted to stop clamping to the month's end (31 January + 1 month gives 3 March). But its JSDoc says only "Add the specified number of months to the given date", with an example that never reaches a month's end; the rule lives in code comments. The reviewers were told the JSDoc is the spec and that code matching it is correct even if it looks odd. So not reporting it follows the instructions. The review of this kit caught that the bug was badly planted; it is scored but kept out of the main recall.
- **Both reports came from the first block.** Default agents found it in 2 of 3 round-4 runs, then in 0 of 9 later runs; no other variant found it at all. Counted within blocks, only round 4 differs (2 of 3 vs 0 of 3), a one-sided Fisher exact p of 0.2. So there is no supported difference between default agents and lean roles on it. (Pooling all blocks, 2 of 12 vs 0 of 31, would give p ≈ 0.07, but that mixes blocks where nobody found it.)
- **The mirror test couldn't tell anything.** It was meant to show whether the role's wording mattered, but default agents also found the bug 0 of 4 times in the same block, so the block had nothing to compare.
- **Every lean reviewer that missed it had opened `addMonths/index.js`,** so it was a judgment call, not coverage.
- **Recall on the 12 unambiguous bugs:** +0.0 points for every variant against plain, 90% interval +0.0 to +0.0, because nothing varied.

## Cost

| Variant | Tokens read per run | per turn | Turns per run | Cost per run | Wall-clock | First turn |
|---|---:|---:|---:|---:|---:|---:|
| plain | 6.61M | 103.5k | 63.9 | $4.98 | 3.5 min | 52.3k |
| lean | 4.74M (−28%) | 76.1k (−26%) | 62.3 | $4.28 (−14%) | 3.5 min (0%) | 18.9k |
| omit | 3.19M (−52%) | 54.5k (−47%) | 58.6 | $3.08 (−38%) | 3.0 min (−14%) | 5.6k |
| next | 2.89M (−56%) | 56.2k (−46%) | 51.4 | $2.98 (−40%) | 3.0 min (−14%) | 5.6k |
| strong | 2.92M (−56%) | 57.1k (−45%) | 51.2 | $3.07 (−38%) | 3.0 min (−15%) | 5.6k |
| mirror | 4.24M (−36%) | 66.7k (−36%) | 63.5 | $3.87 (−22%) | 3.3 min (−7%) | 18.5k |

- **`omitClaudeMd` is the big cut.** It removes the 12.6k-token instruction attachment (CLAUDE.md, 11 rules files and AGENTS.md on this machine) from every agent's first message. Every agent writes that block to the cache at $5/MTok and re-reads it on every turn, so dropping it cuts both the first-turn writes and every later read.
- **Wall-clock is within the noise.** The −14% for omit is pooled across blocks; within its own block it's smaller, and identical runs vary by tens of percent.
- **The nudge changes behaviour but not cost.** Share of find-stage turns with 2 or more tool calls: omit 2% (5 of 254), next 8% (17 of 220), strong 20% (44 of 218). Both nudges cut turns by 12–13% against omit, but a batched turn reads more, so tokens read per turn went up 3–5% and cost fell only 3% (next, same block as omit) and 0% (strong, a later block), inside the spread between runs. It isn't worth a hook that runs after every tool batch in every session, so it isn't shipped; `proof/variants/batch-nudge.js` keeps it for reruns.
- **mirror** ran only in the third block; its difference from lean is within the spread between runs.
- One run (third block, lean) took 352 s because other work shared the machine; its tokens and cost are unaffected.

## The coder role

The review task only exercises reviewer and judge. The coder role was checked on the round-3 task: three coders finish a small library to its JSDoc (some functions unfinished, some buggy), a reviewer checks each area, then the coder fixes what it found. Quality is 112 hidden checks the agents never see (`proof/grading/hidden-3.js`, strengthened after review). 2 runs each way, `proof/score-build.js` and `xray --compare`:

| | Default agents | Lean roles (coder, reviewer) | Change |
|---|---:|---:|---:|
| Hidden checks passed | 112/112, 112/112 | 112/112, 112/112 | same |
| Visible tests | 16/16 every run | 16/16 every run | same |
| Tokens read per run | 2.4M | 1.1M | −53% |
| Cost per run (API prices) | $3.45 | $2.25 | −35% |
| Median first turn | 51.7k | 18.8k | −64% |
| Wall-clock per run | 3.7 min | 3.3 min | −12% |

These agents are short (a median of 3 turns: Opus 5.5 writes each file whole), so the fixed start is a large share and the saving is near the short-agent end. The lean reviewer here ran without `omitClaudeMd`; the coder keeps CLAUDE.md in every variant.

## Limits

- Two task types (long code review on one codebase; short coding on one small library), one model at one effort level, one machine. Research agents weren't tested for quality.
- Quality is near the ceiling: 12 bugs every run. A harder target could show differences this one can't.
- `omitClaudeMd` drops project CLAUDE.md files too. Here the task prompt carried everything the reviewers needed; in a project whose CLAUDE.md holds context a reviewer needs, that context is gone. Put it in the workflow's prompt, or use a role without `omitClaudeMd`.
- omit, next, strong and mirror have 4–5 runs each.

The claim: **on long review agents in a large codebase, on this machine,** lean roles with `omitClaudeMd` found the same 12 bugs in every run as default agents and cost 38% less.
