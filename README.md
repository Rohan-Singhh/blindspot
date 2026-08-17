# Blindspot

> **Find the problems your linters don't.**

[![npm version](https://img.shields.io/npm/v/blindspot-cli.svg)](https://www.npmjs.com/package/blindspot-cli)
[![npm downloads](https://img.shields.io/npm/dm/blindspot-cli.svg)](https://www.npmjs.com/package/blindspot-cli)
[![MIT license](https://img.shields.io/github/license/Rohan-Singhh/blindspot.svg)](LICENSE)

```bash
npx blindspot-cli
```

Local. Deterministic. No AI. No API key.

```text
Blindspot v0.1.1

Detected:
TypeScript · Docker · GitHub Actions

Scanned 132 files in 80ms

1 finding

HIGH
docker/root-user

Docker container appears to run as root.

Files: backend/Dockerfile

Suggested fix:
Run the application using a non-root USER.
```

## What is Blindspot?

Blindspot scans relationships across Git, environment templates, Docker, Node
runtime configuration, package managers, and GitHub Actions. It targets issues
where each individual file may look valid but the repository configuration does
not agree.

## Why not ESLint?

ESLint understands source-code rules. Blindspot looks for repository-level
inconsistencies between files and tooling. It complements ESLint; it does not
replace it.

```text
package.json        Node >=22
Dockerfile          Node 20
GitHub Actions      Node 22
```

Each setting can be valid on its own. Together, they can put local, CI, and
production environments on different runtimes.

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
```

## Current Rules

| Rule | Severity | What it catches |
| --- | --- | --- |
| `git/tracked-env` | Critical | Sensitive `.env` files tracked by Git; templates are excluded |
| `docker/root-user` | High | Dockerfiles that do not select a non-root `USER` |
| `env/example-missing-variable` | Medium | Variables missing from recognized env templates |
| `runtime/node-version-mismatch` | High | Inconsistent Node versions across package, local, Docker, and CI configuration |
| `runtime/package-manager-mismatch` | Medium | Docker or CI installs using a different manager than the lockfile |
| `ci/tests-not-run` | High | Test scripts that GitHub Actions does not appear to run |
| `ci/non-deterministic-install` | Medium | `npm install` in GitHub Actions when `package-lock.json` is present |

## Local by Default

- Scanning happens locally.
- Blindspot does not upload source code.
- No AI model, API key, or account is required.
- Blindspot does not modify the scanned repository.
- No telemetry is currently collected.

## Supported Scope

Blindspot currently works best with Node.js, JavaScript, and TypeScript
repositories and their common surrounding tooling: Docker, GitHub Actions, npm,
pnpm, yarn, and environment template files. It can detect Prisma, Next.js, and
Express in repository metadata, but this release has no dedicated rules for
those frameworks.

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

Blindspot is early-stage. It favors a small number of high-confidence checks
over broad coverage. Node version comparison is conservative, GitHub Actions
parsing is lightweight rather than full YAML semantic analysis, and monorepos
do not receive deep package-by-package analysis yet.

## What Blindspot Is Not

Blindspot is not an AI code reviewer, a replacement for ESLint, a complete
security scanner, or a guarantee that a repository is secure or
production-ready.

## Contributing

Blindspot prefers a few high-confidence findings over hundreds of noisy
warnings. If it cannot determine something confidently, it should often stay
quiet. Rule contributions should provide clear evidence, low false-positive
rates, and repository-level value.

Want to add a rule? See [CONTRIBUTING.md](CONTRIBUTING.md). For security issues
in Blindspot itself, see [SECURITY.md](SECURITY.md).

## Development

```bash
npm install
npm run build
npm test
```

MIT licensed. See [LICENSE](LICENSE).
