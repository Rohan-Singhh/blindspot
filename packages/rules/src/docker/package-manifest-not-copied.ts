import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile } from "../utils.js";

function stageViolates(contents: string): boolean {
  const normalized = contents.replace(/\\\r?\n\s*/g, " "); let manifestAvailable = false;
  for (const rawLine of normalized.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "").trim();
    if (/^FROM\s+/i.test(line)) { manifestAvailable = false; continue; }
    if (/^(?:COPY|ADD)\s+/i.test(line)) {
      if (/^(?:COPY|ADD)\s+(?:--\S+\s+)*(?:\.\s|\[\s*["']\.["'])/i.test(line) || /(?:^|[\s"'])package(?:\*|\.json)/i.test(line)) manifestAvailable = true;
      continue;
    }
    if (/^RUN\s+/i.test(line) && /\b(?:npm\s+(?:ci|install)|pnpm\s+install|yarn(?:\s+install)?)\b/i.test(line)) {
      if (/--mount=[^\s]*(?:source|src)=package\.json/i.test(line)) continue;
      if (!manifestAvailable) return true;
    }
  }
  return false;
}

export const packageManifestNotCopiedRule: Rule = {
  id: "docker/package-manifest-not-copied", title: "Docker install runs before package manifest copy", category: "docker", defaultSeverity: "high",
  description: "Detects dependency installation before package.json is available in a Docker build stage.",
  async check(context): Promise<Finding[]> {
    if (!context.files.includes("package.json")) return [];
    const affected: string[] = [];
    for (const file of context.files.filter((candidate) => /(^|\/)Dockerfile(?:\..+)?$/.test(candidate))) {
      const contents = await readRepositoryFile(context, file); if (contents && stageViolates(contents)) affected.push(file);
    }
    if (!affected.length) return [];
    return [{ ruleId: "docker/package-manifest-not-copied", severity: "high", message: "Docker installs dependencies before package.json is available in the build stage.", files: ["package.json", ...affected], evidence: affected.map((file) => `${file}: install command precedes package.json COPY`), recommendation: "Copy package.json into the build stage before running the package-manager install command." }];
  },
};
