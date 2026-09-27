# Quality series, raw output (2026-09-27)

Write-up: [2026-09-27-quality-series.md](2026-09-27-quality-series.md). Target: `proof/target-4` (date-fns 2.30.0 with 13 planted bugs, one marked ambiguous). Workflow: `proof/review.workflow.js`. Claude Code 2.1.281 headless via `proof/run.js`, Opus 5.5 at medium effort.

Variants: **plain** = default workflow agents; **lean** = this repo's roles; **omit** = lean with `omitClaudeMd: true` on reviewer and judge; **next** = omit plus the `PostToolBatch` nudge; **strong** = omit plus the same hook with firmer wording; **mirror** = lean with the default workflow agent's one-line prompt as the role body. Round 4's six runs (2026-09-26) are included for plain and lean. Scored with the decoy fix in `proof/score.js`.

## All review runs: `node proof/summarize.js --key proof/grading/key-4.json <round-4> <series> <follow-up> <strong>`

| Variant | Runs | Bugs found (of 12 unambiguous; mean, range) | Recall vs plain (90% CI, points) | All 13 bugs | Other findings per run | Decoy hits | Tokens read per run | per turn | Turns per run | Cost per run | Wall-clock | Median first turn |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| plain | 12 | 12.0/12 (12-12) | - | 12.2/13 | 0.5 | 0 | 6.61M | 103.5k | 63.9 | $4.98 | 3.5 min | 52.3k |
| lean | 12 | 12.0/12 (12-12) | +0.0 (+0.0 to +0.0) | 12.0/13 | 0.2 | 0 | 4.74M (-28%) | 76.1k (-26%) | 62.3 | $4.28 (-14%) | 3.5 min (-0%) | 18.9k |
| next | 5 | 12.0/12 (12-12) | +0.0 (+0.0 to +0.0) | 12.0/13 | 0.4 | 0 | 2.89M (-56%) | 56.2k (-46%) | 51.4 | $2.98 (-40%) | 3.0 min (-14%) | 5.6k |
| omit | 5 | 12.0/12 (12-12) | +0.0 (+0.0 to +0.0) | 12.0/13 | 0.6 | 0 | 3.19M (-52%) | 54.5k (-47%) | 58.6 | $3.08 (-38%) | 3.0 min (-14%) | 5.6k |
| mirror | 4 | 12.0/12 (12-12) | +0.0 (+0.0 to +0.0) | 12.0/13 | 0.0 | 0 | 4.24M (-36%) | 66.7k (-36%) | 63.5 | $3.87 (-22%) | 3.3 min (-7%) | 18.5k |
| strong | 5 | 12.0/12 (12-12) | +0.0 (+0.0 to +0.0) | 12.0/13 | 0.8 | 0 | 2.92M (-56%) | 57.1k (-45%) | 51.2 | $3.07 (-38%) | 3.0 min (-15%) | 5.6k |

Per-bug found rate:

| Bug | plain | lean | next | omit | mirror | strong |
|---|---:|---:|---:|---:|---:|---:|
| todate-no-clone | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |
| startofweek-same-day | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |
| eachday-drops-end | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |
| overlap-inclusive-asymmetric | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |
| addmonths-no-clamp (ambiguous) | 2/12 | 0/12 | 0/5 | 0/5 | 0/4 | 0/5 |
| nextday-same-day | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |
| leapyear-400 | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |
| quarter-january | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |
| isoday-sunday | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |
| withininterval-end | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |
| endofweek-nan | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |
| eachhour-step-nan | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |
| nearestto-range | 12/12 | 12/12 | 5/5 | 5/5 | 4/4 | 5/5 |

addmonths-no-clamp is ambiguous: the JSDoc does not state the end-of-month rule; only the code comments do.

strong: 4 runs left out (session error)

## Series runs (next, omit, lean, plain)

