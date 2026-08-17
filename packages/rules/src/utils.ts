import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { RepositoryContext } from "@blindspot/core";

export const dockerfiles = (context: RepositoryContext): string[] => context.files.filter((file) => /(^|\/)Dockerfile(?:\..+)?$/.test(file));
export const workflows = (context: RepositoryContext): string[] => context.files.filter((file) => /^\.github\/workflows\/.*\.ya?ml$/.test(file));
const MAX_TEXT_FILE_SIZE = 2 * 1024 * 1024;
export async function readRepositoryFile(context: RepositoryContext, file: string): Promise<string | undefined> {
  try {
    const filePath = path.join(context.rootDir, file);
    if ((await stat(filePath)).size > MAX_TEXT_FILE_SIZE) return undefined;
    return await readFile(filePath, "utf8");
  } catch { return undefined; }
}
export async function packageJson(context: RepositoryContext): Promise<Record<string, unknown> | undefined> {
  if (!context.files.includes("package.json")) return undefined;
  try { const contents = await readRepositoryFile(context, "package.json"); return contents ? JSON.parse(contents) as Record<string, unknown> : undefined; } catch { return undefined; }
}
