import type { Finding, RepositoryContext, Rule } from "@blindspot/core";
import { jsonFile, lockfileManagers, packageManagerName } from "../utils.js";

const manifests = (files: string[]) => files.filter((file) => file.endsWith("/package.json"));
const major = (value: unknown): string | undefined => typeof value === "string" ? /(?:^|[^\d])(\d{1,3})(?:\.\d+)?/.exec(value)?.[1] : undefined;
const isMonorepo = async (context: RepositoryContext): Promise<boolean> => {
  const root = await jsonFile(context, "package.json"); return Boolean(root?.workspaces || context.files.includes("pnpm-workspace.yaml"));
};

export const monorepoPackageManagerDriftRule: Rule = {
  id: "monorepo/package-manager-drift", title: "Workspace package-manager drift", category: "monorepo", defaultSeverity: "medium",
  description: "Compares explicit packageManager fields across declared monorepo packages.",
  async check(context): Promise<Finding[]> {
    if (!(await isMonorepo(context))) return []; const evidence: string[] = [];
    for (const file of ["package.json", ...manifests(context.files)]) { const pkg = await jsonFile(context, file); const manager = packageManagerName(pkg?.packageManager); if (manager) evidence.push(`${file}: ${manager}`); }
    if (new Set(evidence.map((item) => item.split(": ")[1])).size < 2) return [];
    return [{ ruleId: "monorepo/package-manager-drift", severity: "medium", message: "Workspace manifests declare different package managers.", files: evidence.map((item) => item.split(":")[0]), evidence, recommendation: "Use one package-manager contract across the workspace or remove conflicting declarations." }];
  },
};

export const monorepoEngineDriftRule: Rule = {
  id: "monorepo/engine-drift", title: "Workspace Node engine drift", category: "monorepo", defaultSeverity: "medium",
  description: "Compares explicitly declared Node engine majors across monorepo package manifests.",
  async check(context): Promise<Finding[]> {
    if (!(await isMonorepo(context))) return []; const evidence: string[] = [];
    for (const file of ["package.json", ...manifests(context.files)]) { const pkg = await jsonFile(context, file); const engines = pkg?.engines && typeof pkg.engines === "object" ? pkg.engines as Record<string, unknown> : undefined; if (major(engines?.node)) evidence.push(`${file}: ${String(engines?.node)}`); }
    if (new Set(evidence.map((item) => major(item.split(": ")[1]))).size < 2) return [];
    return [{ ruleId: "monorepo/engine-drift", severity: "medium", message: "Workspace manifests declare different Node engine majors.", files: evidence.map((item) => item.split(":")[0]), evidence, recommendation: "Align workspace Node engine ranges unless the runtime split is intentional." }];
  },
};

export const monorepoMultipleLockfilesRule: Rule = {
  id: "monorepo/multiple-lockfiles", title: "Workspace-local lockfiles", category: "monorepo", defaultSeverity: "medium",
  description: "Detects root and nested package-manager lockfiles inside a declared monorepo.",
  async check(context): Promise<Finding[]> {
    if (!(await isMonorepo(context))) return [];
    const managers: ReadonlyMap<string, string> = lockfileManagers;
    const locks = context.files.filter((file) => managers.has(file.split("/").at(-1) ?? ""));
    const root = locks.filter((file) => !file.includes("/")); const nested = locks.filter((file) => file.includes("/")); if (!root.length || !nested.length) return [];
    return [{ ruleId: "monorepo/multiple-lockfiles", severity: "medium", message: "A declared monorepo contains both root and workspace-local lockfiles.", files: locks, evidence: locks.map((file) => `${file}: ${managers.get(file.split("/").at(-1) ?? "") ?? "lockfile"}`), recommendation: "Confirm whether installs are root-managed; remove stale workspace lockfiles when they are not intentional." }];
  },
};
