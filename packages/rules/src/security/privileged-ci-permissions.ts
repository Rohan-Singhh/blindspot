import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile, workflows } from "../utils.js";

export const privilegedCiPermissionsRule: Rule = {
  id: "security/privileged-ci-permissions",
  title: "GitHub Actions workflow uses overly broad permissions",
  category: "security",
  defaultSeverity: "medium",
  description: "Detects GitHub Actions workflows that grant write-all permissions at the top level without per-job overrides.",
  async check(context) {
    if (!context.stack.githubActions) return [];

    const evidence: string[] = [];
    const affectedFiles: string[] = [];

    for (const file of workflows(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;

      // Detect top-level permissions: write-all
      if (/^permissions\s*:\s*write-all\s*$/m.test(content)) {
        // Check if every job overrides permissions with narrower scope
        const topLevelPermsMatch = content.match(/^permissions\s*:\s*write-all/m);
        if (topLevelPermsMatch) {
          evidence.push(`${file}: top-level permissions: write-all`);
          affectedFiles.push(file);
          continue;
        }
      }

      // Detect top-level permissions block that contains contents: write + no per-job override
      const topLevelBlock = /^permissions\s*:\s*\n((?:[ \t]+[^\n]+\n?)+)/m.exec(content);
      if (topLevelBlock) {
        const block = topLevelBlock[1];
        const hasWriteAll = /\bwrite-all\b/.test(block);
        const hasContentsWrite = /\bcontents\s*:\s*write\b/.test(block);
        const hasBroadWrite = /\b(?:packages|id-token|secrets)\s*:\s*write\b/.test(block);

        // Check if there are any per-job permissions overrides
        const jobsSection = content.slice(content.indexOf("jobs:"));
        const hasPerJobPerms = /^\s{4,}permissions\s*:/m.test(jobsSection);

        if ((hasWriteAll || (hasContentsWrite && hasBroadWrite)) && !hasPerJobPerms) {
          evidence.push(`${file}: broad top-level permissions without per-job overrides`);
          affectedFiles.push(file);
        }
      }
    }

    if (evidence.length === 0) return [];
    return [{
      ruleId: "security/privileged-ci-permissions",
      severity: "medium",
      message: "GitHub Actions workflow(s) grant broad top-level permissions without per-job restrictions.",
      files: [...new Set(affectedFiles)],
      evidence,
      recommendation: "Set permissions: {} at the top level and grant only the minimum required permissions per job (e.g. contents: read for most jobs).",
    }];
  },
};
