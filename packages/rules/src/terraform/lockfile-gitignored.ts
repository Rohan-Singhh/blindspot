import type { Finding, Rule } from "@blindspot/core";
import { isGitIgnored, readRepositoryFile } from "../utils.js";

export const terraformLockfileGitignore: Rule = {
  id: "terraform/lockfile-gitignored",
  title: "Terraform lock file is gitignored",
  category: "terraform",
  defaultSeverity: "medium",
  description: "Detects .terraform.lock.hcl being matched by a .gitignore rule, which prevents deterministic provider installs in CI.",
  async check(context) {
    if (!context.stack.terraform) return [];

    const lockfiles = context.files.filter((f) => f.endsWith(".terraform.lock.hcl"));
    if (lockfiles.length === 0) return []; // missing lockfile is caught by lockfile-missing rule

    const gitignoreContent = await readRepositoryFile(context, ".gitignore");
    if (!gitignoreContent) return [];

    const ignored = lockfiles.filter((lf) => isGitIgnored(gitignoreContent, lf));
    if (ignored.length === 0) return [];

    return [{
      ruleId: "terraform/lockfile-gitignored",
      severity: "medium",
      message: `.terraform.lock.hcl is matched by .gitignore and will not be committed.`,
      files: ignored,
      evidence: ignored.map((f) => `.gitignore excludes: ${f}`),
      recommendation: "Remove .terraform.lock.hcl from .gitignore and commit it. The .terraform/ directory should still be ignored, but not the lock file.",
    }];
  },
};
