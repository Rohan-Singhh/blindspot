import type { Finding, Rule } from "@blindspot/core";
import { terraformFiles, readRepositoryFile } from "../utils.js";

export const providerVersionUnpinnedRule: Rule = {
  id: "terraform/provider-version-unpinned",
  title: "Terraform provider version unpinned",
  category: "terraform",
  defaultSeverity: "high",
  description: "Detects required_providers blocks where a provider has no version constraint, allowing breaking provider upgrades.",
  async check(context) {
    if (!context.stack.terraform) return [];

    const unpinnedProviders: string[] = [];

    for (const file of terraformFiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;

      // Find required_providers block
      const blockMatch = /required_providers\s*\{([^}]+)\}/s.exec(content);
      if (!blockMatch) continue;

      const block = blockMatch[1];
      // Each provider entry: name = { source = "..." } with optional version
      // Split on provider name assignments
      for (const match of block.matchAll(/(\w+)\s*=\s*\{([^}]+)\}/gs)) {
        const providerName = match[1];
        const providerBlock = match[2];
        if (!/\bversion\s*=/.test(providerBlock)) {
          unpinnedProviders.push(`${file}: provider "${providerName}" has no version constraint`);
        }
      }
    }

    if (unpinnedProviders.length === 0) return [];
    return [{
      ruleId: "terraform/provider-version-unpinned",
      severity: "high",
      message: `${unpinnedProviders.length} provider(s) in required_providers have no version constraint.`,
      evidence: unpinnedProviders,
      files: [...new Set(unpinnedProviders.map((e) => e.split(":")[0]))],
      recommendation: "Add a version constraint for every provider (e.g. version = \"~> 5.0\") to prevent unexpected breaking upgrades.",
    }];
  },
};
