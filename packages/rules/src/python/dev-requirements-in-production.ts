import type { Finding, Rule } from "@blindspot/core";
import { dockerfiles, readRepositoryFile } from "../utils.js";

export const devRequirementsInProductionRule: Rule = {
  id: "python/dev-requirements-in-production",
  title: "Dev requirements copied into production Docker stage",
  category: "python",
  defaultSeverity: "high",
  description: "Detects Dockerfiles that COPY both requirements.txt and requirements-dev.txt into a production build stage.",
  async check(context) {
    if (!context.stack.python) return [];

    const devReqFiles = context.files.filter((f) =>
      /(?:^|\/)requirements[-_](?:dev|test|local)(?:\.txt)?$/.test(f)
    );
    if (devReqFiles.length === 0) return [];

    const findings: Finding[] = [];
    for (const file of dockerfiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;

      // Split into build stages
      const stages = content.split(/^\s*FROM\s+/im).slice(1);
      for (const stage of stages) {
        const isProd = !/as\s+(?:dev|test|builder|build)\b/i.test(stage.split("\n")[0]);
        if (!isProd) continue;

        const copiesDevReq = devReqFiles.some((devFile) => {
          const basename = devFile.split("/").at(-1) ?? devFile;
          return new RegExp(`COPY\\s+.*${basename.replace(/\./g, "\\.")}`, "i").test(stage);
        });

        if (copiesDevReq) {
          findings.push({
            ruleId: "python/dev-requirements-in-production",
            severity: "high",
            message: "A development requirements file is copied into a production Docker stage.",
            files: [file],
            evidence: devReqFiles
              .filter((df) => new RegExp(df.split("/").at(-1)!.replace(/\./g, "\\."), "i").test(stage))
              .map((df) => `${file}: COPY includes ${df}`),
            recommendation: "Use a multi-stage build and only copy production requirements into the final stage. Keep dev requirements in a builder or test stage.",
          });
          break;
        }
      }
    }
    return findings;
  },
};
