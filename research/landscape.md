# Landscape: related projects (checked 2026-09-26/27)

From a web sweep of 81 repos; the ones that matter to Lean-Swarm are below. Stars and claims are as reported by each project, not re-measured. Decisions drawn from this: `docs/decisions/0003-next-levers.md`.

## Measuring multi-agent cost (where Lean-Swarm is different)

| Project | License | What it does | What it measured |
|---|---|---|---|
| ccusage/ccusage (~18.7k★) | MIT | Usage reports from local logs | Accounting only; a per-plugin/sidechain breakdown PR was rejected (2026-09-15) |
| getagentseal/codeburn (~11.3k★) | MIT | Spend by model, project, subagent type | Attribution only; says it can't tell if delegation was cheaper |
| alexgreensh/token-optimizer (~2.4k★) | PolyForm NC | Plugin: audit, bash compression, archive-and-expand, subagent cost breakdown | ~28% of one author's workload avoided, mostly estimated; no A/B. **Same name as this repo.** |

## Trimming tool output

| Project | License | How | Measured |
|---|---|---|---|
| headroomlabs-ai/headroom (~74k★) | Apache-2.0 | Proxy/MCP/wrapper compressing JSON, logs, docs | 21–57% on replayed formats; no coding-task success result |
| rtk-ai/rtk (~82k★) | Apache-2.0 | PreToolUse rewrites Bash to filtered commands | bytes/4 estimates; notes savings dilute in the real bill |
| mksglu/context-mode (~24k★) | ELv2 | Plugin + MCP sandbox; only filtered results enter context | Byte reductions per example; no quality or cache measurement |
| claudioemmanuel/squeez | Apache-2.0 | Pre-wraps Bash; PostToolUse rewrites Read/Grep/Glob | 91% chars÷4 over 46 scenarios; keyword-survival gate only |
| fajarhide/omni | Apache-2.0 | Filters + ledger of seen output with retrievable handles | 0.8–2.4% on 9,478 real commands; found and fixed the silent shape bug |
| Allan-Nava/trimhook | MIT | PostToolUse head 60%/tail 40% with spill file | 7% of result text on 142 sessions |
| m2cci-bouzentm/tool-log-prune | none | PostToolUse head/tail 500 tokens, SQLite recall | −33% tool-result tokens offline; no check of later use |
| yuzushi-dev/Sando | MIT | Bounds oversized/repeated output, content-addressed store | 14.5–18.9% ceilings; no cache economics |
| Ayanami1314/swe-pruner | MIT | 0.6B model prunes file reads by task focus | SWE-bench Verified (Sonnet 4.5): 70.6→72.0%, tokens −23%, cost −27% |
| Dymyt-ry/tool-output-pruning-lab | MIT | Research: selectors vs head+tail | No selector beat head+tail on 40 long outputs |

## Reading less in the first place

| Project | License | How | Measured |
|---|---|---|---|
| colbymchenry/codegraph (~72k★) | MIT | Pre-indexed code graph over MCP | 7 repos, Opus 4.8, 4 runs/arm: 88% fewer tool calls, 44% cheaper |
| zilliztech/claude-context (~12.6k★) | MIT | Hybrid semantic code search MCP | 30 SWE-bench tasks: tokens −39%, same F1 |
| oraios/serena (~30k★) | MIT/GPL | LSP-backed symbol tools | No formal benchmark |
| Mibayy/token-savior | MIT | Symbol navigation MCP | Re-measurement withdrawn: 1 of 143 sessions called its tools |

## Subagents and caching

| Project | License | How | Measured |
|---|---|---|---|
| rezzminator/sub-agent-compact | MIT | Per-subagent compaction thresholds | One Sonnet 5 run: $18.39 → $12.20, 23/24 correct |
| cnighswonger/claude-code-cache-fix | MIT | Proxy normalizing prompt layout for cache hits | 95.5% vs 82.3% first warm-turn hit rate |
| anthropics/claude-code #74318, #82739 | – | Subagent caching studies | Siblings share only tools + system prompt; blanket 1h TTL raises cost |
| VoltAgent/awesome-claude-code-subagents (~25k★) | MIT | 161+ agent definitions with tool allowlists | None; no `omitClaudeMd` |

## Research

| Work | Finding |
|---|---|
| JetBrains, "The Complexity Trap" (2508.21433) | Masking old observations halves cost vs raw agent and matches LLM summarization on SWE-bench Verified |
| Microsoft ACON | Peak tokens −26 to −54%; a naive last-5-turns window dropped AppWorld 56.0 → 45.8 |
| SqueezeAILab LLMCompiler | Parallel calls: up to 3.7× lower latency, 6.7× lower cost vs ReAct |
| W&D (2602.07359) | 3 calls per turn: 23.8 vs 45.7 turns, 68% vs 66% accuracy, −36% cost (GPT-5) |
| Anthropic context editing docs | `clear_tool_uses` (trigger 100k, keep 3, `clear_at_least`); clearing invalidates the cache from the cleared point |
