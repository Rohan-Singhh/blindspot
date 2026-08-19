import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile } from "../utils.js";

// Placeholder/local module paths that are likely unintentional in a published project
const PLACEHOLDER_PATTERNS = [
  /^example\.com\//,
  /^example\//,
  /^localhost\//,
  /^local\//,
  /^mymodule$/,
  /^module$/,
  /^app$/,
  /^main$/,
];

export const goModulePathMismatchRule: Rule = {
  id: "go/module-path-mismatch",
  title: "Go module path uses a placeholder",
  category: "go",
  defaultSeverity: "medium",
  description: "Detects go.mod files with a placeholder module path (e.g. example.com/...) that should be replaced with the real repository URL.",
  async check(context) {
    if (!context.stack.golang) return [];
    if (!context.files.includes("go.mod")) return [];

    const content = await readRepositoryFile(context, "go.mod");
    if (!content) return [];

    const m = /^module\s+(\S+)/m.exec(content);
    if (!m) return [];
    const modulePath = m[1];

    const isPlaceholder = PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(modulePath));
    if (!isPlaceholder) return [];

    return [{
      ruleId: "go/module-path-mismatch",
      severity: "medium",
      message: `go.mod declares module path "${modulePath}" which appears to be a placeholder.`,
      files: ["go.mod"],
      evidence: [`go.mod: module ${modulePath}`],
      recommendation: `Replace "${modulePath}" with the real repository path (e.g. github.com/org/repo) so the module can be imported correctly by other projects.`,
    }];
  },
};
