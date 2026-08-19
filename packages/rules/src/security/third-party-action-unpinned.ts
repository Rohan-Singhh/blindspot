import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile, workflows } from "../utils.js";

// Full SHA-1 commit hash: exactly 40 hex chars
const SHA_PIN_PATTERN = /^[0-9a-f]{40}$/i;

// First-party action namespaces that don't require pinning
const FIRST_PARTY_PREFIXES = ["actions/", "github/"];

export const thirdPartyActionUnpinnedRule: Rule = {
  id: "security/third-party-action-unpinned",
  title: "Third-party GitHub Action not pinned to a commit SHA",
  category: "security",
  defaultSeverity: "medium",
  description: "Detects third-party GitHub Actions used with a branch or tag reference instead of a full commit SHA, exposing the workflow to supply-chain attacks.",
  async check(context) {
    if (!context.stack.githubActions) return [];

    const evidence: string[] = [];
    const affectedFiles: string[] = [];

    for (const file of workflows(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match "uses: org/action@ref"
        const useMatch = /^\s+-?\s*uses\s*:\s*["']?([^@\s"']+)@([^\s"'#]+)/.exec(line);
        if (!useMatch) continue;

        const actionRef = useMatch[1]; // e.g. "aws-actions/configure-aws-credentials"
        const pin = useMatch[2]; // e.g. "v4" or "abc1234..."

        // Skip first-party actions
        if (FIRST_PARTY_PREFIXES.some((prefix) => actionRef.startsWith(prefix))) continue;
        // Skip local actions (./.github/actions/...)
        if (actionRef.startsWith("./") || actionRef.startsWith(".github/")) continue;
        // Skip if already pinned to a full SHA
        if (SHA_PIN_PATTERN.test(pin)) continue;

        evidence.push(`${file}:${i + 1}: uses: ${actionRef}@${pin}`);
        if (!affectedFiles.includes(file)) affectedFiles.push(file);
      }
    }

    if (evidence.length === 0) return [];
    return [{
      ruleId: "security/third-party-action-unpinned",
      severity: "medium",
      message: `${evidence.length} third-party GitHub Action(s) are pinned to a branch or tag rather than a commit SHA.`,
      files: affectedFiles,
      evidence,
      recommendation: "Pin each third-party action to a full commit SHA (e.g. uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502). Use a tool like Dependabot or pin-github-action to automate this.",
    }];
  },
};
