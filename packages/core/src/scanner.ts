import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Finding, RepositoryContext, Rule } from "./types.js";

export const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".git", "node_modules", "dist", "build", "coverage", ".next", "fixtures", "tests",
]);

export interface ScanOptions { ignoredDirectories?: ReadonlySet<string>; }

export async function createRepositoryContext(rootDir: string, options: ScanOptions = {}): Promise<RepositoryContext> {
  const resolvedRoot = path.resolve(rootDir);
  const ignored = options.ignoredDirectories ?? DEFAULT_IGNORED_DIRECTORIES;
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
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
  return { rootDir: resolvedRoot, files: files.sort() };
}

export async function runRules(context: RepositoryContext, rules: readonly Rule[]): Promise<Finding[]> {
  const results = await Promise.all(rules.map((rule) => rule.check(context)));
  return results.flat().sort((left, right) => left.ruleId.localeCompare(right.ruleId));
}

export async function scanRepository(rootDir: string, rules: readonly Rule[], options: ScanOptions = {}): Promise<Finding[]> {
  const context = await createRepositoryContext(rootDir, options);
  return runRules(context, rules);
}
