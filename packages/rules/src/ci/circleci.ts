import type { Finding, Rule } from "@blindspot/core";
import { circleciFiles, majorVersion, packageJson, readRepositoryFile } from "../utils.js";

// ── ci/circleci-tests-not-run ─────────────────────────────────────────────────

export const circleciTestsNotRunRule: Rule = {
  id: "ci/circleci-tests-not-run",
  title: "Tests not run in CircleCI",
  category: "ci",
  defaultSeverity: "high",
  description: "Detects a package.json test script that is never invoked in .circleci/config.yml.",
  async check(context) {
    if (!context.stack.circleCi || !context.stack.node) return [];
    const pkg = await packageJson(context);
    const scripts = pkg?.scripts;
    if (!scripts || typeof scripts !== "object") return [];
    const testScript = (scripts as Record<string, unknown>).test;
    if (!testScript || typeof testScript !== "string" || testScript.includes("echo") || testScript.includes("exit")) return [];

    for (const file of circleciFiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      if (/(?:npm|yarn|pnpm)\s+(?:run\s+)?test\b/m.test(content)) return [];
    }

    return [{
      ruleId: "ci/circleci-tests-not-run",
      severity: "high",
      message: "A test script is defined in package.json but is not invoked in .circleci/config.yml.",
      files: circleciFiles(context),
      evidence: [`package.json: scripts.test = "${testScript}"`],
      recommendation: "Add a run step that executes your test script (e.g. run: npm test).",
    }];
  },
};

// ── ci/circleci-non-deterministic-install ─────────────────────────────────────

export const circleciNonDeterministicInstallRule: Rule = {
  id: "ci/circleci-non-deterministic-install",
  title: "Non-deterministic install in CircleCI",
  category: "ci",
  defaultSeverity: "medium",
  description: "Detects npm install in CircleCI run steps when package-lock.json is present.",
  async check(context) {
    if (!context.stack.circleCi) return [];
    if (!context.files.includes("package-lock.json")) return [];

    const evidence: string[] = [];
    for (const file of circleciFiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      content.split("\n").forEach((line, i) => {
        if (/\bnpm\s+install\b/.test(line) && !/npm\s+install\s+[a-zA-Z@]/.test(line)) {
          evidence.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    if (evidence.length === 0) return [];
    return [{
      ruleId: "ci/circleci-non-deterministic-install",
      severity: "medium",
      message: "npm install is used in CircleCI with a package-lock.json present.",
      files: circleciFiles(context),
      evidence,
      recommendation: "Replace npm install with npm ci to enforce the lockfile.",
    }];
  },
};

// ── ci/circleci-node-version-mismatch ────────────────────────────────────────

export const circleciNodeVersionMismatchRule: Rule = {
  id: "ci/circleci-node-version-mismatch",
  title: "Node.js version mismatch in CircleCI",
  category: "ci",
  defaultSeverity: "high",
  description: "Detects a Node.js Docker executor image in .circleci/config.yml that conflicts with package.json engines.node.",
  async check(context) {
    if (!context.stack.circleCi || !context.stack.node) return [];

    const pkg = await packageJson(context);
    const engineNode = typeof (pkg?.engines as Record<string, unknown> | undefined)?.node === "string"
      ? (pkg!.engines as Record<string, string>).node : undefined;
    const pkgMajor = engineNode ? majorVersion(engineNode) : undefined;
    if (!pkgMajor) return [];

    const evidence: string[] = [`package.json engines.node: ${engineNode}`];
    const ciMajors = new Set<string>();

    for (const file of circleciFiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      // Docker executor: image: cimg/node:20.x or image: node:20
      for (const match of content.matchAll(/image\s*:\s*["']?(?:cimg\/)?node:([^\s"'#]+)/gi)) {
        const v = majorVersion(match[1]);
        if (v) { ciMajors.add(v); evidence.push(`${file}: image: node:${match[1]}`); }
      }
    }

    if (ciMajors.size === 0) return [];
    const mismatched = [...ciMajors].filter((v) => v !== pkgMajor);
    if (mismatched.length === 0) return [];

    return [{
      ruleId: "ci/circleci-node-version-mismatch",
      severity: "high",
      message: `Node.js image version in .circleci/config.yml (${[...ciMajors].join(", ")}) differs from package.json engines.node (${pkgMajor}).`,
      files: circleciFiles(context),
      evidence,
      recommendation: "Align the Docker executor node image with the engines.node constraint in package.json.",
    }];
  },
};
