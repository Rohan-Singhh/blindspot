import path from "node:path";
import type { Finding, Rule } from "@blindspot/core";
import { lockfileManagers, readRepositoryFile, workflows } from "../utils.js";

export const cacheLockfilePathMissingRule: Rule = {
  id: "ci/cache-lockfile-path-missing", title: "CI cache lockfile path is invalid", category: "ci", defaultSeverity: "high",
  description: "Validates literal setup-node cache-dependency-path values against repository lockfiles.",
  async check(context): Promise<Finding[]> {
    const evidence: string[] = []; const files: string[] = [];
    for (const file of workflows(context)) {
      const contents = await readRepositoryFile(context, file); if (!contents || !/actions\/setup-node@/i.test(contents)) continue;
      const cache = /^\s*cache\s*:\s*["']?(npm|pnpm|yarn)["']?/im.exec(contents)?.[1]; if (!cache) continue;
      for (const match of contents.matchAll(/^\s*cache-dependency-path\s*:\s*["']?([^\s#"']+)["']?/gim)) {
        const value = match[1].replace(/^\.\//, "").replaceAll("\\", "/");
        if (!value || value === "|" || value === ">" || /[?*\[\]]|\$\{\{/.test(value) || value.split("/").includes("..")) continue;
        if (!context.files.includes(value)) { evidence.push(`${file}: cache-dependency-path ${value} does not exist`); files.push(file); continue; }
        const manager = lockfileManagers.get(path.posix.basename(value));
        if (manager && manager !== cache) { evidence.push(`${file}: cache is ${cache}, but ${value} belongs to ${manager}`); files.push(file, value); }
      }
    }
    if (!evidence.length) return [];
    return [{ ruleId: "ci/cache-lockfile-path-missing", severity: "high", message: "GitHub Actions has invalid dependency-cache lockfile paths.", files: [...new Set(files)], evidence, recommendation: "Point cache-dependency-path to an existing lockfile for the configured package manager." }];
  },
};
