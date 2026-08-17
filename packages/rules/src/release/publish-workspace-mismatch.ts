import { stat } from "node:fs/promises";
import path from "node:path";
import type { Finding, Rule } from "@blindspot/core";
import { jsonFile, readRepositoryFile, workflows } from "../utils.js";

function publishDirectories(source: string): string[] {
  const lines = source.split(/\r?\n/);
  const targets = new Set<string>();
  for (let publishLine = 0; publishLine < lines.length; publishLine += 1) {
    if (!/\bnpm\s+publish\b/.test(lines[publishLine])) continue;
    const publishIndent = /^\s*/.exec(lines[publishLine])?.[0].length ?? 0;
    let start = publishLine;
    let itemIndent = -1;
    for (let index = publishLine; index >= 0; index -= 1) {
      const item = /^(\s*)-\s+/.exec(lines[index]);
      if (item && item[1].length <= publishIndent) { start = index; itemIndent = item[1].length; break; }
    }
    if (itemIndent < 0) continue;
    let end = lines.length;
    for (let index = start + 1; index < lines.length; index += 1) {
      const item = /^(\s*)-\s+/.exec(lines[index]);
      if (item && item[1].length === itemIndent) { end = index; break; }
    }
    const block = lines.slice(start, end).join("\n");
    const match = /^\s*working-directory\s*:\s*["']?([^\s#"']+)["']?\s*$/im.exec(block);
    if (!match) continue;
    const value = match[1].replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
    if (value && value !== "." && !value.includes("${{") && !value.startsWith("/") && !value.split("/").includes("..")) targets.add(value);
  }
  return [...targets];
}

export const publishWorkspaceMismatchRule: Rule = {
  id: "release/publish-workspace-mismatch",
  title: "CI publish workspace mismatch",
  category: "release",
  defaultSeverity: "high",
  description: "Detects npm publish steps targeting a directory without a publishable package manifest.",
  async check(context): Promise<Finding[]> {
    const evidence: string[] = [];
    const affected = new Set<string>();
    for (const workflow of workflows(context)) {
      const source = await readRepositoryFile(context, workflow);
      if (!source) continue;
      for (const directory of publishDirectories(source)) {
        try { if (!(await stat(path.join(context.rootDir, directory))).isDirectory()) continue; } catch { continue; }
        const manifestFile = `${directory}/package.json`;
        affected.add(workflow); affected.add(manifestFile);
        if (!context.files.includes(manifestFile)) {
          evidence.push(`${workflow}: npm publish targets ${directory}, but ${manifestFile} is missing`);
          continue;
        }
        const manifest = await jsonFile(context, manifestFile);
        if (manifest?.private === true) evidence.push(`${workflow}: npm publish targets ${manifestFile}, which declares private = true`);
        else affected.delete(manifestFile);
      }
    }
    if (evidence.length === 0) return [];
    return [{
      ruleId: "release/publish-workspace-mismatch",
      severity: "high",
      message: "GitHub Actions targets a workspace that is not publishable with npm.",
      files: [...affected],
      evidence,
      recommendation: "Point the publish step at the intended public package, add its package.json, or remove publication from private workspaces.",
    }];
  },
};
