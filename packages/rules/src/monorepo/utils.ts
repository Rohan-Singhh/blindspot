import type { RepositoryContext } from "@blindspot/core";
import { jsonFile, readRepositoryFile } from "../utils.js";

const globRegex = (pattern: string): RegExp => {
  const normalized = pattern.replace(/\\/g, "/").replace(/\/$/, "");
  let source = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === "*" && normalized[index + 1] === "*") { source += ".*"; index += 1; }
    else if (character === "*") source += "[^/]*";
    else if (character === "?") source += "[^/]";
    else source += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
};

export async function workspaceManifestFiles(context: RepositoryContext): Promise<string[]> {
  const root = await jsonFile(context, "package.json");
  const configured = Array.isArray(root?.workspaces)
    ? root.workspaces
    : root?.workspaces && typeof root.workspaces === "object" && Array.isArray((root.workspaces as Record<string, unknown>).packages)
      ? (root.workspaces as Record<string, unknown>).packages as unknown[]
      : [];
  let patterns = configured.filter((value): value is string => typeof value === "string");
  if (patterns.length === 0 && context.files.includes("pnpm-workspace.yaml")) {
    const yaml = await readRepositoryFile(context, "pnpm-workspace.yaml");
    patterns = [...(yaml ?? "").matchAll(/^\s*-\s*["']?([^"'#]+?)["']?\s*$/gm)].map((match) => match[1].trim());
  }
  if (patterns.length === 0) return [];
  const includes = patterns.filter((pattern) => !pattern.startsWith("!")).map(globRegex);
  const excludes = patterns.filter((pattern) => pattern.startsWith("!")).map((pattern) => globRegex(pattern.slice(1)));
  return context.files.filter((file) => {
    if (!file.endsWith("/package.json")) return false;
    const directory = file.slice(0, -"/package.json".length);
    return includes.some((pattern) => pattern.test(directory)) && !excludes.some((pattern) => pattern.test(directory));
  });
}
