import type { Finding, Rule } from "@blindspot/core";
import { lockfileManagers, packageJson, packageManagerName, rootLockfiles } from "../utils.js";

const managerEvidence = (files: string[]): string[] => files.map((file) => `${file}: ${lockfileManagers.get(file)}`);

export const missingLockfileRule: Rule = {
  id: "runtime/missing-lockfile", title: "Declared package manager has no lockfile", category: "runtime", defaultSeverity: "medium",
  description: "Detects an explicit packageManager contract without its corresponding lockfile.",
  async check(context): Promise<Finding[]> {
    const pkg = await packageJson(context); const manager = packageManagerName(pkg?.packageManager); if (!manager) return [];
    const locks = rootLockfiles(context); if (locks.some((file) => lockfileManagers.get(file) === manager)) return [];
    return [{ ruleId: "runtime/missing-lockfile", severity: "medium", message: `${manager} is declared in package.json, but its lockfile is missing.`, files: ["package.json"], evidence: [`package.json packageManager: ${String(pkg?.packageManager)}`, `expected lockfile: ${manager === "npm" ? "package-lock.json or npm-shrinkwrap.json" : manager === "pnpm" ? "pnpm-lock.yaml" : "yarn.lock"}`], recommendation: `Generate and commit the ${manager} lockfile.` }];
  },
};

export const multipleLockfilesRule: Rule = {
  id: "runtime/multiple-lockfiles", title: "Multiple root package-manager lockfiles", category: "runtime", defaultSeverity: "medium",
  description: "Detects root lockfiles belonging to different package managers.",
  check(context): Finding[] {
    const locks = rootLockfiles(context); const managers = new Set(locks.map((file) => lockfileManagers.get(file)));
    if (managers.size < 2) return [];
    return [{ ruleId: "runtime/multiple-lockfiles", severity: "medium", message: "Multiple package managers have root lockfiles, so install intent is ambiguous.", files: locks, evidence: managerEvidence(locks), recommendation: "Keep the lockfile for the repository's intended package manager and remove stale lockfiles." }];
  },
};

export const packageManagerFieldDriftRule: Rule = {
  id: "runtime/package-manager-field-drift", title: "packageManager field disagrees with lockfile", category: "runtime", defaultSeverity: "high",
  description: "Compares package.json packageManager with an unambiguous root lockfile.",
  async check(context): Promise<Finding[]> {
    const pkg = await packageJson(context); const declared = packageManagerName(pkg?.packageManager); const locks = rootLockfiles(context);
    if (!declared || locks.length !== 1 || lockfileManagers.get(locks[0]) === declared) return [];
    return [{ ruleId: "runtime/package-manager-field-drift", severity: "high", message: "package.json declares a different package manager than the root lockfile.", files: ["package.json", locks[0]], evidence: [`package.json packageManager: ${String(pkg?.packageManager)}`, ...managerEvidence(locks)], recommendation: "Align the packageManager field with the committed lockfile." }];
  },
};
