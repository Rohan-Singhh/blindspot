# Blindspot rule catalog

Current source ships **75 deterministic repository-contract checks** across 13 categories.
Severities shown are the defaults; all rules are conservative — when evidence is ambiguous, Blindspot stays quiet.

---

## Runtime (6 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `runtime/node-version-mismatch` | High | Node major drift across runtime sources | `package.json`, version files, Docker, CI values | Align runtime versions |
| `runtime/package-manager-mismatch` | Medium | Docker or CI using a manager different from the lockfile | Lockfile and install commands | Use the lockfile's manager |
| `runtime/missing-lockfile` | Medium | Explicit `packageManager` without its lockfile | Field value and expected lockfile | Generate and commit the lockfile |
| `runtime/multiple-lockfiles` | Medium | Root lockfiles for competing managers | Lockfile names and managers | Remove stale lockfiles |
| `runtime/package-manager-field-drift` | High | `packageManager` disagreeing with one root lockfile | Field and lockfile manager | Align the declaration and lockfile |
| `runtime/build-output-mismatch` | High | TypeScript outDir disagreeing with package or Docker runtime targets | tsconfig, package entry points, Docker commands | Align build output and runtime paths |

---

## Environment (3 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `env/example-missing-variable` | Medium | Source env usage absent from recognised templates | Missing variable names and templates | Document missing variables |
| `env/duplicate-template-variable` | Medium | Duplicate declarations inside one env template | Template and duplicate names | Keep one declaration per variable |
| `env/template-workspace-drift` | Medium | Workspace variables documented only by another workspace | Source files and env templates | Document variables in the owning workspace |

---

## Docker (5 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `docker/root-user` | High | Dockerfiles without a clear non-root `USER` | Affected Dockerfiles | Select a non-root runtime user |
| `docker/env-file-copied` | High | Root `COPY .` exposing local env files | Dockerfile, env files, `.dockerignore` gap | Ignore env files or copy explicit paths |
| `docker/npm-install-with-lockfile` | Medium | `npm install` despite an npm lockfile | Docker command and lockfile | Use `npm ci` |
| `docker/lockfile-not-copied` | High | `npm ci` before the lockfile is available in a build stage | Docker instruction order and npm lockfile | Copy the lockfile before installing |
| `docker/package-manifest-not-copied` | High | Dependency install before package.json is available in a build stage | Docker instruction order and package.json | Copy the manifest before installing |

---

## CI — GitHub Actions (6 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `ci/tests-not-run` | High | Defined tests absent from GitHub Actions | Test script and workflow files | Run tests in CI |
| `ci/non-deterministic-install` | Medium | `npm install` in CI with `package-lock.json` | Workflow command and lockfile | Use `npm ci` |
| `ci/script-command-missing` | High | CI invoking undefined root package scripts | Workflow command and scripts map | Define or correct the script |
| `ci/cache-package-manager-mismatch` | Medium | setup-node cache disagreeing with the root lockfile | Cache value and lockfile manager | Align cache configuration |
| `ci/working-directory-missing` | High | Literal workflow working-directory paths that do not exist | Workflow file and missing path | Correct or add the directory |
| `ci/cache-lockfile-path-missing` | High | Literal cache paths that are missing or belong to another manager | setup-node cache and lockfile path | Point cache at the correct lockfile |

---

## CI — GitLab (4 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `ci/gitlab-tests-not-run` | High | `package.json` test script not invoked in `.gitlab-ci.yml` | Test script and GitLab CI jobs | Add a job that runs the test script |
| `ci/gitlab-non-deterministic-install` | Medium | `npm install` in GitLab CI with `package-lock.json` present | Workflow command and lockfile | Use `npm ci` |
| `ci/gitlab-node-version-mismatch` | High | Node image in `.gitlab-ci.yml` conflicts with `engines.node` | Image tag and engines field | Align node image with engines.node |
| `ci/gitlab-cache-key-missing` | Medium | `cache:` block without a `key:` — unpredictable cross-branch caching | Cache block and missing key | Add a cache key based on the lockfile hash |

---

## CI — Azure Pipelines (3 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `ci/azure-tests-not-run` | High | `package.json` test script not invoked in `azure-pipelines.yml` | Test script and pipeline steps | Add a step that runs the test script |
| `ci/azure-non-deterministic-install` | Medium | `npm install` in Azure Pipelines with `package-lock.json` present | Pipeline step and lockfile | Use `npm ci` |
| `ci/azure-node-version-mismatch` | High | `NodeTool@0` versionSpec conflicts with `engines.node` | versionSpec and engines field | Align versionSpec with engines.node |

