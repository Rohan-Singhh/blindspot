import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile } from "../utils.js";

function stageViolates(contents: string): boolean {
  const normalized = contents.replace(/\\\r?\n\s*/g, " "); let lockfileAvailable = false; let manifestAvailable = false;
  for (const rawLine of normalized.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "").trim();
    if (/^FROM\s+/i.test(line)) { lockfileAvailable = false; manifestAvailable = false; continue; }
    if (/^(?:COPY|ADD)\s+/i.test(line)) {
      if (/^(?:COPY|ADD)\s+(?:--\S+\s+)*(?:\.\s|\[\s*["']\.["'])/i.test(line) || /(?:package-lock\.json|npm-shrinkwrap\.json|package\*\.json)/i.test(line)) lockfileAvailable = true;
      if (/^(?:COPY|ADD)\s+(?:--\S+\s+)*(?:\.\s|\[\s*["']\.["'])/i.test(line) || /(?:^|[\s"'])package(?:\*|\.json)/i.test(line)) manifestAvailable = true;
      continue;
    }
    if (/^RUN\s+/i.test(line) && /\bnpm\s+ci\b/i.test(line)) {
      if (/--mount=[^\s]*(?:source|src)=(?:package-lock\.json|npm-shrinkwrap\.json)/i.test(line)) continue;
      if (manifestAvailable && !lockfileAvailable) return true;
    }
  }
  return false;
}

export const lockfileNotCopiedRule: Rule = {
  id: "docker/lockfile-not-copied", title: "Docker install runs before lockfile copy", category: "docker", defaultSeverity: "high",
  description: "Detects npm ci running before an npm lockfile is available in its Docker build stage.",
  async check(context): Promise<Finding[]> {
    if (!context.files.includes("package-lock.json") && !context.files.includes("npm-shrinkwrap.json")) return [];
    const affected: string[] = [];
    for (const file of context.files.filter((candidate) => /(^|\/)Dockerfile(?:\..+)?$/.test(candidate))) {
      const contents = await readRepositoryFile(context, file); if (contents && stageViolates(contents)) affected.push(file);
    }
    if (!affected.length) return [];
    return [{ ruleId: "docker/lockfile-not-copied", severity: "high", message: "Docker runs npm ci before an npm lockfile is available in the build stage.", files: [...affected, context.files.includes("npm-shrinkwrap.json") ? "npm-shrinkwrap.json" : "package-lock.json"], evidence: affected.map((file) => `${file}: npm ci precedes lockfile COPY`), recommendation: "Copy package.json and the npm lockfile into the stage before running npm ci." }];
  },
};
