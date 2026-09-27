# Lean-Swarm

**A free Claude Code plugin that cuts the tokens of multi-agent runs, like ultracode, without making the agents worse.**

**[בעברית](#בעברית)**

## Install

In Claude Code:

```
/plugin marketplace add itayco2/Lean-Swarm
/plugin install lean-swarm@lean-swarm
```

Start a new session. That's it: the workflows Claude writes for you, ultracode included, now use five lean agent types (reader, researcher, coder, reviewer, judge) that load only the tools they use. A review agent starts with about 6k tokens instead of about 52k.

From a terminal, the same commands work with `claude plugin` in place of `/plugin`. To remove it: `claude plugin uninstall lean-swarm@lean-swarm`.

**What it did in our test:** the same ultracode prompt ("review this library for bugs") on a 15,000-line library with 13 planted bugs, Claude Code 2.1.281, Opus 5.5, one run each, nothing set up besides the install:

| | Default agents | With Lean-Swarm |
|---|---:|---:|
| Agents | 10 | 15, all lean |
| First turn per agent (median) | 52.6k | 6.5k |
| Tokens read by the agents | 11.5M | 4.2M (-64%) |
| Session cost (API prices) | $10.58 | $6.44 (-39%) |
| Planted bugs found | 13 of 13 | 13 of 13 |

One run per side, so treat the numbers as an example ([write-up](docs/proof/2026-09-27-ultracode.md)); the [Results](#results) below come from repeated runs.

**What it adds to every session:** about 500 tokens, for the five agent descriptions and one line at session start that tells Claude to use them in the workflows it writes. On a small job, ultracode may do the work itself without starting agents; then the plugin changes nothing.

## See where your tokens go (optional)

X-ray reads your local Claude Code logs and shows where the tokens of your multi-agent runs go, and what lean roles would save. It needs Node 22 or later, changes and sends nothing, and hides project names and paths unless you add `--show-paths`.

```
npx github:itayco2/Lean-Swarm xray
```

It needs at least one past run with subagents or a workflow. After your next workflow with the plugin, the "Fixed start by agent type" table should list `lean-swarm:` agent types.

<div dir="rtl">

## בעברית

פלאגין חינמי בקוד פתוח ל-Claude Code, שחותך את הטוקנים של ריצות עם כמה סוכנים, כמו ultracode, בלי לפגוע בתוצאה.

**התקנה.** בתוך Claude Code מריצים:

<div dir="ltr">

```
/plugin marketplace add itayco2/Lean-Swarm
/plugin install lean-swarm@lean-swarm
```

</div>

פותחים סשן חדש, וזהו. מעכשיו ה-workflows ש-Claude כותב, כולל ultracode, משתמשים בחמישה סוגי סוכנים רזים שטוענים רק את הכלים שהם צריכים. סוכן בדיקת קוד מתחיל עם כ-6 אלף טוקנים במקום כ-52 אלף.

בבדיקה שלנו, אותו פרומפט של ultracode על ספרייה של 15 אלף שורות: עם הפלאגין הסוכנים קראו בערך שליש מהטוקנים, הריצה עלתה בערך 40% פחות, ושתי הריצות מצאו את כל 13 הבאגים ששתלנו. ריצה אחת לכל צד, הטבלה המלאה באנגלית למעלה.

הפלאגין מוסיף כ-500 טוקנים לכל סשן. להסרה, בטרמינל: `claude plugin uninstall lean-swarm@lean-swarm`

**רוצים לראות לאן הולכים הטוקנים אצלכם?** זה לא חובה. צריך Node 22 ומעלה. הפקודה רק קוראת את הלוגים המקומיים של Claude Code, לא משנה שום קובץ ולא שולחת שום דבר החוצה:

<div dir="ltr">

```
npx github:itayco2/Lean-Swarm xray
```

</div>

</div>

## Where the tokens go

When Claude Code runs several agents at once (workflows or parallel subagents), almost none of the tokens are the agents' own work. Measured with X-ray across 254 runs and 2,459 agents on one heavy setup (2026-09-26):

- 10.25 billion tokens read, 72 million written (0.7%). Agents mostly re-read context.
- 41% of all tokens read is each agent's fixed start: tool definitions, instruction files and listings, loaded before the task and re-read on every turn.
- A default workflow agent's first turn was 52-69k tokens. The task in it was about 1k.
- Agents never called most of what they loaded: Artifact 0% of agents, Skill 0.2%, browser tools 4%.
- 70% of agents ran 10 or more turns, and they read 97% of all tokens.

This repo has three parts:

1. **X-ray,** a command that shows these numbers for your own runs, and predicts what lean roles would save.
2. **Lean roles,** five agent types that load only what they use.
3. **A proof kit** that runs a real multi-agent workflow both ways on code with planted bugs, and measures tokens, cost, time and bugs found.

## Results

Same 7-agent review workflow (3 reviewers -> 3 checkers -> 1 judge), same prompts, default agents vs lean roles, Opus 5.5:

| | Short agents (2-3 turns each) | Long agents (reviewers ran 8-30 turns, median about 17; 15k-line codebase) |
|---|---|---|
| Runs | 2-3 per side, 3 rounds | 12 default vs 5 with the current roles |
| Bugs found | all, both sides, every run | **all 12 unambiguous bugs, both sides, every run** |
| False alarms on decoys | 0 | 0 |
| Tokens read per run | **-59% to -83%** | **-52%** |
| Tokens read per turn | - | **-47%** |
| Cost (API prices) | -36% to -62% | **-38%** |
| Wall-clock | +12% to +16% (slower) | no clear change (-14% pooled, within run-to-run noise) |

- **Long agents are what matter:** they read 97% of the tokens in real use. They save less than short ones because more of what they re-read is their own tool output, not the fixed start.
- **Quality:** a 13th planted bug had an ambiguous spec (its JSDoc doesn't state the rule it breaks). Default agents reported it twice, both in the first 3 runs; nobody reported it in the 40 runs after. No supported difference. Details and limits: [quality series](docs/proof/2026-09-27-quality-series.md).
- **Coding:** lean coders finishing a small library passed all 112 hidden checks in every run, like default agents, with 53% fewer tokens and 35% lower cost (2 runs each).
- X-ray predicted the saving per turn from the default runs alone, and the measured saving fell inside its range in every round (long agents: 23.6k-50.5k predicted, 49k measured). The long-agent total came out a little above its predicted 22-47%, because the lean runs also took fewer turns.

## X-ray

Needs Node 22 or later. It only reads your local logs; it changes nothing and sends nothing anywhere.

```
npx github:itayco2/Lean-Swarm xray
```

Or from a clone: `node bin/lean-swarm.js xray`.

| Command | What it does |
|---|---|
| `xray` | every run under `~/.claude/projects` |
| `xray <run-dir> ...` | only these runs |
| `xray --since 2026-09-01` | only runs since a date |
| `xray --compare <dirs> --vs <dirs>` | before vs after, side by side |
| `--json`, `--top N`, `--out FILE` | output options |
| `--show-paths` | include project names and paths. Off by default, so a report is safe to share |

The report covers tokens by kind, the fixed start and what fills it, which tools agents actually call, where the time goes, duplicate reads across agents, models, and **what lean roles would save on your runs**. Every number is defined in [docs/method.md](docs/method.md).

## Lean roles

| Role | Tools | Starts without CLAUDE.md and rules | Use for |
|---|---|:---:|---|
| `reader` | Read, Grep, Glob | | mapping and understanding |
| `researcher` | WebSearch, WebFetch, Read, Grep, Glob, Bash | | web and paper research |
| `coder` | Read, Grep, Glob, Edit, Write, Bash | | building and fixing |
| `reviewer` | Read, Grep, Glob, Bash | yes | review and audit |
| `judge` | Read | yes | verdicts and synthesis |

A tools allowlist also drops the skill listing and the deferred-tool listing, so the start shrinks much more than the tools alone. `reviewer` and `judge` also set `omitClaudeMd`, which drops your CLAUDE.md files and `~/.claude/rules` files from their start; they passed the quality test with it. Measured first turns:

| Setup | Default agent | Allowlist | Allowlist + `omitClaudeMd` |
|---|---:|---:|---:|
| Heavy local setup, Claude Code 2.1.281 | 52.3k | 18.9k | **5.6k** |
| Claude Code on the web, 2.1.282, 225 deferred tools | 45.1k | 8.7k | - |

**Install:**

```
/plugin marketplace add itayco2/Lean-Swarm
/plugin install lean-swarm@lean-swarm
```

Then start a new session: agent definitions load only when a session starts.

**Use:** nothing to do. The plugin adds one line at session start that tells Claude to give the agents of the workflows it writes, ultracode included, the lean-swarm type that fits each step. In a workflow you write yourself, set it with `agent(prompt, { agentType: 'lean-swarm:reviewer' })`. In chat, ask Claude to use the `lean-swarm:reader` agent.

**What to know:**

- A role removes only tools the agent doesn't use, and structured output still works (checked). Agents that used PowerShell or a browser tool will use Bash or WebFetch instead.
- `reviewer` and `judge` don't see your CLAUDE.md. If your project's CLAUDE.md holds context a reviewer needs, put it in the task prompt, or use `reader` or `coder`, which keep it.
- `omitClaudeMd` needs Claude Code 2.1.271 or later; older versions ignore it and load the files as before.
- The plugin adds about 500 tokens to every session: about 430 for the five agent descriptions and about 70 for the session-start line. The line reaches only the main session, not the agents it starts.

## Proof

| Round | Where | Agents | Runs | Write-up |
|---|---|---|---:|---|
| 1 | Claude Code on the web | short (2-3 turns), 6 easy bugs | 2+2 | [round 1](docs/proof/2026-09-25-review.md) |
| 2 | Claude Code on the web | short, 11 subtle bugs + 15 decoys | 3+3 | [round 2](docs/proof/2026-09-25-review-round2.md) |
| local | Windows, heavy setup | short, round-2 target | 3+3 | [local](docs/proof/2026-09-26-local-review.md) |
| 4 | Windows, heavy setup | long (reviewers 15-27 turns), date-fns with 13 planted bugs + 6 decoys | 3+3 | [long agents](docs/proof/2026-09-26-long-agents.md) |
| 5 | Windows, heavy setup | long, five variants in rotated blocks, plus a firmer nudge on its own | 37 | [quality series](docs/proof/2026-09-27-quality-series.md) |
| ultracode | Windows, heavy setup | Claude writes the workflow: plain ultracode with default agents vs with the plugin installed, on round 4's target | 1+1 | [ultracode](docs/proof/2026-09-27-ultracode.md) |

The kit to rerun any of it on your own setup, and to test your own changes as extra variants, is in [proof/](proof/).

## What we tested that doesn't pay

Measured on the long-agent runs, the real workflow history and the quality series ([decision 0003](docs/decisions/0003-next-levers.md)):

- **Trimming large tool outputs (keep the head and tail):** in review work the big outputs are the code being reviewed. 24-35% of outputs over 8k characters held a line the agent later relied on, and 38% of round-4 findings were never visible in the part a 4k+4k trim keeps. The safe part (builds, tests, git, listings) is worth 0.2-1.5% of cost.
- **Clearing old tool results mid-run:** 0 of 108 simulated policies saved money. On Opus 5.5 clearing forces a cache rewrite at $5 per million tokens to save reads at $0.20.
- **A 1-hour cache for subagents:** +37% cost per run; no agent paused longer than 93 seconds.
- **Nudging agents to batch tool calls:** a hook after each one-call turn raised batched turns from 2% to 20% and cut turns by 13%, but batched turns read more, and cost didn't fall (5 runs each).

## Limits

- Savings depend on your setup. Many skills, connectors, MCP servers and large CLAUDE.md or rules files mean bigger savings; a lean setup saves less. Run X-ray to see yours.
- Quality was tested on code review at length and on coding briefly, each on one codebase, with one model. Research agents weren't tested. The kit is there to test yours.
- Anthropic is changing this area. `omitClaudeMd` shipped in 2.1.271, and requests to trim subagent context are open. X-ray stays useful either way.
- Single-session chat gains little. Other tools cover that.

## More

- [Design spec](docs/superpowers/specs/2026-09-25-lean-swarm-design.md) and [build plan](docs/superpowers/plans/2026-09-25-lean-swarm-v1.md)
- [Decisions](docs/decisions/) and [related projects](research/landscape.md)
- [Baseline prototype scripts](research/baseline-2026-09-25/)

## Development

```
npm test
```

No dependencies. Tests use scrubbed real transcripts in `test/fixtures/` (made with `scripts/scrub-fixture.js`, which keeps structure and removes all text).

MIT license.
