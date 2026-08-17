import type { Finding, Rule } from "@blindspot/core";
import { jsonFile } from "../utils.js";
import { workspaceManifestFiles } from "./utils.js";

const commandSegments = (command: string): string[] => command.split(/&&|\|\||[;\n]/).map((part) => part.trim());

function recursiveScript(segment: string): string | undefined {
  if (/--if-present\b/.test(segment)) return undefined;
  const patterns = [
    /\bnpm\s+(?:--workspaces|-ws)\s+run\s+([\w:.-]+)/,
    /\bnpm\s+run\s+([\w:.-]+).*?(?:--workspaces|-ws)\b/,
    /\bpnpm\s+(?:-r|--recursive)\s+(?:run\s+)?([\w:.-]+)/,
    /\byarn\s+workspaces\s+foreach\b.*?\brun\s+([\w:.-]+)/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(segment);
    if (match) return match[1];
  }
  return undefined;
}

export const workspaceScriptMissingRule: Rule = {
  id: "monorepo/workspace-script-missing",
  title: "Missing recursive workspace scripts",
  category: "monorepo",
  defaultSeverity: "high",
  description: "Detects root scripts that require a script from every workspace when some workspaces do not define it.",
  async check(context): Promise<Finding[]> {
    const manifests = await workspaceManifestFiles(context);
    if (manifests.length === 0) return [];
    const root = await jsonFile(context, "package.json");
    const scripts = root?.scripts && typeof root.scripts === "object" ? root.scripts as Record<string, unknown> : {};
    const findings: Finding[] = [];
    for (const [rootScript, command] of Object.entries(scripts)) {
      if (typeof command !== "string") continue;
      for (const targetScript of new Set(commandSegments(command).map(recursiveScript).filter((value): value is string => Boolean(value)))) {
        const missing: string[] = [];
        for (const manifestFile of manifests) {
          const manifest = await jsonFile(context, manifestFile);
          const workspaceScripts = manifest?.scripts && typeof manifest.scripts === "object" ? manifest.scripts as Record<string, unknown> : {};
          if (typeof workspaceScripts[targetScript] !== "string") missing.push(manifestFile);
        }
        if (missing.length === 0) continue;
        findings.push({
          ruleId: "monorepo/workspace-script-missing",
          severity: "high",
          message: `Root script "${rootScript}" runs "${targetScript}" across every workspace, but ${missing.length} workspace ${missing.length === 1 ? "does" : "do"} not define it.`,
          files: ["package.json", ...missing],
          evidence: [`package.json scripts.${rootScript}: ${command}`, ...missing.map((file) => `${file}: missing scripts.${targetScript}`)],
          recommendation: `Define scripts.${targetScript} in every selected workspace, narrow the workspace selection, or use --if-present when omission is intentional.`,
        });
      }
    }
    return findings;
  },
};
