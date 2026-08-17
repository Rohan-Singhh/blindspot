import type { Finding, Rule } from "@blindspot/core";
import { jsonFile } from "../utils.js";
import { workspaceManifestFiles } from "./utils.js";

export const duplicatePackageNameRule: Rule = {
  id: "monorepo/duplicate-package-name",
  title: "Duplicate workspace package names",
  category: "monorepo",
  defaultSeverity: "high",
  description: "Detects multiple declared workspaces with the same package name.",
  async check(context): Promise<Finding[]> {
    const names = new Map<string, string[]>();
    for (const file of await workspaceManifestFiles(context)) {
      const manifest = await jsonFile(context, file);
      if (typeof manifest?.name !== "string" || manifest.name.trim() === "") continue;
      names.set(manifest.name, [...(names.get(manifest.name) ?? []), file]);
    }
    const duplicates = [...names].filter(([, files]) => files.length > 1).sort(([left], [right]) => left.localeCompare(right));
    if (duplicates.length === 0) return [];
    const files = duplicates.flatMap(([, manifests]) => manifests);
    return [{
      ruleId: "monorepo/duplicate-package-name",
      severity: "high",
      message: `${duplicates.length} package ${duplicates.length === 1 ? "name is" : "names are"} reused by multiple declared workspaces.`,
      files,
      evidence: duplicates.map(([name, manifests]) => `${name}: ${manifests.join(", ")}`),
      recommendation: "Give every workspace package a unique name so package-manager targeting and dependency resolution are unambiguous.",
    } satisfies Finding];
  },
};
