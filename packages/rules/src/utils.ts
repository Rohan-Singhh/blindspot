import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { RepositoryContext } from "@blindspot/core";

// ── File selectors ────────────────────────────────────────────────────────────

export const dockerfiles = (context: RepositoryContext): string[] =>
  context.files.filter((file) => /(^|\/)Dockerfile(?:\..+)?$/.test(file));

export const workflows = (context: RepositoryContext): string[] =>
  context.files.filter((file) => /^\.github\/workflows\/.*\.ya?ml$/.test(file));

export const kubernetesManifests = (context: RepositoryContext): string[] =>
  context.files.filter((file) => /\.(yaml|yml)$/.test(file) && !/^\.github\//.test(file) && !/^\.circleci\//.test(file) && !/azure-pipeline/i.test(file) && !/^\.gitlab-ci/i.test(file));

export const terraformFiles = (context: RepositoryContext): string[] =>
  context.files.filter((file) => file.endsWith(".tf"));

export const gitlabCiFiles = (context: RepositoryContext): string[] =>
  context.files.filter((file) => /^\.gitlab-ci\.ya?ml$/.test(file));

export const azurePipelinesFiles = (context: RepositoryContext): string[] =>
  context.files.filter((file) => /^azure-pipelines\.ya?ml$/.test(file) || /^\.azure\/.*\.ya?ml$/.test(file));

export const circleciFiles = (context: RepositoryContext): string[] =>
  context.files.filter((file) => /^\.circleci\/config\.ya?ml$/.test(file));

// ── Lockfile helpers ──────────────────────────────────────────────────────────

export const lockfileManagers: ReadonlyMap<string, "npm" | "pnpm" | "yarn"> = new Map([
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
] as const);

export const rootLockfiles = (context: RepositoryContext): string[] =>
  context.files.filter((file) => lockfileManagers.has(file));

// ── Env helpers ───────────────────────────────────────────────────────────────

export const envTemplates = (context: RepositoryContext): string[] =>
  context.files.filter((file) => /(^|\/)\.env(?:\..+)?\.(?:example|sample|template)$/.test(file));

export const sensitiveEnvFiles = (context: RepositoryContext): string[] =>
  context.files.filter((file) => {
    const basename = file.split("/").at(-1) ?? "";
    return /^\.env(?:\..+)?$/.test(basename) && !/\.env(?:\..+)?\.(?:example|sample|template)$/.test(basename);
  });

// ── File I/O ──────────────────────────────────────────────────────────────────

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
  try {
    const contents = await readRepositoryFile(context, "package.json");
    return contents ? JSON.parse(contents) as Record<string, unknown> : undefined;
  } catch { return undefined; }
}

export async function jsonFile(context: RepositoryContext, file: string): Promise<Record<string, unknown> | undefined> {
  try {
    const contents = await readRepositoryFile(context, file);
    return contents ? JSON.parse(contents) as Record<string, unknown> : undefined;
  } catch { return undefined; }
}

export function packageManagerName(value: unknown): "npm" | "pnpm" | "yarn" | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.startsWith("@") ? undefined : value.split("@")[0];
  return name === "npm" || name === "pnpm" || name === "yarn" ? name : undefined;
}

// ── Version helpers ───────────────────────────────────────────────────────────

/** Extract first numeric major version component from a version string. */
export const majorVersion = (value: string): string | undefined =>
  /(?:^|[^\d])(\d{1,3})(?:\.\d+)?/.exec(value)?.[1];

/** Parse a simple key=value or key: value line and return the value. */
export function extractLineValue(content: string, keyPattern: RegExp): string | undefined {
  for (const line of content.split("\n")) {
    const m = keyPattern.exec(line);
    if (m) return m[1]?.trim();
  }
  return undefined;
}

/** Check whether a file path is matched by any gitignore-style pattern in a string. */
export function isGitIgnored(ignoreContent: string, filePath: string): boolean {
  const basename = filePath.split("/").at(-1) ?? filePath;
  return ignoreContent.split("\n").some((rawLine) => {
    const line = rawLine.split("#")[0].trim();
    if (!line) return false;
    // Simple glob: exact match, basename match, or trailing-slash dir match
    const pattern = line.replace(/^\//, "").replace(/\//g, "\\/").replace(/\./g, "\\.").replace(/\*/g, ".*");
    try { return new RegExp(`(^|/)${pattern}(/|$)`).test(filePath) || new RegExp(`^${pattern}$`).test(basename); } catch { return false; }
  });
}
