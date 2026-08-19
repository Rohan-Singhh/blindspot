import type { Finding, Rule } from "@blindspot/core";
import { isGitIgnored, readRepositoryFile } from "../utils.js";

export const goSumFileMissingRule: Rule = {
  id: "go/sum-file-missing",
  title: "go.sum file missing or gitignored",
  category: "go",
  defaultSeverity: "high",
  description: "Detects a Go module without go.sum, or where go.sum is gitignored, which breaks reproducible builds.",
  async check(context) {
    if (!context.stack.golang) return [];
    if (!context.files.includes("go.mod")) return [];

    if (!context.files.includes("go.sum")) {
      return [{
        ruleId: "go/sum-file-missing",
        severity: "high",
        message: "go.mod is present but go.sum is missing. Dependencies cannot be verified and builds are non-reproducible.",
        files: ["go.mod"],
        recommendation: "Run go mod tidy to generate go.sum and commit it to version control.",
      }];
    }

    // Check if go.sum is gitignored
    const gitignore = await readRepositoryFile(context, ".gitignore");
    if (gitignore && isGitIgnored(gitignore, "go.sum")) {
      return [{
        ruleId: "go/sum-file-missing",
        severity: "high",
        message: "go.sum is matched by .gitignore and will not be committed. Builds will be non-reproducible in CI and for other contributors.",
        files: [".gitignore", "go.sum"],
        evidence: [".gitignore excludes: go.sum"],
        recommendation: "Remove go.sum from .gitignore and commit it. The go.sum file is safe to commit and should be tracked.",
      }];
    }

    return [];
  },
};
