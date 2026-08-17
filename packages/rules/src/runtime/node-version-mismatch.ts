import type { Finding, Rule } from "@blindspot/core";
import { dockerfiles, packageJson, readRepositoryFile, workflows } from "../utils.js";

const major = (value: string): string | undefined => /(?:^|[^\d])(\d{1,3})(?:\.\d+)?/.exec(value)?.[1];

export const nodeVersionMismatchRule: Rule = {
  id: "runtime/node-version-mismatch", title: "Node.js runtime version mismatch", category: "runtime", defaultSeverity: "high",
  description: "Detects inconsistent Node.js versions across repository configuration.",
  async check(context): Promise<Finding[]> {
    const evidence: string[] = [];
    const pkg = await packageJson(context);
    const engine = pkg?.engines && typeof pkg.engines === "object" ? (pkg.engines as Record<string, unknown>).node : undefined;
    if (typeof engine === "string" && major(engine)) evidence.push(`package.json: ${engine}`);
    for (const file of [".nvmrc", ".node-version"].filter((candidate) => context.files.includes(candidate))) {
      const contents = await readRepositoryFile(context, file); if (!contents) continue;
      const value = contents.trim().split(/\s+/)[0];
      if (major(value)) evidence.push(`${file}: ${value}`);
    }
    for (const file of dockerfiles(context)) {
      const content = await readRepositoryFile(context, file); if (!content) continue;
      for (const match of content.matchAll(/^\s*FROM\s+node:([^\s@]+)/gim)) if (major(match[1])) evidence.push(`${file}: ${match[1]}`);
    }
    for (const file of workflows(context)) {
      const content = await readRepositoryFile(context, file); if (!content) continue;
      for (const match of content.matchAll(/node-version\s*:\s*["']?([^\s#"']+)/gi)) if (major(match[1])) evidence.push(`${file}: ${match[1]}`);
    }
    const versions = new Set(evidence.map((entry) => major(entry.slice(entry.indexOf(":") + 1))).filter(Boolean));
    if (versions.size < 2) return [];
    return [{ ruleId: "runtime/node-version-mismatch", severity: "high", message: "Node.js runtime versions are inconsistent.", evidence,
      files: evidence.map((entry) => entry.split(":")[0]), recommendation: "Align Node.js versions across package.json, local development, Docker, and CI." }];
  },
};
