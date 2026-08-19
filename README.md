# Blindspot

> **Find the problems your linters don't.**

[![npm version](https://img.shields.io/npm/v/blindspot-cli.svg)](https://www.npmjs.com/package/blindspot-cli)
[![MIT license](https://img.shields.io/github/license/Rohan-Singhh/blindspot.svg)](LICENSE)

```bash
npx blindspot-cli
```

Local. Deterministic. No AI. No API key.

```text
Blindspot v0.4.0

Detected:
TypeScript · Docker · GitHub Actions · Kubernetes · Terraform

Scanned 214 files in 120ms

3 findings

HIGH
kubernetes/root-container

Container securityContext does not set runAsNonRoot: true.

Files: k8s/deployment.yaml

────────────────────────────────────────

HIGH
terraform/missing-required-version

No terraform { required_version = ... } constraint found.

Files: infra/main.tf

────────────────────────────────────────

MEDIUM
security/third-party-action-unpinned

2 third-party GitHub Action(s) are pinned to a tag rather than a commit SHA.

Files: .github/workflows/deploy.yml
```

## What is Blindspot?

**Blindspot is a repository-contract scanner.** It finds when code, Git, Docker,
CI, environment configuration, package tooling, infrastructure, and build/release
configuration disagree with each other. The current source ships **75 repository-contract checks**.

## Why not ESLint / a vulnerability scanner / a secret scanner?

ESLint asks whether source code follows code-level rules. Vulnerability scanners
check whether dependencies have known CVEs. Secret scanners look for credentials in
files. Blindspot asks a different question: **does this repository behave consistently
across local development, CI, containers, infrastructure, and production?**

```text
package.json        Node >=22
Dockerfile          Node 20
GitHub Actions      Node 22
```

Each setting can be valid on its own. Together, they run local, CI, and
production on different runtimes.

```text
go.mod              go 1.21
Dockerfile          FROM golang:1.19
```

```text
Cargo.lock          present
.gitignore          Cargo.lock  ← binary project
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
npx blindspot-cli scan --category kubernetes
npx blindspot-cli scan --quiet
npx blindspot-cli scan --sarif results.sarif
npx blindspot-cli scan --update-baseline
npx blindspot-cli scan --show-suppressed
npx blindspot-cli rules
npx blindspot-cli rules --category terraform
```

## Rule Packs

| Pack | Checks | Focus |
| --- | ---: | --- |
| Runtime | 6 | Node, build-output, lockfile, and package-manager contracts |
| Environment | 3 | Source usage and env-template consistency |
| Docker | 5 | Runtime user, build context, install order, and deterministic installs |
| CI — GitHub Actions | 6 | Tests, scripts, paths, caches, and deterministic installs |
| CI — GitLab | 4 | Tests, installs, Node version, and cache keys |
| CI — Azure Pipelines | 3 | Tests, installs, and Node version |
| CI — CircleCI | 3 | Tests, installs, and Node version |
| Git | 6 | Tracked credentials, auth config, dependencies, env files, and lockfiles |
| Monorepo | 6 | Workspace identity, scripts, internal versions, tooling, and runtime drift |
| Release | 4 | npm runtime files, sensitive files, publish targets, and publishability |
| Kubernetes | 5 | Resource limits, image tags, liveness probes, root containers, and host network |
| Terraform | 5 | Required version, provider pins, state files, and lock file |
| Python | 4 | Version drift, lockfile presence, lockfile usage, and dev deps in production |
| Go | 4 | Version drift, go.sum, module path, and Dockerfile build target |
| Java | 3 | Version drift, wrapper script, and SNAPSHOT dependencies |
| Rust | 3 | Cargo.lock gitignored in binary, edition missing, version drift |
| Security | 5 | HTTP URLs, debug mode, weak secrets, CI permissions, unpinned actions |

See the complete [rule catalog](docs/RULES.md) for evidence and remediation guidance on every rule.

## Local by Default

- Scanning happens entirely on your machine.
- Blindspot does not upload source code.
- No AI model, API key, or account is required.
- Blindspot does not modify the scanned repository.
- No telemetry is collected.

## Supported Scope

Blindspot analyses Node.js, JavaScript, TypeScript, Python, Go, Java, and Rust
repository contracts across Git, Docker, GitHub Actions, GitLab CI, Azure Pipelines,
CircleCI, npm, pnpm, yarn, env templates, Kubernetes manifests, Terraform
configurations, workspaces, and npm release metadata.

## CI Integration

```yaml
# GitHub Actions
- name: Run Blindspot
  run: npx blindspot-cli scan --severity high
```

Blindspot exits with `1` when it finds a high or critical finding, `0` when a
scan completes without either, and `2` when Blindspot itself fails.

## GitHub Action + Code Scanning

Blindspot ships an official GitHub Action that integrates with GitHub Code Scanning
via SARIF. Findings appear as alerts in the Security tab of your repository.

```yaml
# .github/workflows/blindspot.yml
name: Blindspot

on: [push, pull_request]

permissions:
  contents: read
  security-events: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Rohan-Singhh/blindspot@main
        with:
          severity: high
          sarif-output: blindspot.sarif
          upload-sarif: 'true'
```

### SARIF output (standalone)

```bash
npx blindspot-cli scan --sarif results.sarif
```

The resulting file can be uploaded to any SARIF-compatible viewer or directly to
GitHub Code Scanning via `github/codeql-action/upload-sarif`.

## Baseline and Suppression

For brownfield projects with existing findings, use a baseline to surface only
**new** issues going forward:

```bash
# Snapshot the current state — this creates blindspot.baseline.json
npx blindspot-cli scan --update-baseline

# Future scans only report findings introduced since the snapshot
npx blindspot-cli scan

# Show suppressed findings marked [suppressed]
npx blindspot-cli scan --show-suppressed
```

Commit `blindspot.baseline.json` to share the baseline across your team.

## Configuration

Use an optional root `blindspot.config.json` to suppress rules that are not
applicable to your repository:

```json
{
  "ignore": [
    "docker/root-user",
    { "rule": "kubernetes/latest-image-tag", "path": "legacy/k8s/" }
  ]
}
```

String entries suppress a rule globally. Object entries suppress a rule only for
files under the given path prefix.

## Limitations

Blindspot is intentionally conservative. Kubernetes manifest parsing is line-based
rather than full YAML semantic analysis. Terraform HCL parsing is structural rather
than complete. Node version comparison is conservative. GitHub Actions, GitLab CI,
Azure Pipelines, and CircleCI parsing is lightweight rather than full YAML semantic
analysis.

## What Blindspot Is Not

Blindspot is not an AI code reviewer, a replacement for ESLint, a full security
scanner, a vulnerability database, a secret scanner, or a guarantee that a
repository is secure or production-ready.

## Contributing

**Signal over noise.** Blindspot prefers a smaller number of high-confidence
findings over hundreds of speculative warnings. A new rule should catch a real
repository-level failure, provide concrete evidence, avoid duplicating traditional
linters, and include positive and negative tests.

Want to add a rule? See [CONTRIBUTING.md](CONTRIBUTING.md). For security issues
in Blindspot itself, see [SECURITY.md](SECURITY.md).

## Development

```bash
npm install
npm run build
npm test
```

MIT licensed. See [LICENSE](LICENSE).
