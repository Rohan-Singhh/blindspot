# Contributing

Use Node.js 20+, then run `npm install`, `npm run build`, and `npm test`.
The workspace contains `core` (discovery and execution), `rules` (checks), and
`cli` (presentation). Fixtures belong in `fixtures/`; tests belong in `tests/`.

Rules live in pack directories under `packages/rules/src`: `runtime`, `env`,
`docker`, `ci`, `git`, `monorepo`, and `release`. Tests mirror those packs under
`tests/`. To add a rule, implement the `Rule` interface, export it from the
rules index, add it to `builtInRules`, and add positive and negative tests.

A rule must catch a real repository-level failure mode, emit concrete evidence
and an actionable recommendation, stay quiet when uncertain, and avoid work
better handled by ESLint or formatting tools. Add an obvious false-positive
regression whenever the rule relies on inference. Aggregate repeated evidence
into one finding where possible.

Severity guidance: critical is reserved for direct secret exposure; high means
likely production, deployment, security, or CI breakage; medium is meaningful
configuration drift; low is limited-impact hygiene.

```ts
const exampleRule: Rule = {
  id: "category/example", title: "Example", category: "category",
  defaultSeverity: "low", description: "Explains the check",
  check: async (context) => [],
};
```
