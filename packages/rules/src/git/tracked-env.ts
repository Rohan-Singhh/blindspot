import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Finding, Rule } from "@blindspot/core";

const execFileAsync = promisify(execFile);

function isSensitiveEnvFile(file: string): boolean {
  const basename = file.split("/").at(-1);
  return basename !== ".env.example" && /^\.env(?:\..+)?$/.test(basename ?? "");
}

export const trackedEnvRule: Rule = {
  id: "git/tracked-env",
  severity: "critical",
  description: "Detects sensitive environment files tracked by Git.",
  async check(context): Promise<Finding[]> {
    try {
      const { stdout } = await execFileAsync("git", ["-C", context.rootDir, "ls-files", "-z"], {
        encoding: "buffer",
        maxBuffer: 1024 * 1024,
      });
      const trackedFiles = stdout.toString("utf8").split("\0").filter(Boolean);
      const sensitiveFiles = trackedFiles.filter(isSensitiveEnvFile);
      if (sensitiveFiles.length === 0) return [];
      return [{
        ruleId: "git/tracked-env", severity: "critical",
        message: `${sensitiveFiles.join(", ")} ${sensitiveFiles.length === 1 ? "is" : "are"} tracked by Git.`,
        files: sensitiveFiles,
        recommendation: "Remove sensitive .env files from Git tracking and add them to .gitignore.",
      }];
    } catch {
      // A directory without Git is a valid scan target.
      return [];
    }
  },
};
