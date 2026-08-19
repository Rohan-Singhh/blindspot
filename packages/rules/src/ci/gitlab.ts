import type { Finding, Rule } from "@blindspot/core";
import { gitlabCiFiles, majorVersion, packageJson, readRepositoryFile } from "../utils.js";

// ── gitlab/tests-not-run ──────────────────────────────────────────────────────

export const gitlabTestsNotRunRule: Rule = {
  id: "ci/gitlab-tests-not-run",
  title: "Tests not run in GitLab CI",
  category: "ci",
  defaultSeverity: "high",
  description: "Detects a package.json test script that is never invoked in .gitlab-ci.yml.",
  async check(context) {
    if (!context.stack.gitlabCi || !context.stack.node) return [];
    const pkg = await packageJson(context);
    const scripts = pkg?.scripts;
    if (!scripts || typeof scripts !== "object") return [];
    const testScript = (scripts as Record<string, unknown>).test;
    if (!testScript || typeof testScript !== "string" || testScript.includes("echo") || testScript.includes("exit")) return [];

    for (const file of gitlabCiFiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      // Look for npm test / yarn test / pnpm test / npm run test in script lines
      if (/(?:npm|yarn|pnpm)\s+(?:run\s+)?test\b/m.test(content)) return [];
    }

    return [{
      ruleId: "ci/gitlab-tests-not-run",
      severity: "high",
      message: "A test script is defined in package.json but is not invoked in .gitlab-ci.yml.",
      files: gitlabCiFiles(context),
      evidence: [`package.json: scripts.test = "${testScript}"`],
      recommendation: "Add a CI job that runs your test script (e.g. npm test or npm run test).",
    }];
  },
};

// ── gitlab/non-deterministic-install ─────────────────────────────────────────

export const gitlabNonDeterministicInstallRule: Rule = {
  id: "ci/gitlab-non-deterministic-install",
  title: "Non-deterministic install in GitLab CI",
  category: "ci",
  defaultSeverity: "medium",
  description: "Detects npm install in a GitLab CI job when package-lock.json is present. Use npm ci for reproducible installs.",
  async check(context) {
    if (!context.stack.gitlabCi) return [];
    if (!context.files.includes("package-lock.json")) return [];

    const evidence: string[] = [];
    for (const file of gitlabCiFiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (/\bnpm\s+install\b/.test(line) && !/npm\s+install\s+[a-zA-Z@]/.test(line)) {
          evidence.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    if (evidence.length === 0) return [];
    return [{
      ruleId: "ci/gitlab-non-deterministic-install",
      severity: "medium",
      message: "npm install is used in GitLab CI with a package-lock.json present. npm install can upgrade packages outside the locked range.",
      files: gitlabCiFiles(context),
      evidence,
      recommendation: "Replace npm install with npm ci to enforce the lockfile and get reproducible, faster installs.",
    }];
  },
};

// ── gitlab/node-version-mismatch ─────────────────────────────────────────────

export const gitlabNodeVersionMismatchRule: Rule = {
  id: "ci/gitlab-node-version-mismatch",
  title: "Node.js version mismatch in GitLab CI",
  category: "ci",
  defaultSeverity: "high",
  description: "Detects a Node.js version in .gitlab-ci.yml (image: node:X) that conflicts with the engines field in package.json.",
  async check(context) {
    if (!context.stack.gitlabCi || !context.stack.node) return [];

    const pkg = await packageJson(context);
    const engineNode = typeof (pkg?.engines as Record<string, unknown> | undefined)?.node === "string"
      ? (pkg!.engines as Record<string, string>).node : undefined;
    const pkgMajor = engineNode ? majorVersion(engineNode) : undefined;
    if (!pkgMajor) return [];

    const evidence: string[] = [`package.json engines.node: ${engineNode}`];
    const ciMajors = new Set<string>();

    for (const file of gitlabCiFiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      for (const match of content.matchAll(/image\s*:\s*["']?node:([^\s"'#]+)/gi)) {
        const v = majorVersion(match[1]);
        if (v) { ciMajors.add(v); evidence.push(`${file}: image: node:${match[1]}`); }
      }
    }

    if (ciMajors.size === 0) return [];
    const mismatched = [...ciMajors].filter((v) => v !== pkgMajor);
    if (mismatched.length === 0) return [];

    return [{
      ruleId: "ci/gitlab-node-version-mismatch",
      severity: "high",
      message: `Node.js version in .gitlab-ci.yml (${[...ciMajors].join(", ")}) differs from package.json engines.node (${pkgMajor}).`,
      files: gitlabCiFiles(context),
      evidence,
      recommendation: "Align the node image version in .gitlab-ci.yml with the engines.node constraint in package.json.",
    }];
  },
};

// ── gitlab/cache-key-missing ──────────────────────────────────────────────────

export const gitlabCacheKeyMissingRule: Rule = {
  id: "ci/gitlab-cache-key-missing",
  title: "GitLab CI cache defined without a key",
  category: "ci",
  defaultSeverity: "medium",
  description: "Detects a cache: block in .gitlab-ci.yml that has no key: field, causing unpredictable cache sharing between branches.",
  async check(context) {
    if (!context.stack.gitlabCi) return [];

    const findings: Finding[] = [];
    for (const file of gitlabCiFiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;

      const lines = content.split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        const cache = /^(\s*)cache\s*:\s*$/.exec(lines[index]);
        if (!cache) continue;
        const indent = cache[1].length;
        let hasKey = false;
        for (let next = index + 1; next < lines.length; next += 1) {
          if (lines[next].trim() === "") continue;
          const nextIndent = /^\s*/.exec(lines[next])?.[0].length ?? 0;
          if (nextIndent <= indent) break;
          if (/^\s*key\s*:/.test(lines[next])) { hasKey = true; break; }
        }
        if (!hasKey) {
          findings.push({
            ruleId: "ci/gitlab-cache-key-missing",
            severity: "medium",
            message: "A cache block in .gitlab-ci.yml has no key — all branches and pipelines will share the same cache bucket.",
            files: [file],
            evidence: [`${file}: cache: block without key:`],
            recommendation: "Add a cache key based on the lockfile hash (e.g. key: files: [\"package-lock.json\"]) to isolate caches per dependency set.",
          });
          break;
        }
      }
    }
    return findings;
  },
};