| # | Variant | Transcript dir | Started (UTC) | Workflow duration | Session cost, orchestrator included |
|---:|---|---|---|---:|---:|
| 1 | next | wf_3f3e91bc-908 | 2026-09-26T23:13:40 | 203.7 s | $3.51 |
| 2 | omit | wf_1801cc3d-59b | 2026-09-26T23:17:16 | 179.7 s | $3.39 |
| 3 | lean | wf_183b8026-473 | 2026-09-26T23:20:30 | 218.3 s | $4.49 |
| 4 | plain | wf_4d60fb60-acb | 2026-09-26T23:24:24 | 163.7 s | $4.91 |
| 5 | next | wf_0139b7b0-558 | 2026-09-26T23:27:21 | 149.3 s | $2.84 |
| 6 | omit | wf_f02e494b-0ea | 2026-09-26T23:30:03 | 167.7 s | $3.25 |
| 7 | lean | wf_407fff74-fe4 | 2026-09-26T23:33:05 | 214.0 s | $5.40 |
| 8 | plain | wf_c6dde653-71e | 2026-09-26T23:36:52 | 129.8 s | $4.47 |
| 9 | next | wf_7460dfb7-023 | 2026-09-26T23:39:16 | 158.4 s | $3.50 |
| 10 | omit | wf_561c6ed3-0a6 | 2026-09-26T23:42:07 | 173.3 s | $3.44 |
| 11 | lean | wf_e1b3f716-710 | 2026-09-26T23:45:14 | 215.0 s | $6.21 |
| 12 | plain | wf_1674c9dd-9df | 2026-09-26T23:49:01 | 181.6 s | $5.62 |
| 13 | next | wf_5ec27513-65b | 2026-09-26T23:52:14 | 173.5 s | $3.26 |
| 14 | omit | wf_7b21984d-905 | 2026-09-26T23:55:20 | 153.4 s | $3.06 |
| 15 | lean | wf_7000659c-336 | 2026-09-26T23:58:07 | 188.4 s | $4.61 |
| 16 | plain | wf_511a31cd-492 | 2026-09-27T00:01:28 | 237.4 s | $6.13 |
| 17 | next | wf_23a0beb8-c7a | 2026-09-27T00:05:38 | 224.9 s | $4.19 |
| 18 | omit | wf_75754829-8b2 | 2026-09-27T00:09:42 | 239.2 s | $4.45 |
| 19 | lean | wf_4403e578-862 | 2026-09-27T00:13:53 | 160.8 s | $3.78 |
| 20 | plain | wf_089b4f1a-423 | 2026-09-27T00:16:46 | 286.7 s | $5.68 |

## Follow-up runs (mirror, lean, plain)

| # | Variant | Transcript dir | Started (UTC) | Workflow duration | Session cost, orchestrator included |
|---:|---|---|---|---:|---:|
| 1 | mirror | wf_eb3f6488-598 | 2026-09-27T00:21:50 | 204.3 s | $4.62 |
| 2 | lean | wf_fc1153bc-e73 | 2026-09-27T00:25:27 | 164.9 s | $4.11 |
| 3 | plain | wf_504c0527-b44 | 2026-09-27T00:28:26 | 235.3 s | $5.44 |
| 4 | mirror | wf_173314c3-596 | 2026-09-27T00:32:38 | 175.4 s | $3.75 |
| 5 | lean | wf_ed3640af-cc2 | 2026-09-27T00:35:46 | 188.4 s | $4.66 |
| 6 | plain | wf_18b3cae3-29c | 2026-09-27T00:39:08 | 196.2 s | $5.26 |
| 7 | mirror | wf_c68b7a52-0c0 | 2026-09-27T00:42:37 | 166.4 s | $4.48 |
| 8 | lean | wf_f76d98d1-cd1 | 2026-09-27T00:45:37 | 352.1 s | $3.69 |
| 9 | plain | wf_333d0265-817 | 2026-09-27T00:51:45 | 177.6 s | $5.15 |
| 10 | mirror | wf_751deafc-c51 | 2026-09-27T00:54:56 | 246.7 s | $4.37 |
| 11 | lean | wf_f29aeeb9-b4e | 2026-09-27T00:59:16 | 212.3 s | $5.19 |
| 12 | plain | wf_7888195e-65e | 2026-09-27T01:03:01 | 240.3 s | $6.44 |

