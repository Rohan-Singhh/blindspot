import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Finding, Rule } from "@blindspot/core";

const isDockerfile = (file: string): boolean => /^Dockerfile(?:\..+)?$/.test(path.posix.basename(file));

export const npmStartEntrypointRule: Rule = {
  id: "docker/npm-start-entrypoint",
  title: "Docker uses npm as entrypoint",
  category: "docker",
  defaultSeverity: "medium",
  description: "Detects Dockerfiles that use npm start as CMD or ENTRYPOINT, which swallows OS signals.",
  async check(context): Promise<Finding[]> {
    const dockerfiles = context.files.filter(isDockerfile);
    const unsafeFiles: string[] = [];

    for (const file of dockerfiles) {
      let contents: string;
      try { contents = await readFile(path.join(context.rootDir, file), "utf8"); } catch { continue; }
      
      const hasNpmStart = contents.split(/\r?\n/).some((line) => {
        const withoutComment = line.replace(/\s+#.*$/, "").trim();
        return /^(CMD|ENTRYPOINT)\s+(\["npm",\s*"start"\]|npm\s+start)/i.test(withoutComment);
      });

      if (hasNpmStart) unsafeFiles.push(file);
    }

    if (unsafeFiles.length === 0) return [];
    return [{
      ruleId: "docker/npm-start-entrypoint", severity: "medium",
      message: "Docker container uses npm as an entrypoint, which breaks graceful shutdown.", files: unsafeFiles,
      recommendation: "Invoke node directly using the exec form, e.g., CMD [\"node\", \"server.js\"].",
    }];
  },
};
