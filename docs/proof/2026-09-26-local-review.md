# Local round: the same test on Itay's own machine (2026-09-26)

**Short version:** on Itay's local setup, the installed plugin's lean roles read **59% fewer tokens** per run and found **all 11 planted bugs in every run**, the same as default agents, with no false alarms. They cost about **39% less** at API prices and ran about **13% slower**. The token cut is smaller than in the cloud (-77%), because the lean roles keep this machine's instruction and rules files.

Raw output: [`2026-09-26-local-raw.md`](2026-09-26-local-raw.md). Cloud rounds: [round 1](2026-09-25-review.md), [round 2](2026-09-25-review-round2.md).

## What's new in this round

- **Local, not cloud.** Rounds 1 and 2 ran in Claude Code on the web. This one ran on the Windows machine whose logs gave the baseline numbers.
- **The installed plugin form, not the project copies.** The roles loaded with `--plugin-dir .` and ran as `lean-swarm:reviewer` and `lean-swarm:judge`. This is the first live check that a workflow resolves plugin agent names (open question Q3 in `0002-open-questions.md`).
- **A different effort level.** Headless sessions ran at `medium`. The cloud rounds ran at `xhigh`.

## Setup

- **CLI:** 2.1.281, the build the desktop app bundles, which is what Itay's real runs use. (The npm `claude` on this machine is 2.1.250.)
- **Model:** `claude-opus-5-5` for all 97 turns. Effort `medium`, service tier `standard` and speed `standard` for every agent in both variants (checked in the transcripts).
- **Setup being trimmed:** a default agent starts at 52.8k tokens, including an 11.1k skill listing, a 3.6k deferred-tool listing, 2.6k of CLAUDE.md and 6.4k of rules files. The lean roles drop both listings and keep the CLAUDE.md and rules files.
- **Workflow:** `proof/review.workflow.js` on `proof/target-2` (11 planted bugs, 15 decoys), the same as round 2: three reviewers -> three checkers -> one judge.
- **How it ran:** six headless sessions, one per run, alternating plain, lean, plain, lean, plain, lean, back to back on one evening (21:21-21:27). Each was:

  ```
  claude -p --plugin-dir . --permission-mode bypassPermissions --output-format json --max-budget-usd 8 \
    "Use a workflow: run the workflow script at proof/review.workflow.js with args {\"variant\": \"<plain|lean>\", \"target\": \"<abs>/proof/target-2\"}. ..."
  ```

- **Roles check first:** `proof/roles-check.workflow.js` confirmed each role loaded only its listed tools plus `StructuredOutput`. Lean roles started at 15-19k tokens against 51.5k for a default agent.

## Quality

| Variant | Runs | Planted bugs found | Other findings | Decoy hits | Touched answer key |
|---|---:|---|---:|---:|---|
| plain | 3 | 11/11, 11/11, 11/11 | 0 | 0 | no |
| lean | 3 | 11/11, 11/11, 11/11 | 0 | 0 | no |

Both variants found everything and flagged nothing else, as in round 2. So this shows no loss on this task. It can't rule out a small loss on harder work.

## Tokens, cost and time

`xray --compare <3 plain runs> --vs <3 lean runs>`, with the three plain-vs-plain comparisons as the noise floor:

| Measure | Plain | Lean | Change | Noise (plain vs plain) |
|---|---:|---:|---:|---|
| Tokens read per run | 900.0k | 366.0k | **-59%** | 0% |
| Median first-turn context | 52.8k | 18.7k | **-65%** | 0% |
| API-price equivalent per run | $1.67 | $1.01 | **-39%** | -2% to -8% |
| Whole headless session cost, orchestrator included | $2.08-2.18 | $1.42-1.49 | **-32%** | - |
| Tokens written per run (thinking included) | 8.7k | 9.9k | +14% | +3% to -16% |
| Turns per run | 16 | 16.3 | +2% | 0% |
| Workflow duration | 40.8, 39.9, 40.8 s | 48.3, 42.6, 46.5 s | **+13%** | -2% to +2% |

- **Tokens read** is solid: the plain runs read 899-902k (under 1% apart) and the lean runs 356-385k. The 385k lean run had one extra reviewer turn. The gap between variants is far larger than either spread.
- **Cost** falls less than tokens, as in the cloud. In runs this short, cache writes are most of the cost (82% plain, 76% lean), and a lean agent still writes its ~15k start fresh each time (see "Caching" below).
- **Wall-clock:** lean was slower in all 9 plain-vs-lean pairs. The slowest lean run was 48.3 s and the fastest 42.6 s; every plain run took 39.9-40.8 s.

