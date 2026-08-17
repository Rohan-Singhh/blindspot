import type { Finding, Rule } from "@blindspot/core";
import { lockfileManagers, packageJson, readRepositoryFile, rootLockfiles, workflows } from "../utils.js";

export const scriptCommandMissingRule: Rule = {
  id: "ci/script-command-missing", title: "CI invokes an undefined package script", category: "ci", defaultSeverity: "high",
  description: "Compares explicit package-manager run commands in GitHub Actions with package.json scripts.",
  async check(context): Promise<Finding[]> {
    const pkg = await packageJson(context); const scripts = pkg?.scripts && typeof pkg.scripts === "object" ? pkg.scripts as Record<string, unknown> : {};
    const evidence: string[] = []; const files: string[] = ["package.json"];
    for (const file of workflows(context)) {
      const content = await readRepositoryFile(context, file); if (!content || /working-directory\s*:/.test(content)) continue;
      for (const line of content.split(/\r?\n/)) {
        if (/--workspace(?:=|\s)/.test(line)) continue;
        for (const match of line.matchAll(/\b(?:npm|pnpm|yarn)\s+run\s+([\w:.-]+)/g)) if (!(match[1] in scripts)) { evidence.push(`${file}: runs undefined script '${match[1]}'`); files.push(file); }
      }
    }
    if (!evidence.length) return [];
    return [{ ruleId: "ci/script-command-missing", severity: "high", message: "GitHub Actions invokes package scripts that are not defined in package.json.", files: [...new Set(files)], evidence, recommendation: "Define the referenced scripts or correct the workflow commands." }];
  },
};

export const cachePackageManagerMismatchRule: Rule = {
  id: "ci/cache-package-manager-mismatch", title: "CI cache package manager mismatch", category: "ci", defaultSeverity: "medium",
  description: "Compares setup-node cache configuration with the unambiguous root lockfile.",
  async check(context): Promise<Finding[]> {
    const locks = rootLockfiles(context); if (locks.length !== 1) return [];
    const expected = lockfileManagers.get(locks[0]); const evidence: string[] = []; const files: string[] = [locks[0]];
    for (const file of workflows(context)) {
      const content = await readRepositoryFile(context, file); if (!content || !/actions\/setup-node@/i.test(content) || /cache-dependency-path\s*:/.test(content)) continue;
      for (const match of content.matchAll(/^\s*cache\s*:\s*["']?(npm|pnpm|yarn)["']?/gim)) if (match[1] !== expected) { evidence.push(`${file}: setup-node cache is ${match[1]}`); files.push(file); }
    }
    if (!evidence.length) return [];
    return [{ ruleId: "ci/cache-package-manager-mismatch", severity: "medium", message: "GitHub Actions caches a different package manager than the root lockfile uses.", files: [...new Set(files)], evidence: [`${locks[0]}: ${expected}`, ...evidence], recommendation: `Configure setup-node cache for ${expected}.` }];
  },
};
