import type { Finding, Rule } from "@blindspot/core";
import { terraformFiles, readRepositoryFile } from "../utils.js";

export const missingRequiredVersionRule: Rule = {
  id: "terraform/missing-required-version",
  title: "Terraform required_version not set",
  category: "terraform",
  defaultSeverity: "high",
  description: "Detects Terraform configurations with no required_version constraint, allowing any Terraform version to apply the configuration.",
  async check(context) {
    if (!context.stack.terraform) return [];

    let hasRequiredVersion = false;
    const tfFiles = terraformFiles(context);
    if (tfFiles.length === 0) return [];

    for (const file of tfFiles) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      if (/\brequired_version\s*=/.test(content)) {
        hasRequiredVersion = true;
        break;
      }
    }

    if (hasRequiredVersion) return [];
    return [{
      ruleId: "terraform/missing-required-version",
      severity: "high",
      message: "No terraform { required_version = ... } constraint found. Any Terraform version can apply this configuration.",
      files: tfFiles.slice(0, 3),
      recommendation: "Add a required_version constraint in a terraform {} block (e.g. required_version = \">= 1.5, < 2.0\") to ensure reproducible applies.",
    }];
  },
};
