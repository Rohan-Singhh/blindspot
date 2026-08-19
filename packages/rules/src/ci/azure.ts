import type { Finding, Rule } from "@blindspot/core";
import { azurePipelinesFiles, majorVersion, packageJson, readRepositoryFile } from "../utils.js";

// ── ci/azure-tests-not-run ────────────────────────────────────────────────────

export const azureTestsNotRunRule: Rule = {
  id: "ci/azure-tests-not-run",
  title: "Tests not run in Azure Pipelines",
  category: "ci",
  defaultSeverity: "high",
  description: "Detects a package.json test script that is never invoked in azure-pipelines.yml.",
  async check(context) {
    if (!context.stack.azurePipelines || !context.stack.node) return [];
    const pkg = await packageJson(context);
    const scripts = pkg?.scripts;
    if (!scripts || typeof scripts !== "object") return [];
    const testScript = (scripts as Record<string, unknown>).test;
    if (!testScript || typeof testScript !== "string" || testScript.includes("echo") || testScript.includes("exit")) return [];

    for (const file of azurePipelinesFiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      if (/(?:npm|yarn|pnpm)\s+(?:run\s+)?test\b/m.test(content)) return [];
    }

    return [{
      ruleId: "ci/azure-tests-not-run",
      severity: "high",
      message: "A test script is defined in package.json but is not invoked in azure-pipelines.yml.",
      files: azurePipelinesFiles(context),
      evidence: [`package.json: scripts.test = "${testScript}"`],
      recommendation: "Add a pipeline step that runs your test script (e.g. npm test or npm run test).",
    }];
  },
};

// ── ci/azure-non-deterministic-install ───────────────────────────────────────

export const azureNonDeterministicInstallRule: Rule = {
  id: "ci/azure-non-deterministic-install",
  title: "Non-deterministic install in Azure Pipelines",
  category: "ci",
  defaultSeverity: "medium",
  description: "Detects npm install in Azure Pipelines steps when package-lock.json is present.",
  async check(context) {
    if (!context.stack.azurePipelines) return [];
    if (!context.files.includes("package-lock.json")) return [];

    const evidence: string[] = [];
    for (const file of azurePipelinesFiles(context)) {
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
      ruleId: "ci/azure-non-deterministic-install",
      severity: "medium",
      message: "npm install is used in Azure Pipelines with a package-lock.json present.",
      files: azurePipelinesFiles(context),
      evidence,
      recommendation: "Replace npm install with npm ci to enforce the lockfile.",
    }];
  },
};

// ── ci/azure-node-version-mismatch ───────────────────────────────────────────

export const azureNodeVersionMismatchRule: Rule = {
  id: "ci/azure-node-version-mismatch",
  title: "Node.js version mismatch in Azure Pipelines",
  category: "ci",
  defaultSeverity: "high",
  description: "Detects a NodeTool@0 version in azure-pipelines.yml that conflicts with package.json engines.node.",
  async check(context) {
    if (!context.stack.azurePipelines || !context.stack.node) return [];

    const pkg = await packageJson(context);
    const engineNode = typeof (pkg?.engines as Record<string, unknown> | undefined)?.node === "string"
      ? (pkg!.engines as Record<string, string>).node : undefined;
    const pkgMajor = engineNode ? majorVersion(engineNode) : undefined;
    if (!pkgMajor) return [];

    const evidence: string[] = [`package.json engines.node: ${engineNode}`];
    const ciMajors = new Set<string>();

    for (const file of azurePipelinesFiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      // NodeTool@0 uses versionSpec: '20.x' or versionSpec: '20'
      for (const match of content.matchAll(/versionSpec\s*:\s*["']?(\d[\d.x]*)["']?/gi)) {
        const v = majorVersion(match[1]);
        if (v) { ciMajors.add(v); evidence.push(`${file}: versionSpec: ${match[1]}`); }
      }
    }

    if (ciMajors.size === 0) return [];
    const mismatched = [...ciMajors].filter((v) => v !== pkgMajor);
    if (mismatched.length === 0) return [];

    return [{
      ruleId: "ci/azure-node-version-mismatch",
      severity: "high",
      message: `Node.js versionSpec in azure-pipelines.yml (${[...ciMajors].join(", ")}) differs from package.json engines.node (${pkgMajor}).`,
      files: azurePipelinesFiles(context),
      evidence,
      recommendation: "Align the NodeTool versionSpec in azure-pipelines.yml with the engines.node value in package.json.",
    }];
  },
};
