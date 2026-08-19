import type { Finding, Rule } from "@blindspot/core";
import { dockerfiles, readRepositoryFile } from "../utils.js";

export const goMissingBuildTargetRule: Rule = {
  id: "go/missing-build-target",
  title: "Go Dockerfile builds binary but CMD/ENTRYPOINT does not reference it",
  category: "go",
  defaultSeverity: "medium",
  description: "Detects Dockerfiles that run go build with an -o flag but whose CMD or ENTRYPOINT do not reference the compiled binary path.",
  async check(context) {
    if (!context.stack.golang || !context.stack.docker) return [];
    const findings: Finding[] = [];

    for (const file of dockerfiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;

      // Find go build -o <binary> lines
      const buildMatches = [...content.matchAll(/go\s+build\s+.*-o\s+([^\s\\]+)/gi)];
      if (buildMatches.length === 0) continue;

      for (const buildMatch of buildMatches) {
        const binaryPath = buildMatch[1].replace(/['"]/g, "");
        const binaryName = binaryPath.split("/").at(-1) ?? binaryPath;

        // Check if CMD or ENTRYPOINT references this binary
        const cmdPattern = new RegExp(`(?:CMD|ENTRYPOINT)\\s+.*${binaryName.replace(/\./g, "\\.")}`, "i");
        if (!cmdPattern.test(content)) {
          findings.push({
            ruleId: "go/missing-build-target",
            severity: "medium",
            message: `Dockerfile builds binary "${binaryPath}" but CMD/ENTRYPOINT does not reference it.`,
            files: [file],
            evidence: [`${file}: go build -o ${binaryPath}`, `${file}: CMD/ENTRYPOINT does not reference "${binaryName}"`],
            recommendation: `Add CMD ["${binaryPath}"] or ENTRYPOINT ["${binaryPath}"] to the final Dockerfile stage.`,
          });
          break;
        }
      }
    }
    return findings;
  },
};
