import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Finding, Rule } from "@blindspot/core";

const isDockerfile = (file: string): boolean => /^Dockerfile(?:\..+)?$/.test(path.posix.basename(file));

export const missingNodeEnvRule: Rule = {
  id: "docker/missing-node-env",
  title: "Docker missing NODE_ENV",
  category: "docker",
  defaultSeverity: "high",
  description: "Detects Dockerfiles that do not set NODE_ENV=production.",
  async check(context): Promise<Finding[]> {
    if (!context.stack.node && !context.stack.javascript && !context.stack.typescript) {
      return [];
    }

    const dockerfiles = context.files.filter(isDockerfile);
    const unsafeFiles: string[] = [];

    for (const file of dockerfiles) {
      let contents: string;
      try { contents = await readFile(path.join(context.rootDir, file), "utf8"); } catch { continue; }
      
      const hasNodeEnv = contents.split(/\r?\n/).some((line) => {
        const withoutComment = line.replace(/\s+#.*$/, "").trim();
        return /^ENV\s+NODE_ENV\s*=\s*(['"]?)production\1|ENV\s+NODE_ENV\s+(['"]?)production\2$/i.test(withoutComment);
      });

      if (!hasNodeEnv) unsafeFiles.push(file);
    }

    if (unsafeFiles.length === 0) return [];
    return [{
      ruleId: "docker/missing-node-env", severity: "high",
      message: "Docker container missing NODE_ENV=production.", files: unsafeFiles,
      recommendation: "Set ENV NODE_ENV=production in your Dockerfile.",
    }];
  },
};