## Next to the cloud rounds

| | Cloud, round 2 | Local, this round |
|---|---:|---:|
| Effort | `xhigh` | `medium` |
| Roles loaded as | project copies | the plugin |
| Default agent's first turn | 44.6k | 52.8k |
| Lean agent's first turn | 6.7k | 18.7k |
| Tokens read per run | **-77%** | **-59%** |
| API-price equivalent | -36% | -39% |
| Wall-clock | +12% | +13% |
| Bugs found | 11/11 every run, both variants | 11/11 every run, both variants |

The lean start is 12k larger here because of the 9k of instruction and rules files the roles keep on purpose, plus larger tool definitions that aren't in the log.

## Why lean was slower

- **Generation speed is the same.** On turns where it can be measured cleanly, both variants wrote about 160 tokens a second (the judge: 994 tokens in 6.3 s lean, 1,012 in 6.1 s plain).
- **Wall-clock follows the slowest find-stage reviewer.** The judge waits for every chain. The slowest lean reviewer took 27.3, 21.2 and 27.0 s; the slowest plain one took 20.9, 19.6 and 19.6 s.
- **The two slow lean runs thought more in the find stage:** 1,468 and 1,998 thinking tokens against 828-1,155 for plain. The lean run with normal thinking (1,078) finished in 42.5 s, close to plain.
- **So round 2's hypothesis partly holds at `medium` too.** Lean reviewers sometimes think longer, and one slow reviewer sets the run's time. The cause is still unproven. The role prompt is the main suspect, since effort, tools and service tier are identical.

## Caching, and a cheap next cut

On an agent's first turn, only about as much as the tool definitions and system prompt is read from cache (median 22.0k for plain, 4.4k for lean). The attachments after them (CLAUDE.md, rules, listings) are written fresh for every agent, even when an identical sibling ran seconds before. The likely reason is that the cache breakpoint sits after the task, which differs per agent. That's an inference from the usage numbers, not something the log states. Either way, it's why cache writes dominate the cost here.

The CLAUDE.md and rules files the roles keep (9k) are the biggest part of a lean start. `omitClaudeMd` is available on this CLI (>= 2.1.271). Turning it on for `reader` and `judge`, which don't write code, would take their start from about 19k to about 10k. Like every lossy cut, it has to pass this test first. (Measured later: reviewer 6.0k, judge 3.4k; it passed on reviewer and judge, see the [quality series](2026-09-27-quality-series.md).)

## X-ray's prediction

Run on the three plain runs alone, X-ray predicted a saving of **14.7k-41.6k tokens per turn** and **699k-2.0M tokens read** in total. Measured: **34.1k per turn** (52.8k -> 18.7k) and **1.60M tokens read**. Both are inside the range, for the third time in three rounds.

## Found while running

- **The workflow scripts don't load from a Windows clone.** Git for Windows checks files out with CRLF line endings (`core.autocrlf=true`), and the Workflow tool rejects a script file with carriage returns. The proof ran after converting the two `.workflow.js` files to LF in the working copy. A `.gitattributes` line (`*.js text eol=lf`) would prevent it.
- **The baseline prototype undercounts output 14x.** It takes each turn's usage from its first log line, where `output_tokens` is still partial. X-ray takes the maximum and is right: across all local logs, 71.7M tokens written, not 7M. The README's "6.8 million written" comes from the prototype.

## Limits

- One task type (code review), one small codebase, three runs per variant, on one evening.
- Quality hit the ceiling in both variants, so a small difference can't be ruled out.
- These agents are short (2-3 turns), so the fixed start is 93% of what a default agent reads. On this machine's real agents (median 16 turns) it's 41%, and X-ray estimates the whole-history saving at 7-22% of tokens read.
- Each run was its own headless session, not one shared session as in the cloud rounds. The noise floor was under 1% for tokens and ±2% for time, so this didn't add visible noise.
- One model (`claude-opus-5-5`) at one effort level (`medium`).

The claim is: **on this workflow, on this machine,** the plugin's lean roles cut tokens read by about 59% and cost by about 39%, with no loss in bugs found, and ran about 13% slower.
