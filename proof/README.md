# Proof run: plain vs lean agents

This kit runs one real multi-agent workflow twice each way and compares tokens, time and output.

- **The task:** review `target/`, a small library with six planted bugs. Each bug is a place where the code breaks its own JSDoc. `grading/key.json` lists them.
- **The workflow:** `review.workflow.js`. Three reviewers (one lens each) → three checkers → one judge that merges the lists: 7 agents. The plain and lean variants use identical prompts. The only difference is the agent type: default agents, or `lean-swarm:reviewer` and `lean-swarm:judge`. `test/proof.test.js` checks this.
- **Scoring:** `score.js` counts the planted bugs in the judge's final list (same file, line within 3) and lists other findings. It also flags any run whose agents touched `grading/`.

## Why it needs a fresh session

Claude Code loads agent definitions only when a session starts. The lean roles must be installed before the session that runs the proof begins.

**In a Claude Code on the web session,** a repository's plugin marketplace is not loaded (that needs the workspace trust prompt, which cloud sessions never show). Project agents in `.claude/agents/` do load. This repo keeps exact copies of the roles there (a test keeps them in sync), so pass `"rolePrefix": ""` in the workflow args to use them as `reviewer` and `judge` instead of `lean-swarm:reviewer` and `lean-swarm:judge`.

## Steps

1. **Start a session with the plugin loaded,** in the repo root:
   - **Local:** `claude --plugin-dir .`
   - **Or install it:** `/plugin marketplace add itayco2/Token-Optimizer`, then `/plugin install lean-swarm@lean-swarm`, then start a new session.

2. **Check the roles** (about a minute). Ask Claude:

   > Use a workflow: run the workflow script at proof/roles-check.workflow.js

   Then run X-ray on the "Transcript dir" it prints:

   ```
   node bin/lean-swarm.js xray <transcript-dir>
   ```

   Pass if every `lean-swarm:*` type starts at 30k tokens or less, has no skill listing, and returned a result.

3. **Set a budget.** Look up a similar past run in X-ray. One plain run of 7 agents reads a few million tokens, mostly cached, depending on your setup. Four runs cost about three plain runs, since the lean ones are smaller.

4. **Run it four times, alternating,** in the same session and on the same day. Replace `<abs>` with the absolute path of this repo:

   > Use a workflow: run proof/review.workflow.js with args {"variant": "plain", "target": "<abs>/proof/target"}

   Then `"lean"`, then `"plain"`, then `"lean"`. Note each run's "Transcript dir".

5. **Score the output:**

   ```
   node proof/score.js <plain-1> <lean-1> <plain-2> <lean-2>
   ```

6. **Compare tokens and time:**

   ```
   node bin/lean-swarm.js xray --compare <plain-1>,<plain-2> --vs <lean-1>,<lean-2>
   ```

   The gap between the two plain runs is the noise floor.

7. **Write it up** in `docs/proof/<date>-review.md`: both tables, the setup (CLI version, model, how many connectors and skills), the noise floor, and the limits. The claim is "on this workflow, with this setup".

## Round 2: a harder target

Round 1's target was too easy: both variants found all six bugs every time, so it couldn't show a quality difference. Its agents were also very short (about 2 turns each), which makes the token saving look bigger than it would be on longer work.

`target-2/` is a larger library (10 files) with **11 subtler planted bugs** (`grading/key-2.json`) and **15 decoys**: correct functions that look suspicious, such as a documented in-place sort or a deliberate `== null`. `test/proof2.test.js` runs the library to prove each planted bug breaks its JSDoc and each decoy doesn't.

Run it the same way, with `target-2` as the target and the round-2 key when scoring:

```
node proof/score.js --key proof/grading/key-2.json <runs...>
```

The score now also counts **decoy hits**: findings that flag correct code.

`node proof/timing.js <runs...>` breaks each run down by stage (find, verify, report). It shows turns, model time per turn, tool time, output, and whether each agent's first turn found its start already cached. Use it to explain wall-clock differences.

## Round 3: long agents

Rounds 1 and 2 used short agents (2–3 turns each). There the fixed start is about 90% of what an agent reads, so cutting it looks bigger than it is on real work, where agents run 15 or more turns and the fixed start is about 40% of their reading.

Round 3 gives the agents real coding work, so they run long:

- **The task:** `target-3/` is a small library in three areas (CSV and text, time, a filter language with sorting and grouping). Some functions are unfinished and some have bugs. The JSDoc is the spec.
- **The workflow:** `build.workflow.js`. One coder per area builds and fixes its files, running the area's tests as it goes. A read-only reviewer checks each area against its JSDoc. Then the coder fixes what the review found. That's 9 agents: plain uses default agents, lean uses `coder` and `reviewer`, with identical prompts. `test/proof3.test.js` checks this.
- **Scoring:** 112 hidden checks in `grading/hidden-3.js`, one per rule in the JSDoc. The agents only see `target-3/test/`, which covers a small part of the spec. `grading/solution-3/` is a reference that passes every check; `test/proof3.test.js` also checks that it shares the target's JSDoc word for word.

The agents edit the target, so every run needs its own copy. `run.js` makes the copies and runs each session headless:

