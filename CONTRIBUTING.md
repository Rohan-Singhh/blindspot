# Contributing to Blindspot

Thank you for considering a contribution. This document covers the most important things to know before you start.

## Core principle: signal over noise

Blindspot ships **high-confidence findings only**. A new rule must meet every one of these criteria before it is accepted:

1. **Catches a real repository-level failure** — not a style issue, not something ESLint/Prettier/a linter already catches.
2. **Provides concrete, file-level evidence** — the user must be able to look at the cited files and immediately understand the problem.
3. **Has a clear false-positive story** — if the rule would fire on legitimate configurations, it either needs a gating condition or should not be added.
4. **Includes both a positive fixture and a negative fixture** — a fixture that triggers the rule and one that proves it stays quiet when the contract is satisfied.
5. **Does not duplicate a linter, vulnerability scanner, or secret scanner** — Blindspot finds *contradictions between files*, not individual-file code quality issues.

Examples of rejected rule ideas:
- "Dockerfile uses ADD instead of COPY" — this is a single-file best-practice lint, not a cross-file contract.
- "No README.md" — not a repository contract.
- "npm dependency has a known CVE" — this is the job of a vulnerability scanner (Snyk, Dependabot, etc.).
- "Hardcoded API key in source code" — this is the job of a secret scanner (TruffleHog, gitleaks, etc.).

---

## Rule structure

Every rule lives in `packages/rules/src/<category>/<rule-name>.ts` and exports a single named constant implementing the `Rule` interface from `@blindspot/core`:

```ts
import type { Finding, Rule } from "@blindspot/core";

export const myNewRule: Rule = {
  id: "category/rule-name",        // kebab-case, unique
  title: "Human-readable title",
  category: "category",
  defaultSeverity: "high",         // critical | high | medium | low
  description: "One sentence describing what the rule detects.",
  async check(context): Promise<Finding[]> {
    // Gate on stack early to avoid unnecessary work
    if (!context.stack.node) return [];

    // ... inspect context.files, read files with readRepositoryFile(), etc.

    return [{
      ruleId: "category/rule-name",
      severity: "high",
      message: "Clear, human-readable description of what was found.",
      files: ["path/to/file.ts"],           // relative POSIX paths
      evidence: ["file.ts: the offending line"],
      recommendation: "What the user should do to fix this.",
    }];
  },
};
```

### Checklist for a new rule file

- [ ] `id` is unique, uses `category/rule-name` format, and matches the export name
- [ ] `check()` returns `[]` (not `undefined`) when no finding
- [ ] `check()` gates on the relevant stack flag (`context.stack.python`, etc.) to avoid firing on unrelated repos
- [ ] File-level evidence is included (specific file paths, not just "it's missing")
- [ ] Recommendation is actionable and specific

---

## Adding a fixture

Fixtures live in `fixtures/<fixture-name>/`. They are minimal, self-contained directories that represent a real-world project state.

- **Positive fixture**: triggers the rule under test. Name it descriptively (e.g. `go-broken/`).
- **Negative fixture**: proves the rule stays quiet. Name it `<thing>-safe/` or `<thing>-healthy/`.

Fixtures are excluded from scanning by the `DEFAULT_IGNORED_DIRECTORIES` set in `packages/core/src/scanner.ts`.

---

## Adding the rule to the index

After writing the rule file and fixtures:

1. Import the rule in `packages/rules/src/index.ts`
2. Add it to the named exports block
3. Add it to the `builtInRules` array in the appropriate category group (ordered by severity within the group)

---

## Writing tests

Tests live in `tests/<category>/`. Use Vitest.

```ts
import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { myNewRule } from "@blindspot/rules";
import { fixturePath } from "../helpers.js";

describe("category/rule-name", () => {
  it("fires when the contract is violated", async () => {
    const context = await createRepositoryContext(fixturePath("my-broken-fixture"));
    const findings = await myNewRule.check(context);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe("category/rule-name");
  });

  it("stays quiet when the contract is satisfied", async () => {
    const context = await createRepositoryContext(fixturePath("my-safe-fixture"));
    expect(await myNewRule.check(context)).toEqual([]);
  });
});
```

---

## Stack gating

Rules that only apply to certain ecosystems should check the stack early:

```ts
// Only relevant for Kubernetes projects
if (!context.stack.kubernetes) return [];

// Only relevant for Python projects
if (!context.stack.python) return [];

// Only relevant for repos with GitHub Actions
if (!context.stack.githubActions) return [];
```

Stack detection lives in `packages/core/src/scanner.ts`. If a new ecosystem needs a new stack flag, add it to `RepositoryStack` in `packages/core/src/types.ts` and detect it in `createRepositoryContext()`.

---

## Updating the rule catalog

After adding a rule, update `docs/RULES.md` with a row in the correct category table. Each row needs: Rule ID, Severity, what it detects, what evidence it produces, and the typical remediation.

---

## Running the build and tests

```bash
npm install
npm run build
npm test
```

All tests must pass. The build must produce no TypeScript errors.

---

## Severity guidelines

| Severity | Use when |
| --- | --- |
| `critical` | Data or credentials are already exposed (e.g. tracked secret, state file committed) |
| `high` | A misconfig will likely cause a build failure, security incident, or data loss in production |
| `medium` | A misconfig introduces non-determinism, inconsistency, or technical debt that will cause problems eventually |
| `low` | An omission that is almost certainly unintentional but has low immediate impact |

When in doubt, prefer `medium` over `high`. Never add a `critical` rule for something that is not already an exposure.

---

## Security issues in Blindspot itself

Please do not open a public issue for security vulnerabilities in Blindspot. See [SECURITY.md](SECURITY.md).
