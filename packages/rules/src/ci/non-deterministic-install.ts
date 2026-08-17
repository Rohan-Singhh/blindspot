import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile, workflows } from "../utils.js";

export const nonDeterministicInstallRule: Rule = {
  id: "ci/non-deterministic-install", title: "Non-deterministic CI install", category: "ci", defaultSeverity: "medium",
  description: "Detects npm install in GitHub Actions when a package lockfile is available.",
  async check(context): Promise<Finding[]> {
    if (!context.files.includes("package-lock.json")) return [];
    const affected: string[] = [];
    for (const file of workflows(context)) {
      const content = await readRepositoryFile(context, file);
      if (content && /\bnpm\s+install\b/.test(content)) affected.push(file);
    }
    if (!affected.length) return [];
    return [{ ruleId: "ci/non-deterministic-install", severity: "medium", message: "GitHub Actions uses npm install even though package-lock.json is present.", files: ["package-lock.json", ...affected], recommendation: "Use npm ci in CI for deterministic dependency installation." }];
  },
};