---

## CI — CircleCI (3 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `ci/circleci-tests-not-run` | High | `package.json` test script not invoked in `.circleci/config.yml` | Test script and CircleCI jobs | Add a run step that executes the test script |
| `ci/circleci-non-deterministic-install` | Medium | `npm install` in CircleCI with `package-lock.json` present | run step and lockfile | Use `npm ci` |
| `ci/circleci-node-version-mismatch` | High | Docker executor node image conflicts with `engines.node` | Image tag and engines field | Align node image with engines.node |

---

## Git (6 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `git/tracked-env` | Critical | Sensitive env files tracked by Git | Tracked filenames | Remove from tracking and rotate secrets |
| `git/tracked-private-key` | Critical | Tracked key files with a private-key header | Filename and header match | Revoke, rotate, and remove from history |
| `git/tracked-service-account` | Critical | Tracked Google-style service-account private credentials | Credential filename and structural fields | Rotate the key and remove it from history |
| `git/tracked-auth-config` | Critical | Literal credentials in tracked `.npmrc`, `.netrc`, or `.pypirc` files | Filename, line, and field without secret values | Rotate credentials and use environment references |
| `git/dependency-directory-committed` | Medium | Files tracked under `node_modules` | Tracked file count and examples | Untrack and ignore dependencies |
| `git/ignored-lockfile` | Medium | Existing root lockfiles matched by Git ignores | Lockfile and ignore result | Commit the intended lockfile |

---

## Monorepo (6 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `monorepo/package-manager-drift` | Medium | Conflicting explicit manager fields | Workspace manifests and managers | Align workspace manager contracts |
| `monorepo/engine-drift` | Medium | Different explicit Node engine majors | Workspace manifests and ranges | Align runtime ranges or document the split |
| `monorepo/multiple-lockfiles` | Medium | Root and workspace-local lockfiles | All affected lockfiles | Remove stale nested lockfiles or confirm intent |
| `monorepo/duplicate-package-name` | High | A package name reused by declared workspaces | Duplicate name and manifests | Give every workspace a unique package name |
| `monorepo/workspace-script-missing` | High | Recursive root scripts absent from selected workspaces | Root command and missing workspace scripts | Add scripts, narrow selection, or use `--if-present` |
| `monorepo/internal-dependency-version-drift` | High | Internal exact/caret/tilde ranges excluding current workspace versions | Declaring and target manifests | Align the range or use a workspace protocol |

---

## Release (4 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `release/npm-files-excludes-runtime` | High | npm `files` excluding main, types, exports, or bin targets | Runtime targets and allowlist | Include every runtime target |
| `release/npm-files-includes-secret` | Critical | npm `files` explicitly including sensitive env files | Included env paths | Remove secrets and rotate published values |
| `release/publish-private-package` | High | GitHub Actions publishing a private package | `private` flag and publish workflow | Remove publish or change the package contract |
| `release/publish-workspace-mismatch` | High | Publish steps targeting a missing or private workspace manifest | Workflow target and workspace package.json | Publish from the intended public package |

---

## Kubernetes (5 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `kubernetes/missing-resource-limits` | High | Containers without `resources.limits.cpu` or `resources.limits.memory` | Affected manifest and container name | Add resource limits to every container spec |
| `kubernetes/latest-image-tag` | Medium | Container images using `:latest` or no tag | Image names in Deployment/StatefulSet/etc. | Pin images to an explicit version tag or digest |
| `kubernetes/missing-liveness-probe` | Medium | Long-running workloads without a `livenessProbe` | Affected manifest and kind | Add a livenessProbe to every container |
| `kubernetes/root-container` | High | `runAsNonRoot` not set or `runAsUser: 0` | securityContext field values | Set `runAsNonRoot: true` and a non-zero `runAsUser` |
| `kubernetes/host-network` | High | Workloads with `hostNetwork: true` | Manifest and kind | Remove `hostNetwork` unless explicitly required |

---

