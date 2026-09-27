# Proof round 4, raw output (2026-09-26)

Write-up: [2026-09-26-long-agents.md](2026-09-26-long-agents.md). Claude Code 2.1.281, headless, `node proof/run.js --workflow proof/review.workflow.js` on the date-fns target from `proof/target-4/setup.js`.

## Runs (from runs.json)

| # | Variant | Transcript dir | Workflow duration | Session cost, orchestrator included |
|---:|---|---|---:|---:|
| 1 | plain | wf_5a85c6b4-5d6 | 202.5 s | $4.45 |
| 2 | lean | wf_a17e2ff6-77f | 194.9 s | $4.72 |
| 3 | plain | wf_e8fd2f31-2da | 316.3 s | $5.89 |
| 4 | lean | wf_3255594b-736 | 241.7 s | $4.73 |
| 5 | plain | wf_9314a77b-9c4 | 177.4 s | $5.57 |
| 6 | lean | wf_ec1c0940-da6 | 192.9 s | $5.02 |

## SCORE
| Run | Variant | Planted bugs found | Found | Missed | Other findings | Decoy hits | Touched answer key |
|---|---|---:|---|---|---:|---|---|
| wf_5a85c6b4-5d6 | plain | 13/13 | todate-no-clone, startofweek-same-day, eachday-drops-end, overlap-inclusive-asymmetric, addmonths-no-clamp, nextday-same-day, leapyear-400, quarter-january, isoday-sunday, withininterval-end, endofweek-nan, eachhour-step-nan, nearestto-range | - | 1 | 0 | no |
| wf_a17e2ff6-77f | lean | 12/13 | todate-no-clone, startofweek-same-day, eachday-drops-end, overlap-inclusive-asymmetric, nextday-same-day, leapyear-400, quarter-january, isoday-sunday, withininterval-end, endofweek-nan, eachhour-step-nan, nearestto-range | addmonths-no-clamp | 0 | 0 | no |
| wf_e8fd2f31-2da | plain | 12/13 | todate-no-clone, startofweek-same-day, eachday-drops-end, overlap-inclusive-asymmetric, nextday-same-day, leapyear-400, quarter-january, isoday-sunday, withininterval-end, endofweek-nan, eachhour-step-nan, nearestto-range | addmonths-no-clamp | 1 | 0 | no |
| wf_3255594b-736 | lean | 12/13 | todate-no-clone, startofweek-same-day, eachday-drops-end, overlap-inclusive-asymmetric, nextday-same-day, leapyear-400, quarter-january, isoday-sunday, withininterval-end, endofweek-nan, eachhour-step-nan, nearestto-range | addmonths-no-clamp | 0 | 0 | no |
| wf_9314a77b-9c4 | plain | 13/13 | todate-no-clone, startofweek-same-day, eachday-drops-end, overlap-inclusive-asymmetric, addmonths-no-clamp, nextday-same-day, leapyear-400, quarter-january, isoday-sunday, withininterval-end, endofweek-nan, eachhour-step-nan, nearestto-range | - | 1 | 0 | no |
| wf_ec1c0940-da6 | lean | 12/13 | todate-no-clone, startofweek-same-day, eachday-drops-end, overlap-inclusive-asymmetric, nextday-same-day, leapyear-400, quarter-january, isoday-sunday, withininterval-end, endofweek-nan, eachhour-step-nan, nearestto-range | addmonths-no-clamp | 1 | 0 | no |

## COMPARE plain vs lean
# X-ray compare: 3 runs (A) vs 3 runs (B)

| Measure | A | B | Change |
|---|---:|---:|---:|
| Runs | 3 | 3 | 0% |
| Agents per run | 7 | 7 | 0% |
| Tokens read per run | 6.4M | 4.9M | -23% |
|   cache read | 5.8M | 4.4M | -24% |
|   cache write | 595.9k | 548.1k | -8% |
|   uncached | 123 | 131 | +6% |
| Tokens written per run | 36.2k | 38.5k | +6% |
| API-price equivalent per run (USD) | $4.86 | $4.38 | -10% |
| Median first-turn context | 52.3k | 19.0k | -64% |
| Fixed-start share of tokens read | 50% | 24% | -51% |
| Turns per run | 61.7 | 65.7 | +6% |
| Wall-clock per run (min) | 3.9 | 3.5 | -10% |
| Unknown-tool errors | 0 | 0 | - |

