# Blindspot

> **Find the problems your linters don't.**

Blindspot is a local, open-source CLI that checks a repository for risks that
file-focused linters commonly miss. ESLint primarily analyzes source-code rules.
Blindspot is designed for repository-wide checks involving Git, environment
configuration, infrastructure, CI, and relationships between files.

## Installation

Requires Node.js 20 or later.

```bash
npx @blindspot/cli
```

Or install it globally:

```bash
npm install --global @blindspot/cli
blindspot
```

## Usage

```bash
blindspot
blindspot scan
blindspot scan ./some-project
blindspot scan --json
```

`--json` writes only machine-readable findings to standard output. Exit code `1`
means at least one high or critical finding was found; `2` means Blindspot failed.

Example:

```text
Blindspot

2 issues found

CRITICAL
git/tracked-env

.env is tracked by Git.

────────────────────────────

HIGH
docker/root-user

Docker container appears to run as root.
```

## Current rules

- `git/tracked-env` (critical): finds Git-tracked `.env` files, including
  variants such as `.env.production`, while excluding `.env.example`.
- `docker/root-user` (high): checks `Dockerfile`, `Dockerfile.*`, and nested
  variants for a non-root `USER` instruction.
- `env/example-missing-variable` (medium): compares `process.env.NAME` and
  `process.env["NAME"]` usage with `.env.example`.

Generated directories such as `node_modules`, `dist`, `build`, `coverage`,
`.next`, and `.git` are never scanned. Blindspot's own fixtures and tests are
also skipped during repository scans.

## Development

```bash
npm install
npm run dev
npm run build
npm test
```

`npm run dev` performs one scan of the current directory.

## Roadmap

Future checks may cover CI configuration, dependency and repository hygiene,
and infrastructure relationships. Blindspot intentionally does not include AI,
cloud services, telemetry, dashboards, or automatic modifications in this MVP.
