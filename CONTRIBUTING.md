# Contributing

Use Node.js 20+, then run `npm install`, `npm run build`, and `npm test`.
The workspace contains `core` (discovery and execution), `rules` (checks), and
`cli` (presentation). Fixtures belong in `fixtures/`; tests belong in `tests/`.

To add a rule, implement the `Rule` interface in `packages/rules/src`, export it
from the rules index, add it to `builtInRules`, and add both detection and
obvious-valid-case tests. Keep rules read-only, small, and conservative:
uncertain evidence should produce no finding. A rule is expected to return a
stable ID, title, category, default severity, clear message, and actionable
recommendation.

```ts
const exampleRule: Rule = {
  id: "category/example", title: "Example", category: "category",
  defaultSeverity: "low", description: "Explains the check",
  check: async (context) => [],
};
```