## Terraform (5 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `terraform/missing-required-version` | High | No `required_version` constraint in any `.tf` file | Affected `.tf` files | Add `required_version` to the `terraform {}` block |
| `terraform/provider-version-unpinned` | High | `required_providers` entry with no `version` constraint | Provider name and block | Add a version constraint to every provider |
| `terraform/state-file-committed` | Critical | `*.tfstate` or `*.tfstate.backup` tracked by Git | Tracked filenames | Remove from tracking and use remote state |
| `terraform/lockfile-missing` | Medium | `.tf` files present but `.terraform.lock.hcl` absent | Directory path | Run `terraform init` and commit the lock file |
| `terraform/lockfile-gitignored` | Medium | `.terraform.lock.hcl` matched by `.gitignore` | Lockfile path and ignore pattern | Remove the lock file from `.gitignore` |

---

## Python (4 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `python/version-mismatch` | High | Python version inconsistent across `.python-version`, `pyproject.toml`, Docker, and CI | Version values from each source | Align Python versions across all tooling |
| `python/missing-lockfile` | Medium | `requirements.txt` or `Pipfile` without a lockfile | Requirements file names | Generate and commit `poetry.lock`, `Pipfile.lock`, or `uv.lock` |
| `python/lockfile-not-installed` | Medium | `poetry.lock` / `Pipfile.lock` present but `pip install -r` used in Docker or CI | Install command and lockfile | Use `poetry install` or `pipenv install --deploy` |
| `python/dev-requirements-in-production` | High | Dev requirements file copied into a production Docker stage | Dockerfile stage and COPY instruction | Keep dev requirements in a builder or test stage only |

---

## Go (4 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `go/version-mismatch` | High | Go version inconsistent across `go.mod`, Dockerfiles, and CI | Version values from each source | Align Go versions across all tooling |
| `go/sum-file-missing` | High | `go.mod` present but `go.sum` missing or gitignored | go.mod and .gitignore | Run `go mod tidy` and commit `go.sum` |
| `go/module-path-mismatch` | Medium | `go.mod` module path is a placeholder (e.g. `example.com/...`) | Module directive value | Replace with the real repository path |
| `go/missing-build-target` | Medium | Dockerfile runs `go build -o <bin>` but CMD/ENTRYPOINT does not reference the binary | Build command and CMD/ENTRYPOINT | Add `CMD ["<binary-path>"]` to the final stage |

---

## Java (3 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `java/version-mismatch` | High | Java version inconsistent across `pom.xml`/`build.gradle`, Dockerfiles, and CI | Version values from each source | Align Java versions across all tooling |
| `java/wrapper-missing` | Medium | Maven or Gradle project without a committed wrapper script | Build file and missing wrapper | Commit `mvnw` or `gradlew` wrapper |
| `java/snapshot-in-production` | High | Non-test `SNAPSHOT` dependency in `pom.xml` | Artifact name and version | Pin to a fixed release version |

---

## Rust (3 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `rust/lockfile-gitignored` | High | `Cargo.lock` gitignored in a project with a binary target | `.gitignore` pattern and binary indicator | Remove `Cargo.lock` from `.gitignore` |
| `rust/edition-missing` | Low | `Cargo.toml` `[package]` section without an `edition` field | `Cargo.toml` path | Add `edition = "2021"` to `[package]` |
| `rust/version-mismatch` | Medium | Rust toolchain version inconsistent across `rust-toolchain.toml` and Dockerfiles | Version values from each source | Align Rust version across all tooling |

---

## Security (5 rules)

| Rule | Severity | Detects | Evidence | Typical remediation |
| --- | --- | --- | --- | --- |
| `security/http-base-url` | High | Plain `http://` URL in a production env template or config file (excluding localhost) | File path, line, and URL | Replace with `https://` |
| `security/debug-mode-in-production` | High | `DEBUG=true` or `NODE_ENV=development` in a production-scoped env template | File path and variable name | Set `DEBUG=false` and `NODE_ENV=production` |
| `security/default-secret-value` | High | Secret-named variable with a weak default value (`secret`, `changeme`, etc.) in an env template | Variable name and file path | Replace with an empty value or clearly marked placeholder |
| `security/privileged-ci-permissions` | Medium | GitHub Actions `permissions: write-all` or broad top-level permissions without per-job overrides | Workflow file and permissions block | Set `permissions: {}` at the top level and scope per job |
| `security/third-party-action-unpinned` | Medium | Third-party GitHub Action referenced by branch/tag rather than full commit SHA | Action reference and workflow file | Pin to a full 40-character commit SHA |

---

Rules are intentionally conservative. When Blindspot cannot determine something confidently — ambiguous workspace commands, templated CI values, unrecognised file formats — it stays quiet.
