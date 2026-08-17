import type { Finding, Rule } from "@blindspot/core";
import { jsonFile } from "../utils.js";
import { workspaceManifestFiles } from "./utils.js";

type Version = readonly [number, number, number];
const parseVersion = (value: unknown): Version | undefined => {
  if (typeof value !== "string") return undefined;
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(value.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
};
const compare = (left: Version, right: Version): number =>
  left[0] - right[0] || left[1] - right[1] || left[2] - right[2];

function accepts(range: string, version: Version): boolean | undefined {
  const match = /^([~^]?)(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(range.trim());
  if (!match) return undefined;
  const minimum = parseVersion(match[2]);
  if (!minimum) return undefined;
  if (match[1] === "") return compare(version, minimum) === 0;
  const maximum: Version = match[1] === "~"
    ? [minimum[0], minimum[1] + 1, 0]
    : minimum[0] > 0
      ? [minimum[0] + 1, 0, 0]
      : minimum[1] > 0
        ? [0, minimum[1] + 1, 0]
        : [0, 0, minimum[2] + 1];
  return compare(version, minimum) >= 0 && compare(version, maximum) < 0;
}

const dependencySections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;

export const internalDependencyVersionDriftRule: Rule = {
  id: "monorepo/internal-dependency-version-drift",
  title: "Internal workspace dependency version drift",
  category: "monorepo",
  defaultSeverity: "high",
  description: "Detects exact, caret, or tilde dependency ranges that exclude the current version of another workspace package.",
  async check(context): Promise<Finding[]> {
    const manifestFiles = await workspaceManifestFiles(context);
    const internal = new Map<string, { file: string; version: Version; rawVersion: string }>();
    const manifests = new Map<string, Record<string, unknown>>();
    for (const file of manifestFiles) {
      const manifest = await jsonFile(context, file);
      if (!manifest) continue;
      manifests.set(file, manifest);
      const version = parseVersion(manifest.version);
      if (typeof manifest.name === "string" && version) internal.set(manifest.name, { file, version, rawVersion: String(manifest.version) });
    }

    const evidence: string[] = [];
    const affected = new Set<string>();
    for (const [file, manifest] of manifests) {
      for (const section of dependencySections) {
        const dependencies = manifest[section];
        if (!dependencies || typeof dependencies !== "object") continue;
        for (const [name, declared] of Object.entries(dependencies as Record<string, unknown>)) {
          if (typeof declared !== "string" || declared.startsWith("workspace:")) continue;
          const target = internal.get(name);
          if (!target || accepts(declared, target.version) !== false) continue;
          affected.add(file); affected.add(target.file);
          evidence.push(`${file} ${section}.${name}: ${declared}; ${target.file} version: ${target.rawVersion}`);
        }
      }
    }
    if (evidence.length === 0) return [];
    return [{
      ruleId: "monorepo/internal-dependency-version-drift",
      severity: "high",
      message: `${evidence.length} internal workspace dependency ${evidence.length === 1 ? "range excludes" : "ranges exclude"} the package's current version.`,
      files: [...affected],
      evidence,
      recommendation: "Align internal dependency ranges with the current workspace package versions or use the package manager's workspace protocol.",
    } satisfies Finding];
  },
};
