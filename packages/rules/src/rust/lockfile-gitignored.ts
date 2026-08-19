import type { Finding, Rule } from "@blindspot/core";
import { isGitIgnored, readRepositoryFile } from "../utils.js";

export const rustLockfileGitignored: Rule = {
  id: "rust/lockfile-gitignored",
  title: "Cargo.lock is gitignored in a binary project",
  category: "rust",
  defaultSeverity: "high",
  description: "Detects Cargo.lock being matched by .gitignore in a project with a binary target. Libraries may omit Cargo.lock, but binaries should always commit it.",
  async check(context) {
    if (!context.stack.rust) return [];
    if (!context.files.includes("Cargo.toml")) return [];

    const gitignore = await readRepositoryFile(context, ".gitignore");
    if (!gitignore) return [];

    const lockfileIgnored = isGitIgnored(gitignore, "Cargo.lock");
    if (!lockfileIgnored) return [];

    // Determine if this project has a binary target
    const cargoToml = await readRepositoryFile(context, "Cargo.toml");
    const hasBinaryTarget = cargoToml
      ? /^\[\[bin\]\]/m.test(cargoToml) ||
        /^name\s*=/m.test(cargoToml) && !/^\[lib\]/m.test(cargoToml)
      : false;

    // Also check for src/main.rs as a conventional binary indicator
    const hasMainRs = context.files.some((f) => /(?:^|\/)src\/main\.rs$/.test(f));

    if (!hasBinaryTarget && !hasMainRs) return []; // library — omitting Cargo.lock is acceptable

    return [{
      ruleId: "rust/lockfile-gitignored",
      severity: "high",
      message: "Cargo.lock is gitignored in a binary project. Binary crates should always commit Cargo.lock for reproducible builds.",
      files: [".gitignore", "Cargo.toml"],
      evidence: [".gitignore excludes: Cargo.lock", hasMainRs ? "found: src/main.rs (binary)" : "found: [[bin]] in Cargo.toml"],
      recommendation: "Remove Cargo.lock from .gitignore and commit it. For library crates (no binary targets), omitting Cargo.lock is the Rust convention.",
    }];
  },
};
