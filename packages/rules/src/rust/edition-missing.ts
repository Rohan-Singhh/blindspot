import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile } from "../utils.js";

export const rustEditionMissingRule: Rule = {
  id: "rust/edition-missing",
  title: "Rust edition not specified in Cargo.toml",
  category: "rust",
  defaultSeverity: "low",
  description: "Detects Cargo.toml files without an edition field, which defaults to Rust 2015 — almost certainly unintentional for new projects.",
  async check(context) {
    if (!context.stack.rust) return [];

    const cargoFiles = context.files.filter((f) => /(?:^|\/)Cargo\.toml$/.test(f));
    const missing: string[] = [];

    for (const file of cargoFiles) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      // Only flag [package] sections (not workspace or dependency Cargo.toml)
      if (!/^\[package\]/m.test(content)) continue;
      if (!/^\s*edition\s*=/m.test(content)) {
        missing.push(file);
      }
    }

    if (missing.length === 0) return [];
    return [{
      ruleId: "rust/edition-missing",
      severity: "low",
      message: `${missing.join(", ")} ${missing.length === 1 ? "does" : "do"} not specify a Rust edition. Defaults to Rust 2015, which is almost certainly unintentional.`,
      files: missing,
      evidence: missing.map((f) => `${f}: missing edition = "..."`),
      recommendation: 'Add edition = "2021" (or "2018") to the [package] section of Cargo.toml.',
    }];
  },
};
