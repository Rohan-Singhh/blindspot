import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Finding, Rule } from "@blindspot/core";
import { jsonFile } from "../utils.js";

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const ENV_TEMPLATE = /(^|\/)\.env(?:\..+)?\.(?:example|sample|template)$/;
const DOT_ENV = /\bprocess\.env\.([A-Z][A-Z0-9_]*)\b/g;
const BRACKET_ENV = /\bprocess\.env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g;

const sourceVariables = (source: string): string[] =>
  [...source.matchAll(DOT_ENV), ...source.matchAll(BRACKET_ENV)].map((match) => match[1]);

const templateVariables = (source: string): Set<string> => {
  const variables = new Set<string>();
  for (const line of source.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (match) variables.add(match[1]);
  }
  return variables;
};

export const templateWorkspaceDriftRule: Rule = {
  id: "env/template-workspace-drift",
  title: "Workspace environment-template drift",
  category: "env",
  defaultSeverity: "medium",
  description: "Detects workspace environment variables documented only by another workspace's template.",
  async check(context): Promise<Finding[]> {
    const rootPackage = await jsonFile(context, "package.json");
    if (!rootPackage?.workspaces && !context.files.includes("pnpm-workspace.yaml")) return [];

    const workspaceDirs = context.files
      .filter((file) => file.endsWith("/package.json"))
      .map((file) => path.posix.dirname(file));
    const templates = context.files.filter((file) => ENV_TEMPLATE.test(file));
    const variablesByTemplate = new Map<string, Set<string>>();
    for (const file of templates) {
      try {
        variablesByTemplate.set(file, templateVariables(await readFile(path.join(context.rootDir, file), "utf8")));
      } catch { /* Ignore unreadable templates. */ }
    }

    const findings: Finding[] = [];
    for (const workspace of workspaceDirs) {
      const prefix = `${workspace}/`;
      const localTemplates = templates.filter((file) => file.startsWith(prefix));
      if (localTemplates.length === 0) continue;

      const used = new Map<string, string[]>();
      for (const file of context.files.filter((candidate) => candidate.startsWith(prefix) && SOURCE_FILE.test(candidate))) {
        let source: string;
        try { source = await readFile(path.join(context.rootDir, file), "utf8"); } catch { continue; }
        for (const variable of sourceVariables(source)) used.set(variable, [...(used.get(variable) ?? []), file]);
      }

      const localVariables = new Set(localTemplates.flatMap((file) => [...(variablesByTemplate.get(file) ?? [])]));
      const otherTemplates = templates.filter((file) => !file.startsWith(prefix));
      const misplaced = [...used]
        .filter(([variable]) => !localVariables.has(variable) && otherTemplates.some((file) => variablesByTemplate.get(file)?.has(variable)))
        .sort(([left], [right]) => left.localeCompare(right));
      if (misplaced.length === 0) continue;

      const evidence = misplaced.map(([variable, files]) => {
        const documentedElsewhere = otherTemplates.filter((file) => variablesByTemplate.get(file)?.has(variable));
        return `${variable}: used in ${[...new Set(files)].join(", ")}; documented in ${documentedElsewhere.join(", ")}`;
      });
      findings.push({
        ruleId: "env/template-workspace-drift",
        severity: "medium",
        message: `${workspace} uses ${misplaced.length} environment ${misplaced.length === 1 ? "variable" : "variables"} documented only outside that workspace.`,
        files: [...new Set([...localTemplates, ...misplaced.flatMap(([, files]) => files)])],
        evidence,
        recommendation: "Document each workspace's required variables in a recognized env template inside that workspace.",
      });
    }
    return findings;
  },
};