```
node proof/run.js --workflow proof/build.workflow.js --target proof/target-3 --copy \
  --order plain,lean,plain,lean,plain,lean --out <dir> --claude <path to claude> --budget 25
node proof/score-build.js <dir>/runs.json
node bin/lean-swarm.js xray --compare <plain transcript dirs> --vs <lean transcript dirs>
```

`run.js` runs `claude -p` with this repo as `--plugin-dir` and `--permission-mode bypassPermissions`, so the agents work unattended in the copies. It records each run's transcript dir, cost and duration in `runs.json`. It also works for rounds 1 and 2 without `--copy`.

**What happened:** on Opus 5.5 the coders read the whole target in one go and wrote each file whole, so agents took a median of 3 turns, not 15, and the first plain run passed all 112 checks. The kit works, but it doesn't produce long agents, so round 4 replaced it.

## Round 4: a large real codebase

The long agents in real logs are mostly audits and investigations in big codebases, where an agent can't read everything and has to search: `grep`, then `sed -n` a range, then the next lead. Round 4 recreates that.

- **The target:** the ES-module build of date-fns 2.30.0 (MIT): 241 functions, about 15,000 lines, each function specified by its JSDoc with examples. `target-4/setup.js` builds it from the published package and plants 13 bugs, each a one-line change that breaks the function's JSDoc: 9 logic, 1 state (`toDate` stops cloning, so every function changes the caller's date) and 3 input validation. It also lists 6 decoys, correct code that looks wrong, and the lines where the `toDate` bug shows up next to another planted bug ("symptoms"). `grading/key-4.json` is the answer key; `setup.js` refuses to build a target whose planted lines don't match it.
- **The workflow:** the round-1 review workflow, unchanged: three reviewers, three checkers, one judge.

```
mkdir df && cd df && npm install date-fns@2.30.0 && cd ..   # installs its @babel/runtime too
node proof/target-4/setup.js --from df/node_modules/date-fns --out <target dir>
node proof/run.js --workflow proof/review.workflow.js --target <target dir> \
  --order plain,lean,plain,lean,plain,lean --out <dir> --claude <path to claude> --budget 30 --minutes 90
node proof/score.js --key proof/grading/key-4.json <transcript dirs>
```

The date-fns build imports a few Babel helpers; `setup.js` copies them into the target's `_babel/` (MIT, license included), from `node_modules/@babel/runtime` next to `--from`, or from `--babel <dir>`.

Two corrections to round 4, found in review and applied to every result:

- **Decoys and symptoms inside a bug's window.** A decoy can sit within 3 lines of a planted bug in the same file (`addMonths` 44 vs 46). And because the planted `toDate` bug makes other functions change the caller's date, its effects show up next to other planted bugs (`startOfWeek` 45-46, `endOfWeek` 42, `eachDayOfInterval` 47-48 and 52-54, `eachHourOfInterval` 48-49 and 53); it also made 3 of the original 9 decoys wrong, which were dropped. `score.js` now sets findings on decoys (false alarms) and on symptoms (real, but not the neighbouring bug) aside before matching bugs. No decoy or symptom covers a bug line (`setup.js` refuses one that does). Rescoring every run with the fixed key changed no result.
- **One ambiguous bug.** `addmonths-no-clamp` breaks the end-of-month rule, but `addMonths`' JSDoc never states that rule (only the code comments do), and reviewers are told the JSDoc is the spec. The key marks it `ambiguous`; `summarize.js` reports recall on the 12 unambiguous bugs and shows this one separately.

## Comparing more than two variants

To test a change to the roles or hooks, copy the plugin into another folder, change it there, and name it as a variant. It runs as `lean` from that folder, rotated with the others:

```
node proof/run.js --workflow proof/review.workflow.js --target <target dir> \
  --variants '{"omit": "<plugin copy>"}' --order plain,lean,omit,plain,lean,omit --out <dir> --claude <path to claude>
node proof/summarize.js --key proof/grading/key-4.json <dir>/runs.json [<more runs.json> ...]
```

`summarize.js` groups runs by variant: recall with a 90% bootstrap interval against `plain`, a per-bug found rate, false alarms, tokens read per run and per turn, turns, cost and wall-clock. Runs that errored or left no transcripts are counted, not silently dropped. `run.js` appends to an existing `runs.json`, so a series can be extended later, and a session that times out is recorded as an error without stopping the series.

The quality series (`docs/proof/2026-09-27-quality-series.md`) built its variants this way, each a copy of the plugin (`.claude-plugin/` and `agents/`) with one change:

| Variant | Change to the copy |
|---|---|
| omit | `omitClaudeMd: true` in `reviewer` and `judge` (now the shipped roles) |
| next / strong | omit, plus `hooks/hooks.json` registering a copy of the nudge script as a `PostToolBatch` command hook, its wording fixed (soft or strong). Both wordings are now in `proof/variants/batch-nudge.js`, which takes `soft` or `strong` as its argument |
| mirror | the role's one-line prompt replaced by the default workflow agent's: "You are a subagent spawned by a workflow orchestration script. Use the tools available to complete the task." |

A copy that registers a hook needs a `package.json` with `"type": "module"` next to it, because the hook script is an ES module.
