import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { Finding, RepositoryContext, Rule } from "./types.js";

export const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".git", "node_modules", "dist", "build", "coverage", ".next", "out", "vendor", "fixtures", "tests",
]);

export interface ScanOptions { ignoredDirectories?: ReadonlySet<string>; }

export async function createRepositoryContext(rootDir: string, options: ScanOptions = {}): Promise<RepositoryContext> {
  const resolvedRoot = path.resolve(rootDir);
  const ignored = options.ignoredDirectories ?? DEFAULT_IGNORED_DIRECTORIES;
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
    await Promise.all(entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) await visit(absolutePath);
      } else if (entry.isFile()) {
        files.push(path.relative(resolvedRoot, absolutePath).split(path.sep).join("/"));
      }
    }));
  }
  await visit(resolvedRoot);
  const sortedFiles = files.sort();
  const packageFile = sortedFiles.find((file) => file === "package.json");
  let packageData: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {};
  if (packageFile) {
    try { packageData = JSON.parse(await readFile(path.join(resolvedRoot, packageFile), "utf8")) as typeof packageData; } catch { /* rules handle malformed package data where relevant */ }
  }
  const dependencies = { ...packageData.dependencies, ...packageData.devDependencies };
  const has = (name: string) => Object.hasOwn(dependencies, name);
  const stack = {
    node: Boolean(packageFile || sortedFiles.some((file) => /^(\.nvmrc|\.node-version)$/.test(file))),
    typescript: sortedFiles.some((file) => file.endsWith(".ts") || file.endsWith(".tsx") || file === "tsconfig.json"),
    javascript: sortedFiles.some((file) => /\.[cm]?jsx?$/.test(file)),
    docker: sortedFiles.some((file) => /(^|\/)Dockerfile(?:\..+)?$/.test(file)),
    githubActions: sortedFiles.some((file) => /^\.github\/workflows\/.*\.ya?ml$/.test(file)),
    prisma: sortedFiles.some((file) => /(^|\/)schema\.prisma$/.test(file)) || has("prisma") || has("@prisma/client"),
    nextjs: has("next"), express: has("express"),
    packageManager: sortedFiles.includes("pnpm-lock.yaml") ? "pnpm" as const : sortedFiles.includes("yarn.lock") ? "yarn" as const : sortedFiles.includes("package-lock.json") ? "npm" as const : undefined,
  };
  return { rootDir: resolvedRoot, files: sortedFiles, stack };
}

export async function runRules(context: RepositoryContext, rules: readonly Rule[]): Promise<Finding[]> {
  const results = await Promise.all(rules.map((rule) => rule.check(context)));
  return results.flat().sort((left, right) => left.ruleId.localeCompare(right.ruleId));
}

export async function scanRepository(rootDir: string, rules: readonly Rule[], options: ScanOptions = {}): Promise<Finding[]> {
  const context = await createRepositoryContext(rootDir, options);
  return runRules(context, rules);
}
