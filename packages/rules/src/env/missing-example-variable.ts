import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Finding, Rule } from "@blindspot/core";

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const DOT_ENV = /\bprocess\.env\.([A-Z][A-Z0-9_]*)\b/g;
const BRACKET_ENV = /\bprocess\.env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g;

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
  title: "Missing environment example variable",
  category: "env",
  defaultSeverity: "medium",
  description: "Detects environment variables absent from .env.example.",
  async check(context): Promise<Finding[]> {
    const sourceFiles = context.files.filter((file) => SOURCE_FILE.test(file));
    const used = new Set<string>();
    for (const file of sourceFiles) {
      let source: string;
      try { source = await readFile(path.join(context.rootDir, file), "utf8"); } catch { continue; }
      variablesInSource(source).forEach((variable) => used.add(variable));
    }
    if (used.size === 0) return [];
    const exampleFile = context.files.find((file) => file === ".env.example");
    const usedVariables = [...used].sort();
    if (!exampleFile) {
      return [{
        ruleId: "env/example-missing-variable", severity: "medium",
        message: `.env.example is missing. Detected variables: ${usedVariables.join(", ")}.`,
        recommendation: "Create .env.example and document the environment variables required by the application.",
      }];
    }
    let contents: string;
    try { contents = await readFile(path.join(context.rootDir, exampleFile), "utf8"); } catch { return []; }
    const documented = documentedVariables(contents);
    return usedVariables.filter((variable) => !documented.has(variable)).map((variable) => ({
      ruleId: "env/example-missing-variable", severity: "medium",
      message: `${variable} is used by the application but is not documented in .env.example.`,
      files: [exampleFile],
      recommendation: `Add ${variable}= to .env.example.`,
    }));
  },
};