A agent types: workflow-subagent x21.

B agent types: lean-swarm:reviewer x18, lean-swarm:judge x3.

## NOISE plain wf_5a85c6b4-5d6 vs wf_e8fd2f31-2da
| Tokens read per run | 4.6M | 8.0M | +73% |
| Tokens written per run | 30.4k | 41.0k | +35% |
| API-price equivalent per run (USD) | $4.00 | $5.45 | +36% |
| Turns per run | 53 | 73 | +38% |
| Wall-clock per run (min) | 3.4 | 5.3 | +56% |

## NOISE plain wf_5a85c6b4-5d6 vs wf_9314a77b-9c4
| Tokens read per run | 4.6M | 6.4M | +38% |
| Tokens written per run | 30.4k | 37.0k | +22% |
| API-price equivalent per run (USD) | $4.00 | $5.13 | +28% |
| Turns per run | 53 | 59 | +11% |
| Wall-clock per run (min) | 3.4 | 3.0 | -12% |

## NOISE plain wf_e8fd2f31-2da vs wf_9314a77b-9c4
| Tokens read per run | 8.0M | 6.4M | -20% |
| Tokens written per run | 41.0k | 37.0k | -10% |
| API-price equivalent per run (USD) | $5.45 | $5.13 | -6% |
| Turns per run | 73 | 59 | -19% |
| Wall-clock per run (min) | 5.3 | 3.0 | -44% |

## NOISE lean wf_a17e2ff6-77f vs wf_3255594b-736
| Tokens read per run | 5.0M | 4.3M | -13% |
| Tokens written per run | 41.0k | 36.8k | -10% |
| API-price equivalent per run (USD) | $4.28 | $4.29 | +0% |
| Turns per run | 66 | 63 | -5% |
| Wall-clock per run (min) | 3.2 | 4.0 | +24% |

## NOISE lean wf_a17e2ff6-77f vs wf_ec1c0940-da6
| Tokens read per run | 5.0M | 5.4M | +9% |
| Tokens written per run | 41.0k | 37.6k | -8% |
| API-price equivalent per run (USD) | $4.28 | $4.58 | +7% |
| Turns per run | 66 | 68 | +3% |
| Wall-clock per run (min) | 3.2 | 3.2 | -1% |

## NOISE lean wf_3255594b-736 vs wf_ec1c0940-da6
| Tokens read per run | 4.3M | 5.4M | +24% |
| Tokens written per run | 36.8k | 37.6k | +2% |
| API-price equivalent per run (USD) | $4.29 | $4.58 | +7% |
| Turns per run | 63 | 68 | +8% |
| Wall-clock per run (min) | 4.0 | 3.2 | -20% |

