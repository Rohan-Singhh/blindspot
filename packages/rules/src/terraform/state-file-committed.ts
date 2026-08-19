import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Finding, Rule } from "@blindspot/core";

const execFileAsync = promisify(execFile);

export const stateFileCommittedRule: Rule = {
  id: "terraform/state-file-committed",
  title: "Terraform state file committed",
  category: "terraform",
  defaultSeverity: "critical",
  description: "Detects terraform.tfstate or *.tfstate.backup files tracked by Git. State files often contain plaintext secrets.",
  async check(context) {
    if (!context.stack.terraform) return [];

    try {
      const { stdout } = await execFileAsync("git", ["-C", context.rootDir, "ls-files", "-z"], {
        encoding: "buffer",
        maxBuffer: 1024 * 1024,
      });
      const tracked = stdout.toString("utf8").split("\0").filter(Boolean);
      const stateFiles = tracked.filter((f) => /\.tfstate(\.backup)?$/.test(f));
      if (stateFiles.length === 0) return [];
      return [{
        ruleId: "terraform/state-file-committed",
        severity: "critical",
        message: `${stateFiles.join(", ")} ${stateFiles.length === 1 ? "is" : "are"} tracked by Git. Terraform state files can contain plaintext secrets.`,
        files: stateFiles,
        recommendation: "Remove state files from Git tracking, add *.tfstate and *.tfstate.backup to .gitignore, and use remote state (e.g. S3 + DynamoDB, Terraform Cloud) instead.",
      }];
    } catch {
      return [];
    }
  },
};
