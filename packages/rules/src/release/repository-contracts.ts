import path from "node:path";
import type { Finding, Rule } from "@blindspot/core";
import { packageJson, readRepositoryFile, workflows } from "../utils.js";

function runtimeTargets(pkg: Record<string, unknown>): string[] {
  const targets = new Set<string>(); const add = (value: unknown) => { if (typeof value === "string" && !value.startsWith("#")) targets.add(value.replace(/^\.\//, "")); };
  add(pkg.main); add(pkg.module); add(pkg.types); add(pkg.typings);
  if (typeof pkg.bin === "string") add(pkg.bin); else if (pkg.bin && typeof pkg.bin === "object") Object.values(pkg.bin as Record<string, unknown>).forEach(add);
  const visit = (value: unknown): void => { if (typeof value === "string") add(value); else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(visit); };
  visit(pkg.exports); return [...targets];
}
function covered(target: string, entries: string[]): boolean { return entries.some((entry) => { const clean = entry.replace(/^\.\//, "").replace(/\*.*$/, "").replace(/\/$/, ""); return clean === target || target.startsWith(`${clean}/`) || clean === "."; }); }
const sensitiveEnvName = (value: string) => { const base = path.posix.basename(value); return /^\.env(?:\..+)?$/.test(base) && !/\.env(?:\..+)?\.(?:example|sample|template)$/.test(base); };

export const npmFilesExcludesRuntimeRule: Rule = {
  id: "release/npm-files-excludes-runtime", title: "npm files excludes runtime target", category: "release", defaultSeverity: "high",
  description: "Compares package runtime entry points with the npm files allowlist.",
  async check(context): Promise<Finding[]> {
    const pkg = await packageJson(context); if (!pkg || !Array.isArray(pkg.files) || !pkg.files.every((entry) => typeof entry === "string")) return [];
    const entries = pkg.files as string[]; const excluded = runtimeTargets(pkg).filter((target) => !covered(target, entries)); if (!excluded.length) return [];
    return [{ ruleId: "release/npm-files-excludes-runtime", severity: "high", message: "The npm files allowlist excludes declared runtime entry points.", files: ["package.json"], evidence: [...excluded.map((target) => `runtime target: ${target}`), `files allowlist: ${entries.join(", ")}`], recommendation: "Include every main, types, exports, and bin target in the package files allowlist." }];
  },
};

export const npmFilesIncludesSecretRule: Rule = {
  id: "release/npm-files-includes-secret", title: "npm files explicitly includes env secret", category: "release", defaultSeverity: "critical",
  description: "Detects sensitive env filenames explicitly included in the npm files allowlist.",
  async check(context): Promise<Finding[]> {
    const pkg = await packageJson(context); if (!pkg || !Array.isArray(pkg.files)) return [];
    const included = pkg.files.filter((entry): entry is string => typeof entry === "string" && sensitiveEnvName(entry)); if (!included.length) return [];
    return [{ ruleId: "release/npm-files-includes-secret", severity: "critical", message: "The npm package files allowlist explicitly includes sensitive environment files.", files: ["package.json", ...included], evidence: included.map((file) => `package.json files: ${file}`), recommendation: "Remove sensitive env files from the npm files allowlist and rotate any published credentials." }];
  },
};

export const publishPrivatePackageRule: Rule = {
  id: "release/publish-private-package", title: "CI publishes a private package", category: "release", defaultSeverity: "high",
  description: "Detects npm publish commands for a package marked private.",
  async check(context): Promise<Finding[]> {
    const pkg = await packageJson(context); if (pkg?.private !== true) return [];
    const affected: string[] = [];
    for (const file of workflows(context)) { const content = await readRepositoryFile(context, file); if (content && /\bnpm\s+publish\b/.test(content)) affected.push(file); }
    if (!affected.length) return [];
    return [{ ruleId: "release/publish-private-package", severity: "high", message: "GitHub Actions attempts to publish a package marked private.", files: ["package.json", ...affected], evidence: ["package.json: private = true", ...affected.map((file) => `${file}: npm publish`)], recommendation: "Remove the publish step or intentionally change the package publication contract." }];
  },
};
