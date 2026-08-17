import { stat } from "node:fs/promises";
import path from "node:path";
import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile, workflows } from "../utils.js";

function literalDirectories(contents: string): string[] {
  const directories = new Set<string>();
  for (const match of contents.matchAll(/^\s*working-directory\s*:\s*["']?([^\s#"']+)["']?/gim)) {
    const value = match[1].replace(/^\.\//, "").replaceAll("\\", "/");
    if (value && !value.includes("${{") && !value.startsWith("/") && !value.split("/").includes("..")) directories.add(value.replace(/\/$/, ""));
  }
  return [...directories];
}

export const workingDirectoryMissingRule: Rule = {
  id: "ci/working-directory-missing", title: "CI working directory is missing", category: "ci", defaultSeverity: "high",
  description: "Detects literal GitHub Actions working-directory paths that do not exist.",
  async check(context): Promise<Finding[]> {
    const evidence: string[] = []; const files: string[] = [];
    for (const file of workflows(context)) {
      const contents = await readRepositoryFile(context, file); if (!contents) continue;
      for (const directory of literalDirectories(contents)) {
        try { if ((await stat(path.join(context.rootDir, directory))).isDirectory()) continue; } catch { /* missing */ }
        evidence.push(`${file}: working-directory ${directory} does not exist`); files.push(file);
      }
    }
    if (!evidence.length) return [];
    return [{ ruleId: "ci/working-directory-missing", severity: "high", message: "GitHub Actions references working directories that do not exist.", files: [...new Set(files)], evidence, recommendation: "Correct the working-directory path or add the expected directory to the repository." }];
  },
};