## Round 4 runs (plain, lean)

| # | Variant | Transcript dir | Started (UTC) | Workflow duration | Session cost, orchestrator included |
|---:|---|---|---|---:|---:|
| 1 | plain | wf_5a85c6b4-5d6 |  | 202.5 s | $4.45 |
| 2 | lean | wf_a17e2ff6-77f |  | 194.9 s | $4.72 |
| 3 | plain | wf_e8fd2f31-2da |  | 316.3 s | $5.89 |
| 4 | lean | wf_3255594b-736 |  | 241.7 s | $4.73 |
| 5 | plain | wf_9314a77b-9c4 |  | 177.4 s | $5.57 |
| 6 | lean | wf_ec1c0940-da6 |  | 192.9 s | $5.02 |

## Coder role: round-3 task (`proof/build.workflow.js` on copies of `proof/target-3`)

Scored with `node proof/score-build.js` (112 hidden checks, strengthened after review; the first plain run, from 2026-09-26, is re-scored with them). Three more sessions (lean, plain, lean) hit the account's usage limit at 01:13 UTC before starting work and were rerun after it reset; they are left out.

| Run | Variant | Hidden checks | text | time | query | Visible tests | Touched answer key |
|---|---|---:|---:|---:|---:|---:|---|
| wf_e98abe70-da3 | plain | 112/112 | 42/42 | 34/34 | 36/36 | 16/16 | no |
| wf_760106b5-15e | lean | 112/112 | 42/42 | 34/34 | 36/36 | 16/16 | no |
| wf_b11610a1-b6e | plain | 112/112 | 42/42 | 34/34 | 36/36 | 16/16 | no |
| wf_235a2c97-44f | lean | 112/112 | 42/42 | 34/34 | 36/36 | 16/16 | no |

`xray --compare <plain> --vs <lean>`:

| Measure | A | B | Change |
|---|---:|---:|---:|
| Runs | 2 | 2 | 0% |
| Agents per run | 9 | 9 | 0% |
| Tokens read per run | 2.4M | 1.1M | -53% |
|   cache read | 1.9M | 868.9k | -55% |
|   cache write | 432.8k | 242.7k | -44% |
|   uncached | 76 | 77 | +1% |
| Tokens written per run | 45.2k | 43.0k | -5% |
| API-price equivalent per run (USD) | $3.45 | $2.25 | -35% |
| Median first-turn context | 51.7k | 18.8k | -64% |
| Fixed-start share of tokens read | 83% | 65% | -22% |
| Turns per run | 38 | 38.5 | +1% |
| Wall-clock per run (min) | 3.7 | 3.3 | -12% |
| Unknown-tool errors | 0 | 0 | - |

## Strong-nudge runs

| # | Variant | Transcript dir | Started (UTC) | Workflow duration | Session cost, orchestrator included |
|---:|---|---|---|---:|---:|
| 1 | strong | wf_22367647-a36 | 2026-09-27T01:07:19 | 182.9 s | $3.07 |
| 2 | strong | - | 2026-09-27T01:10:35 | - | $3.24 (error: account session usage limit reached) |
| 3 | strong | - | 2026-09-27T01:13:19 | - | $0.00 (error: account session usage limit reached) |
| 4 | strong | - | 2026-09-27T01:13:24 | - | $0.00 (error: account session usage limit reached) |
| 5 | strong | - | 2026-09-27T01:13:30 | - | $0.00 (error: account session usage limit reached) |
| 6 | strong | wf_2bfa09e1-d3b | 2026-09-27T04:22:56 | 165.8 s | $3.43 |
| 7 | strong | wf_2da10afb-739 | 2026-09-27T04:25:56 | 148.0 s | $2.94 |
| 8 | strong | wf_2a5c381c-186 | 2026-09-27T04:28:38 | 155.8 s | $3.27 |
| 9 | strong | wf_33e131fd-b4d | 2026-09-27T04:31:27 | 249.8 s | $4.83 |

Batching, find-stage turns with 2 or more tool calls: omit 5 of 254 (2%), next 17 of 220 (8%), strong 44 of 218 (20%).
