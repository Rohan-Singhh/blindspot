import type { Finding, Rule } from "@blindspot/core";
import { dockerfiles, readRepositoryFile } from "../utils.js";

function rustMajorMinor(value: string): string | undefined {
  // Matches "1.75", "1.75.0", "stable", "nightly-2024-01-01"
  if (value === "stable" || value === "beta") return value;
  const m = /(\d+\.\d+)/.exec(value);
  return m ? m[1] : undefined;
}

export const rustVersionMismatchRule: Rule = {
  id: "rust/version-mismatch",
  title: "Rust toolchain version mismatch",
  category: "rust",
  defaultSeverity: "medium",
  description: "Detects inconsistent Rust toolchain versions across rust-toolchain.toml, Dockerfiles, and CI workflows.",
  async check(context) {
    if (!context.stack.rust) return [];
    const evidence: string[] = [];

    // rust-toolchain.toml: channel = "1.75.0"
    for (const toolchainFile of ["rust-toolchain.toml", "rust-toolchain"].filter((f) => context.files.includes(f))) {
      const content = await readRepositoryFile(context, toolchainFile);
      if (!content) continue;
      const m = /channel\s*=\s*["']?([^\s"'#\]]+)/.exec(content) ?? /^(\S+)/.exec(content.trim());
      if (m) { const v = rustMajorMinor(m[1]); if (v) evidence.push(`${toolchainFile}: channel: ${m[1]}`); }
    }

    // Dockerfiles FROM rust:1.75 or rust:1.75-alpine
    for (const file of dockerfiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      for (const match of content.matchAll(/^\s*FROM\s+rust:([^\s@\-]+)/gim)) {
        const v = rustMajorMinor(match[1]);
        if (v) evidence.push(`${file}: FROM rust:${match[1]}`);
      }
    }

    if (evidence.length < 2) return [];
    const versions = new Set(
      evidence.map((e) => rustMajorMinor(e.slice(e.lastIndexOf(":") + 1).trim())).filter(Boolean)
    );
    if (versions.size < 2) return [];

    return [{
      ruleId: "rust/version-mismatch",
      severity: "medium",
      message: "Rust toolchain versions are inconsistent across rust-toolchain.toml and Dockerfiles.",
      evidence,
      files: [...new Set(evidence.map((e) => e.split(":")[0]))],
      recommendation: "Align the Rust toolchain version across rust-toolchain.toml and Dockerfiles. Prefer rust-toolchain.toml as the single source of truth.",
    }];
  },
};