## TIMING
| Run | Variant | Wall (s) | Stage | Agents | Median agent (s) | Slowest agent (s) | Turns | Model s/turn | Tool time (s) | Output tokens | of which thinking | Median first turn | First turn cached |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| wf_5a85c6b4-5d6 | plain | 202.4 | verify | 3 | 11.2 | 16.9 | 6 | 4.4 | 3.2 | 3803 | 585 | 52.4k | 42% |
| wf_5a85c6b4-5d6 | plain | 202.4 | find | 3 | 106.7 | 173.8 | 46 | 5.6 | 111.2 | 25022 | 11460 | 51.4k | 43% |
| wf_5a85c6b4-5d6 | plain | 202.4 | report | 1 | 11.7 | 11.7 | 1 | 9.4 | 0.0 | 1603 | 91 | 54.3k | 41% |
| wf_a17e2ff6-77f | lean | 194.8 | report | 1 | 11.6 | 11.6 | 1 | 11.5 | 0.0 | 1481 | 118 | 19k | 0% |
| wf_a17e2ff6-77f | lean | 194.8 | verify | 3 | 16.5 | 17.2 | 6 | 7.3 | 3.3 | 4872 | 699 | 19.3k | 23% |
| wf_a17e2ff6-77f | lean | 194.8 | find | 3 | 151.0 | 168.4 | 59 | 6.6 | 68.3 | 34691 | 14143 | 18.1k | 24% |
| wf_e8fd2f31-2da | plain | 316.2 | verify | 3 | 17.8 | 19.5 | 6 | 5.6 | 2.5 | 4946 | 967 | 53k | 42% |
| wf_e8fd2f31-2da | plain | 316.2 | find | 3 | 171.9 | 282.2 | 66 | 5.5 | 168.6 | 34287 | 15366 | 51.4k | 43% |
| wf_e8fd2f31-2da | plain | 316.2 | report | 1 | 13.3 | 13.3 | 1 | 9.9 | 0.0 | 1806 | 306 | 54.9k | 40% |
| wf_3255594b-736 | lean | 241.6 | verify | 3 | 22.7 | 23.0 | 7 | 8.6 | 3.5 | 4864 | 712 | 19.5k | 23% |
| wf_3255594b-736 | lean | 241.6 | find | 3 | 178.6 | 201.9 | 55 | 7.9 | 70.9 | 30568 | 14303 | 18.1k | 24% |
| wf_3255594b-736 | lean | 241.6 | report | 1 | 14.8 | 14.8 | 1 | 14.8 | 0.0 | 1415 | 136 | 18.9k | 0% |
| wf_9314a77b-9c4 | plain | 177.3 | find | 3 | 142.3 | 146.3 | 51 | 6.1 | 69.8 | 30082 | 13898 | 51.7k | 43% |
| wf_9314a77b-9c4 | plain | 177.3 | verify | 3 | 17.4 | 18.3 | 7 | 5.3 | 3.2 | 5212 | 1041 | 52.8k | 42% |
| wf_9314a77b-9c4 | plain | 177.3 | report | 1 | 12.7 | 12.7 | 1 | 10.1 | 0.0 | 1745 | 168 | 55.2k | 40% |
| wf_ec1c0940-da6 | lean | 192.8 | verify | 3 | 17.4 | 19.9 | 8 | 6.2 | 3.4 | 5297 | 697 | 19.3k | 23% |
| wf_ec1c0940-da6 | lean | 192.8 | find | 3 | 128.8 | 159.7 | 59 | 6.1 | 53.8 | 30717 | 11841 | 18.1k | 24% |
| wf_ec1c0940-da6 | lean | 192.8 | report | 1 | 11.9 | 11.9 | 1 | 11.9 | 0.0 | 1581 | 121 | 19.1k | 0% |

Tool calls per run:
- wf_5a85c6b4-5d6 (plain): Bash x42, StructuredOutput x7, Read x5, Glob x2
- wf_a17e2ff6-77f (lean): Bash x46, Read x13, StructuredOutput x7, Glob x1
- wf_e8fd2f31-2da (plain): Bash x50, Read x16, StructuredOutput x7, Glob x3
- wf_3255594b-736 (lean): Bash x33, Read x15, StructuredOutput x7, Grep x6, Glob x3
- wf_9314a77b-9c4 (plain): Bash x42, Read x9, StructuredOutput x7, PowerShell x1
- wf_ec1c0940-da6 (lean): Bash x43, Read x15, StructuredOutput x7, Grep x3, Glob x2

## PREDICTION (plain runs only)
- **Lean roles would save:** about 14%-40% of tokens read (2.7M-7.6M). See "What you could cut".

## Tokens by kind

| Kind | Tokens | Share of tokens | Share of cost |
|---|---:|---:|---:|
| Cache read | 17.3M | 90.1% | 23.7% |
| Cache write | 1.8M | 9.3% | 61.4% |
| Uncached input | 370 | 0.0% | 0.0% |
| Output | 108.5k | 0.6% | 14.9% |

## Fixed start by agent type

| Agent type | Agents | Median first turn | Median turns | Fixed share of tokens read |
|---|---:|---:|---:|---:|
| workflow-subagent | 21 | 52.3k | 2 | 50% |

## What fills the first turn

Median tokens per agent. Where the log holds tool definitions (CLI 2.1.250 and nearby), the billed first-turn total is split by each part's share of characters. Where it doesn't (newer versions), logged parts are estimated from their length and the rest is shown as "not in the log".

| Part | workflow-subagent |
|---|---:|
| System prompt | 533 |
| Not in the log (mostly tool definitions) | 26.8k |
| Instruction files (CLAUDE.md) | 2.6k |
| Rules files | 6.4k |
| Skill listing | 11.1k |
| Deferred-tool listing | 3.6k |
| Task | 789 |
| Other attachments | 511 |

## Tool use

Share of agents that called each tool at least once.

| Tool | Agents | Share |
|---|---:|---:|
| StructuredOutput | 21 | 100.0% |
| Bash | 16 | 76.2% |
| Read | 6 | 28.6% |
| Glob | 5 | 23.8% |
| PowerShell | 1 | 4.8% |
| Any browser tool |  | 0.0% |

