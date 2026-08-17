import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Finding, Rule } from "@blindspot/core";

const isDockerfile = (file: string): boolean => /^Dockerfile(?:\..+)?$/.test(path.posix.basename(file));
const isNonRootUser = (value: string): boolean => {
  const user = value.trim().split(/\s+/)[0]?.toLowerCase();
  return Boolean(user) && user !== "root" && user !== "0" && user !== "root:root" && !user.includes("$");
};

export const rootUserRule: Rule = {
  id: "docker/root-user",
  title: "Container runs as root",
  category: "docker",
  defaultSeverity: "high",
  description: "Detects Dockerfiles that do not select a non-root user.",
  async check(context): Promise<Finding[]> {
    const dockerfiles = context.files.filter(isDockerfile);
    const unsafeFiles: string[] = [];
    for (const file of dockerfiles) {
      let contents: string;
      try { contents = await readFile(path.join(context.rootDir, file), "utf8"); } catch { continue; }
      const hasNonRootUser = contents.split(/\r?\n/).some((line) => {
        const withoutComment = line.replace(/\s+#.*$/, "");
        const match = /^\s*USER\s+(.+)$/i.exec(withoutComment);
        return match !== null && isNonRootUser(match[1]);
      });
      if (!hasNonRootUser) unsafeFiles.push(file);
    }
    if (unsafeFiles.length === 0) return [];
    return [{
      ruleId: "docker/root-user", severity: "high",
      message: "Docker container appears to run as root.", files: unsafeFiles,
      recommendation: "Run the application using a non-root USER.",
    }];
  },
};
