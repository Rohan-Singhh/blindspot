import type { Finding, Rule } from "@blindspot/core";
import { dockerfiles, readRepositoryFile, workflows } from "../utils.js";

export const packageManagerMismatchRule: Rule = {
  id: "runtime/package-manager-mismatch", title: "Package manager mismatch", category: "runtime", defaultSeverity: "medium",
  description: "Detects Docker or CI installs using a package manager different from the lockfile.",
  async check(context): Promise<Finding[]> {
    const locks = [["pnpm-lock.yaml", "pnpm"], ["yarn.lock", "yarn"], ["package-lock.json", "npm"]] as const;
    const detected = locks.filter(([file]) => context.files.includes(file));
    if (detected.length !== 1) return [];
    const [lockfile, expected] = detected[0];
    const mismatches: string[] = [];
    for (const file of [...dockerfiles(context), ...workflows(context)]) {
      const content = await readRepositoryFile(context, file); if (!content) continue;
      for (const match of content.matchAll(/\b(npm|pnpm|yarn)\s+(?:ci|install)\b/g)) if (match[1] !== expected) mismatches.push(`${file}: ${match[1]} install`);
    }
    if (!mismatches.length) return [];
    return [{ ruleId: "runtime/package-manager-mismatch", severity: "medium", message: `Repository appears to use ${expected}, but dependency installation uses a different package manager.`, files: [lockfile, ...mismatches.map((item) => item.split(":")[0])], evidence: mismatches, recommendation: `Use ${expected} consistently with ${lockfile}.` }];
  },
};
