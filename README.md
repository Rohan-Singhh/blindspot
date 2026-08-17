# Blindspot

> **Find the problems your linters don't.**

[![npm version](https://img.shields.io/npm/v/blindspot-cli.svg)](https://www.npmjs.com/package/blindspot-cli)
[![MIT license](https://img.shields.io/github/license/Rohan-Singhh/blindspot.svg)](LICENSE)

```bash
npx blindspot-cli
```

Local. Deterministic. No AI. No API key.

```text
Blindspot v0.2.1

Detected:
TypeScript · Docker · GitHub Actions

Scanned 132 files in 80ms

1 finding

HIGH
docker/root-user

Docker container appears to run as root.

Files: backend/Dockerfile
```

## What is Blindspot?

**Blindspot is a repository-contract scanner.** It finds when code, Git, Docker,
CI, environment configuration, package tooling, and build/release configuration
disagree. The current source ships **31 repository-contract checks**.

## Why not ESLint?

ESLint asks whether source code follows code-level rules. Blindspot asks whether
the repository will behave consistently across local development, CI,
containers, packaging, and production. It complements ESLint.

```text
package.json        Node >=22
Dockerfile          Node 20
GitHub Actions      Node 22
```

Each setting can be valid on its own. Together, they can put local, CI, and
production environments on different runtimes.

```text
package main        dist/index.js
package types       dist/index.d.ts
npm files           lib/
```

```text
pnpm-lock.yaml      present
CI                   npm install
Docker               yarn install
```

## Quick Start

```bash
npx blindspot-cli
npx blindspot-cli scan ./my-project
```

Useful options:

```bash
npx blindspot-cli scan --json
npx blindspot-cli scan --severity high
npx blindspot-cli scan --category docker
npx blindspot-cli scan --quiet
npx blindspot-cli rules
npx blindspot-cli rules --category docker
```

## Rule Packs

| Pack | Checks | Focus |
| --- | ---: | --- |
| Runtime | 6 | Node, build-output, lockfile, and package-manager contracts |
| Environment | 3 | Source usage and env-template consistency |
| Docker | 5 | Runtime user, build context, install order, and deterministic installs |
| CI | 6 | Tests, scripts, paths, caches, and deterministic installs |
| Git | 4 | Tracked secrets, dependencies, env files, and ignored lockfiles |
| Monorepo | 4 | Workspace identity, package-manager, engine, and lockfile drift |
| Release | 3 | npm runtime files, sensitive files, and publishability |

See the complete [rule catalog](docs/RULES.md) for evidence and remediation.

## Local by Default

- Scanning happens locally.
- Blindspot does not upload source code.
- No AI model, API key, or account is required.
- Blindspot does not modify the scanned repository.
- No telemetry is currently collected.

## Supported Scope

Blindspot analyzes Node.js, JavaScript, and TypeScript repository contracts
across Git, Docker, GitHub Actions, npm, pnpm, yarn, env templates, workspaces,
and npm release metadata. It detects Prisma, Next.js, and Express as stack
signals, but does not provide framework-specific rules for them yet.

## CI

```yaml
- name: Run Blindspot
  run: npx blindspot-cli scan --severity high
```

Blindspot exits with `1` when it finds a high or critical finding, `0` when a
scan completes without either, and `2` when Blindspot itself fails.

## Configuration

Use an optional root `blindspot.config.json` to suppress a rule that is not
applicable to your repository:

```json
{
  "ignore": ["docker/root-user"]
}
```

## Limitations

Blindspot is early-stage. Node version comparison is conservative, GitHub
Actions parsing is lightweight rather than full YAML semantic analysis, and
monorepo analysis is limited to explicit workspace-level contracts.

## What Blindspot Is Not

Blindspot is not an AI code reviewer, a replacement for ESLint, a complete
security scanner, or a guarantee that a repository is secure or
production-ready.

## Contributing

**Signal over noise.** Blindspot prefers a smaller number of high-confidence
findings over hundreds of speculative warnings. When it cannot determine
something confidently, it should stay quiet.

A new rule should catch a real repository-level failure, provide concrete
evidence, avoid duplicating traditional linters, and include positive and
negative tests.

Want to add a rule? See [CONTRIBUTING.md](CONTRIBUTING.md). For security issues
in Blindspot itself, see [SECURITY.md](SECURITY.md).

## Development

```bash
npm install
npm run build
npm test
```

MIT licensed. See [LICENSE](LICENSE).
