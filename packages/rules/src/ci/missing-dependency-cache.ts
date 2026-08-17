import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile, workflows } from "../utils.js";

export const missingDependencyCacheRule: Rule = {
  id: "ci/missing-dependency-cache", title: "GitHub Actions missing dependency cache", category: "ci", defaultSeverity: "medium",
  description: "Detects GitHub Actions using setup-node without enabling the cache.",
  async check(context): Promise<Finding[]> {
    const workflowFiles = workflows(context); 
    if (!workflowFiles.length) return [];
    
    const unsafeFiles: string[] = [];
    for (const file of workflowFiles) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      
      // Look for uses: actions/setup-node
      if (/uses:\s*actions\/setup-node/i.test(content)) {
        // If it doesn't have cache: npm|yarn|pnpm, flag it.
        // Simple heuristic: if it uses setup-node but the string "cache:" is missing, it's missing the cache.
        if (!/cache:\s*(['"]?)(npm|yarn|pnpm)\1/i.test(content)) {
            unsafeFiles.push(file);
        }
      }
    }
    
    if (unsafeFiles.length === 0) return [];
    return [{ 
        ruleId: "ci/missing-dependency-cache", 
        severity: "medium", 
        message: "GitHub Actions workflow uses setup-node but does not cache dependencies.", 
        files: unsafeFiles, 
        recommendation: "Add `cache: 'npm'` (or yarn/pnpm) to the setup-node action." 
    }];
  },
};
