import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Finding, Rule } from "@blindspot/core";

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const DOT_ENV = /\bprocess\.env\.([A-Z][A-Z0-9_]*)\b/g;
const BRACKET_ENV = /\bprocess\.env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g;
const ENV_TEMPLATE = /(^|\/)\.env(?:\..+)?\.(?:example|sample|template)$/;

function variablesInSource(source: string): string[] {
  return [...source.matchAll(DOT_ENV), ...source.matchAll(BRACKET_ENV)].map((match) => match[1]);
}

function documentedVariables(example: string): Set<string> {
  const variables = new Set<string>();
  for (const line of example.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (match) variables.add(match[1]);
  }
  return variables;
}

export const missingExampleVariableRule: Rule = {
  id: "env/example-missing-variable",
  title: "Missing environment template variables",
  category: "env",
  defaultSeverity: "medium",
  description: "Detects environment variables absent from recognized .env templates.",
  async check(context): Promise<Finding[]> {
    const sourceFiles = context.files.filter((file) => SOURCE_FILE.test(file));
    const used = new Set<string>();
    for (const file of sourceFiles) {
      let source: string;
      try { source = await readFile(path.join(context.rootDir, file), "utf8"); } catch { continue; }
      variablesInSource(source).forEach((variable) => used.add(variable));
    }
    if (used.size === 0) return [];
    const templateFiles = context.files.filter((file) => ENV_TEMPLATE.test(file));
    const usedVariables = [...used].sort();
    if (templateFiles.length === 0) {
      return [{
        ruleId: "env/example-missing-variable", severity: "medium",
        message: `No environment template is present. Detected variables: ${usedVariables.join(", ")}.`,
        evidence: usedVariables,
        recommendation: "Create an .env.example, .env.sample, or .env.template file and document the required variables.",
      }];
    }
    const documented = new Set<string>();
    for (const templateFile of templateFiles) {
      try { documentedVariables(await readFile(path.join(context.rootDir, templateFile), "utf8")).forEach((variable) => documented.add(variable)); } catch { continue; }
    }
    const missing = usedVariables.filter((variable) => !documented.has(variable));
    if (!missing.length) return [];
    return [{
      ruleId: "env/example-missing-variable", severity: "medium",
      message: `${missing.length} environment ${missing.length === 1 ? "variable is" : "variables are"} used but not documented in any recognized env template. Missing: ${missing.join(", ")}.`,
      files: templateFiles,
      evidence: missing,
      recommendation: "Document the missing variables in an .env.example, .env.sample, or .env.template file.",
    }];
  },
};
