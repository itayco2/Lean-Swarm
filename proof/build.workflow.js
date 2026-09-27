export const meta = {
  name: 'lean-swarm-proof-build',
  description: 'Proof run with long agents: finish a small library to its JSDoc, as plain or lean agents',
  whenToUse: 'Run with args {variant: "plain" | "lean", target: "<absolute path to a fresh copy of proof/target-3>", rolePrefix?: "lean-swarm:" | ""}',
  phases: [
    { title: 'Build', detail: 'one coder per area' },
    { title: 'Review', detail: 'one reviewer per area, read-only' },
    { title: 'Fix', detail: 'the area coder fixes what the review found' },
  ],
}

// The only difference between the two variants is the agent type.
const variant = args && args.variant
const target = args && args.target
if (variant !== 'plain' && variant !== 'lean') throw new Error('args.variant must be "plain" or "lean"')
if (!target) throw new Error('args.target must be the absolute path of a copy of proof/target-3')
// Plugin roles are "lean-swarm:<role>". Pass rolePrefix "" to use the project copies in .claude/agents/.
const prefix = args && typeof args.rolePrefix === 'string' ? args.rolePrefix : 'lean-swarm:'
const CODER = variant === 'lean' ? { agentType: prefix + 'coder' } : {}
const REVIEWER = variant === 'lean' ? { agentType: prefix + 'reviewer' } : {}

const DONE = {
  type: 'object',
  properties: {
    changed: { type: 'array', items: { type: 'string' }, description: 'one line per function you changed: what was wrong and what you did' },
    testsPass: { type: 'boolean', description: 'whether the area test file passes now' },
  },
  required: ['changed', 'testsPass'],
}

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'path relative to the library root, e.g. src/csv.js' },
          fn: { type: 'string', description: 'the function' },
          call: { type: 'string', description: 'a call that shows the problem' },
          expected: { type: 'string', description: 'what the JSDoc says the call should give' },
          actual: { type: 'string', description: 'what it gives now' },
        },
        required: ['file', 'fn', 'call', 'expected', 'actual'],
      },
    },
  },
  required: ['findings'],
}

const AREAS = [
  { key: 'text', files: ['src/csv.js', 'src/wrap.js'], test: 'test/text.test.js' },
  { key: 'time', files: ['src/intervals.js', 'src/recur.js'], test: 'test/time.test.js' },
  { key: 'query', files: ['src/filter.js', 'src/table.js'], test: 'test/query.test.js' },
]

const SCOPE = `The library is in ${target}. The JSDoc on each function is its spec. Work only inside ${target}; do not open anything outside it.`
const own = a => `You own ${a.files.join(' and ')}. Edit only those files.`
const runTests = a => `\`node --test ${a.test}\`, run from ${target}`

phase('Build')
const fixed = await pipeline(
  AREAS,
  a => agent(
    `${SCOPE}\n\n${own(a)} Make every function in them do exactly what its JSDoc says: some are unfinished and some have bugs. ${a.test} checks part of the spec (${runTests(a)}). Passing it is not enough: hidden tests check every sentence of the JSDoc. When you are done, report what you changed.`,
    { ...CODER, label: `build:${a.key}`, phase: 'Build', schema: DONE },
  ),
  (built, a) => agent(
    `${SCOPE}\n\nCheck ${a.files.join(' and ')} against their JSDoc, sentence by sentence. You may run code to try inputs, but do not edit or create any file inside ${target}. Report every case where the code does something different from its JSDoc, with a call that shows it, the expected result and the actual result. Report nothing you are unsure of.`,
    { ...REVIEWER, label: `review:${a.key}`, phase: 'Review', schema: FINDINGS },
  ),
  (review, a) => agent(
    `${SCOPE}\n\n${own(a)} A reviewer checked them against their JSDoc and reported the problems below. Check each one, fix the real ones so the code matches its JSDoc, and ignore any that are wrong. Then make sure ${a.test} still passes (${runTests(a)}). If the list is empty, just run the tests.\n\n${JSON.stringify((review && review.findings) || [], null, 1)}`,
    { ...CODER, label: `fix:${a.key}`, phase: 'Fix', schema: DONE },
  ),
)

return { variant, areas: AREAS.map((a, i) => ({ area: a.key, testsPass: Boolean(fixed[i] && fixed[i].testsPass) })) }
