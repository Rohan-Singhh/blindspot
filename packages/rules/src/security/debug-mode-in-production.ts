import type { Finding, Rule } from "@blindspot/core";
import { envTemplates, readRepositoryFile } from "../utils.js";

// Env vars that indicate debug/dev mode when set to truthy values
const DEBUG_VARS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^\s*DEBUG\s*=\s*(?:true|1|yes|on)\s*$/im, label: "DEBUG=true" },
  { pattern: /^\s*NODE_ENV\s*=\s*development\s*$/im, label: "NODE_ENV=development" },
  { pattern: /^\s*FLASK_ENV\s*=\s*development\s*$/im, label: "FLASK_ENV=development" },
  { pattern: /^\s*APP_ENV\s*=\s*(?:dev|development|local)\s*$/im, label: "APP_ENV=development" },
  { pattern: /^\s*DJANGO_DEBUG\s*=\s*(?:true|1|yes|True)\s*$/im, label: "DJANGO_DEBUG=True" },
  { pattern: /^\s*RAILS_ENV\s*=\s*development\s*$/im, label: "RAILS_ENV=development" },
];

function isProductionTemplate(file: string): boolean {
  const basename = file.split("/").at(-1) ?? file;
  // Exclude files explicitly scoped to dev/test/local environments
  if (/(?:dev|test|local|development|staging)/.test(basename)) return false;
  return true;
}

export const debugModeInProductionRule: Rule = {
  id: "security/debug-mode-in-production",
  title: "Debug mode enabled in production config",
  category: "security",
  defaultSeverity: "high",
  description: "Detects DEBUG=true or equivalent settings in production-scoped env templates.",
  async check(context) {
    const prodTemplates = envTemplates(context).filter(isProductionTemplate);
    if (prodTemplates.length === 0) return [];

    const evidence: string[] = [];
    const affectedFiles: string[] = [];

    for (const file of prodTemplates) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      for (const { pattern, label } of DEBUG_VARS) {
        if (pattern.test(content)) {
          evidence.push(`${file}: ${label}`);
          if (!affectedFiles.includes(file)) affectedFiles.push(file);
        }
      }
    }

    if (evidence.length === 0) return [];
    return [{
      ruleId: "security/debug-mode-in-production",
      severity: "high",
      message: "Debug or development mode is enabled in a production env template.",
      files: affectedFiles,
      evidence,
      recommendation: "Set DEBUG=false (or remove the variable) and NODE_ENV=production in production env templates. Debug mode can expose stack traces and internal details.",
    }];
  },
};
