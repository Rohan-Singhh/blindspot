import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Finding } from "@blindspot/core";

const BASELINE_FILE = "blindspot.baseline.json";
const BASELINE_VERSION = 1;

interface BaselineFile {
  version: number;
  createdAt: string;
  findings: Finding[];
}

/** Unique key for a finding used to match across runs. */
function findingKey(f: Finding): string {
  return `${f.ruleId}::${[...(f.files ?? [])].sort().join("|")}`;
}

export async function loadBaseline(rootDir: string): Promise<Set<string>> {
  try {
    const raw = await readFile(path.join(rootDir, BASELINE_FILE), "utf8");
    const parsed = JSON.parse(raw) as BaselineFile;
    if (parsed.version !== BASELINE_VERSION || !Array.isArray(parsed.findings)) return new Set();
    return new Set(parsed.findings.map(findingKey));
  } catch {
    return new Set(); // no baseline file is fine
  }
}

export async function writeBaseline(rootDir: string, findings: readonly Finding[]): Promise<void> {
  const baseline: BaselineFile = {
    version: BASELINE_VERSION,
    createdAt: new Date().toISOString(),
    findings: findings as Finding[],
  };
  await writeFile(
    path.join(rootDir, BASELINE_FILE),
    JSON.stringify(baseline, null, 2) + "\n",
    "utf8",
  );
}

export function filterBaseline(
  findings: readonly Finding[],
  baseline: ReadonlySet<string>,
): { active: Finding[]; suppressed: Finding[] } {
  const active: Finding[] = [];
  const suppressed: Finding[] = [];
  for (const f of findings) {
    if (baseline.has(findingKey(f))) suppressed.push(f);
    else active.push(f);
  }
  return { active, suppressed };
}
