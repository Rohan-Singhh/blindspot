import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile } from "../utils.js";

export const javaSnapshotInProductionRule: Rule = {
  id: "java/snapshot-in-production",
  title: "SNAPSHOT dependency in Maven project",
  category: "java",
  defaultSeverity: "high",
  description: "Detects SNAPSHOT version dependencies in pom.xml, which are mutable and non-deterministic in release builds.",
  async check(context) {
    if (!context.stack.java) return [];
    if (!context.files.includes("pom.xml")) return [];

    const content = await readRepositoryFile(context, "pom.xml");
    if (!content) return [];

    const snapshotLines: string[] = [];
    const lines = content.split("\n");
    let inDependency = false;
    let currentDep = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/<dependency>/.test(line)) { inDependency = true; currentDep = ""; }
      if (inDependency) currentDep += line + "\n";
      if (/<\/dependency>/.test(line) && inDependency) {
        inDependency = false;
        // Skip test-scoped dependencies — SNAPSHOT in test scope is often intentional
        if (/<scope>\s*test\s*<\/scope>/.test(currentDep)) continue;
        const versionMatch = /<version>\s*([^<]*-SNAPSHOT)\s*<\/version>/.exec(currentDep);
        if (versionMatch) {
          const artMatch = /<artifactId>\s*([^<]+)\s*<\/artifactId>/.exec(currentDep);
          snapshotLines.push(`pom.xml: ${artMatch ? artMatch[1] : "dependency"} @ ${versionMatch[1]}`);
        }
      }
    }

    if (snapshotLines.length === 0) return [];
    return [{
      ruleId: "java/snapshot-in-production",
      severity: "high",
      message: `${snapshotLines.length} SNAPSHOT ${snapshotLines.length === 1 ? "dependency" : "dependencies"} found in pom.xml. SNAPSHOT versions are mutable and will produce non-reproducible builds.`,
      files: ["pom.xml"],
      evidence: snapshotLines,
      recommendation: "Pin all production dependencies to a fixed release version. SNAPSHOT versions are acceptable only in test scope during active development.",
    }];
  },
};