## Where the time went

| Spent on | Agent time | Share |
|---|---:|---:|
| Model | 17.6 min | 71.6% |
| Bash | 5.8 min | 23.7% |
| other | 1.0 min | 4.1% |
| Read | 0.1 min | 0.5% |
| PowerShell | 0.0 min | 0.1% |
| Glob | 0.0 min | 0.1% |
| StructuredOutput | 0.0 min | 0.0% |

98% of turns made exactly one tool call; 1.03 calls per turn; about 8 s per turn; median 2 turns per agent.

## Models

| Model | Turns | Share |
|---|---:|---:|
| claude-opus-5-5 | 185 | 100.0% |

3 of 3 runs ran 95% or more of their turns on Opus.

## What you could cut

Each lean role loads only the tools it lists, which also drops the skill listing and the deferred-tool listing. The saving is re-read on every turn, so it counts once per turn. A range means the log does not hold the tool definitions.

| Agent type | Agents | Fits role | Median start | Saved per turn | Tokens read saved |
|---|---:|---:|---:|---:|---:|
| workflow-subagent | 21 | reviewer (81%) | 52.3k | 14.7k-41.5k | 2.7M-7.6M |

Roles: **judge** (Read), **reader** (Read, Grep, Glob), **reviewer** (Read, Grep, Glob, Bash), **researcher** (WebSearch, WebFetch, Read, Grep, Glob, Bash), **coder** (Read, Grep, Glob, Edit, Write, Bash). "none" means the agent called a tool no role has.

## PER TYPE (all 6)
## Fixed start by agent type

| Agent type | Agents | Median first turn | Median turns | Fixed share of tokens read |
|---|---:|---:|---:|---:|
| workflow-subagent | 21 | 52.3k | 2 | 50% |
| lean-swarm:reviewer | 18 | 19.0k | 16 | 24% |
| lean-swarm:judge | 3 | 19.0k | 1 | 100% |

## What fills the first turn

## FIRST TURN MAKEUP (all 6)
## What fills the first turn

Median tokens per agent. Where the log holds tool definitions (CLI 2.1.250 and nearby), the billed first-turn total is split by each part's share of characters. Where it doesn't (newer versions), logged parts are estimated from their length and the rest is shown as "not in the log".

| Part | workflow-subagent | lean-swarm:reviewer | lean-swarm:judge |
|---|---:|---:|---:|
| System prompt | 533 | 503 | 503 |
| Not in the log (mostly tool definitions) | 26.8k | 8.3k | 6.5k |
| Instruction files (CLAUDE.md) | 2.6k | 2.6k | 2.6k |
| Rules files | 6.4k | 6.4k | 6.4k |
| Skill listing | 11.1k | 0 | 0 |
| Deferred-tool listing | 3.6k | 0 | 0 |
| Task | 789 | 948 | 2.8k |
| Other attachments | 511 | 289 | 289 |

## Tool use

## Tokens read per turn

```
plain  wf_5a85c6b4-5d6 read 4.63M turns 53 per turn 87.4k
lean   wf_a17e2ff6-77f read 4.98M turns 66 per turn 75.4k
plain  wf_e8fd2f31-2da read 8.04M turns 73 per turn 110.1k
lean   wf_3255594b-736 read 4.35M turns 63 per turn 69.0k
plain  wf_9314a77b-9c4 read 6.40M turns 59 per turn 108.5k
lean   wf_ec1c0940-da6 read 5.41M turns 68 per turn 79.5k
```

## Where a find-stage agent's reading goes (scratch analysis, chars calibrated to measured context growth)

```

plain: 9 find-stage agents over 3 runs, 18.1 turns each, 1.97M tokens read each (chars/token ~2.1)
  fixed start re-read:       47%
  tool output re-read:       49%   of which 5+ turns old: 24%
  model output re-read:      2%
  other / unexplained:       2%
  library files opened per run: 35, opened by 2+ agents: 9

lean: 9 find-stage agents over 3 runs, 19.2 turns each, 1.57M tokens read each (chars/token ~2.1)
  fixed start re-read:       22%
  tool output re-read:       73%   of which 5+ turns old: 35%
  model output re-read:      3%
  other / unexplained:       2%
  library files opened per run: 30, opened by 2+ agents: 11
```
