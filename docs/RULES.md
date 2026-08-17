# Blindspot rule catalog

Blindspot 0.2.0 ships 24 deterministic repository-contract checks. Severities
shown here are the defaults.

## Runtime

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `runtime/node-version-mismatch` | High | Node major drift across runtime sources | `package.json`, version files, Docker, CI values | Align runtime versions |
| `runtime/package-manager-mismatch` | Medium | Docker or CI using a manager different from the lockfile | Lockfile and install commands | Use the lockfile's manager |
| `runtime/missing-lockfile` | Medium | Explicit `packageManager` without its lockfile | Field value and expected lockfile | Generate and commit the lockfile |
| `runtime/multiple-lockfiles` | Medium | Root lockfiles for competing managers | Lockfile names and managers | Remove stale lockfiles |
| `runtime/package-manager-field-drift` | High | `packageManager` disagreeing with one root lockfile | Field and lockfile manager | Align the declaration and lockfile |

## Environment

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `env/example-missing-variable` | Medium | Source env usage absent from recognized templates | Missing variable names and templates | Document missing variables |
| `env/duplicate-template-variable` | Medium | Duplicate declarations inside one env template | Template and duplicate names | Keep one declaration per variable |

## Docker

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `docker/root-user` | High | Dockerfiles without a clear non-root `USER` | Affected Dockerfiles | Select a non-root runtime user |
| `docker/missing-node-env` | High | Dockerfiles without `ENV NODE_ENV=production` | Affected Dockerfiles | Set ENV NODE_ENV=production in your Dockerfile |
| `docker/npm-start-entrypoint` | Medium | Dockerfiles using `npm start` as an entrypoint | Affected Dockerfiles | Invoke node directly using the exec form |
| `docker/env-file-copied` | High | Root `COPY .` exposing local env files | Dockerfile, env files, `.dockerignore` gap | Ignore env files or copy explicit paths |
| `docker/npm-install-with-lockfile` | Medium | `npm install` despite an npm lockfile | Docker command and lockfile | Use `npm ci` |

## CI

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `ci/tests-not-run` | High | Defined tests absent from GitHub Actions | Test script and workflow files | Run tests in CI |
| `ci/non-deterministic-install` | Medium | `npm install` in CI with `package-lock.json` | Workflow command and lockfile | Use `npm ci` |
| `ci/script-command-missing` | High | CI invoking undefined root package scripts | Workflow command and scripts map | Define or correct the script |
| `ci/cache-package-manager-mismatch` | Medium | setup-node cache disagreeing with the root lockfile | Cache value and lockfile manager | Align cache configuration |
| `ci/missing-dependency-cache` | Medium | setup-node cache disabled in GitHub Actions | Missing cache option in setup-node | Add cache: 'npm' |

## Git

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `git/tracked-env` | Critical | Sensitive env files tracked by Git | Tracked filenames | Remove from tracking and rotate secrets |
| `git/tracked-private-key` | Critical | Tracked key files with a private-key header | Filename and header match | Revoke, rotate, and remove from history |
| `git/dependency-directory-committed` | Medium | Files tracked under `node_modules` | Tracked file count and examples | Untrack and ignore dependencies |
| `git/ignored-lockfile` | Medium | Existing root lockfiles matched by Git ignores | Lockfile and ignore result | Commit the intended lockfile |

## Monorepo

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `monorepo/package-manager-drift` | Medium | Conflicting explicit manager fields | Workspace manifests and managers | Align workspace manager contracts |
| `monorepo/engine-drift` | Medium | Different explicit Node engine majors | Workspace manifests and ranges | Align runtime ranges or document the split |
| `monorepo/multiple-lockfiles` | Medium | Root and workspace-local lockfiles | All affected lockfiles | Remove stale nested lockfiles or confirm intent |

## Release

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `release/npm-files-excludes-runtime` | High | npm `files` excluding main, types, exports, or bin targets | Runtime targets and allowlist | Include every runtime target |
| `release/npm-files-includes-secret` | Critical | npm `files` explicitly including sensitive env files | Included env paths | Remove secrets and rotate published values |
| `release/publish-private-package` | High | GitHub Actions publishing a private package | `private` flag and publish workflow | Remove publish or change the package contract |

Rules are intentionally conservative. Ambiguous workspace commands, explicit
CI cache dependency paths, template env files, and unrecognized file formats
are generally left unreported.
