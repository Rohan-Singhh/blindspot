import type { Finding, Rule } from "@blindspot/core";
import { envTemplates, readRepositoryFile } from "../utils.js";

export const duplicateTemplateVariableRule: Rule = {
  id: "env/duplicate-template-variable", title: "Duplicate env template variable", category: "env", defaultSeverity: "medium",
  description: "Detects duplicate variable declarations within recognized env templates.",
  async check(context): Promise<Finding[]> {
    const evidence: string[] = []; const files: string[] = [];
    for (const file of envTemplates(context)) {
      const content = await readRepositoryFile(context, file); if (!content) continue; const seen = new Set<string>(); const duplicates = new Set<string>();
      for (const line of content.split(/\r?\n/)) { const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line); if (!match) continue; if (seen.has(match[1])) duplicates.add(match[1]); seen.add(match[1]); }
      if (duplicates.size) { files.push(file); evidence.push(`${file}: ${[...duplicates].sort().join(", ")}`); }
    }
    if (!evidence.length) return [];
    return [{ ruleId: "env/duplicate-template-variable", severity: "medium", message: "Environment templates declare the same variable more than once within a file.", files, evidence, recommendation: "Keep one authoritative declaration for each variable in each template." }];
  },
};
