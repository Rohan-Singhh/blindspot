import type { Finding, Rule } from "@blindspot/core";
import { terraformFiles } from "../utils.js";

export const terraformLockfileMissingRule: Rule = {
  id: "terraform/lockfile-missing",
  title: "Terraform dependency lock file missing",
  category: "terraform",
  defaultSeverity: "medium",
  description: "Detects Terraform configurations without a .terraform.lock.hcl file, making provider versions non-deterministic.",
  async check(context) {
    if (!context.stack.terraform) return [];
    if (terraformFiles(context).length === 0) return [];

    // Check for lockfile at root or in subdirectories where .tf files exist
    const tfDirs = new Set(
      terraformFiles(context).map((f) => {
        const parts = f.split("/");
        return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
      })
    );

    const missingDirs: string[] = [];
    for (const dir of tfDirs) {
      const lockfile = dir ? `${dir}/.terraform.lock.hcl` : ".terraform.lock.hcl";
      if (!context.files.includes(lockfile)) {
        missingDirs.push(lockfile);
      }
    }

    if (missingDirs.length === 0) return [];
    return [{
      ruleId: "terraform/lockfile-missing",
      severity: "medium",
      message: `Terraform lock file (.terraform.lock.hcl) is missing in ${missingDirs.length} module director${missingDirs.length === 1 ? "y" : "ies"}.`,
      evidence: missingDirs.map((f) => `missing: ${f}`),
      recommendation: "Run terraform init to generate .terraform.lock.hcl and commit it to version control for deterministic provider installs.",
    }];
  },
};
