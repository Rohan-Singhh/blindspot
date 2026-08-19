import type { Finding, Rule } from "@blindspot/core";
import { dockerfiles, readRepositoryFile, workflows } from "../utils.js";

function goMajorMinor(value: string): string | undefined {
  const m = /(\d+\.\d+)/.exec(value);
  return m ? m[1] : undefined;
}

export const goVersionMismatchRule: Rule = {
  id: "go/version-mismatch",
  title: "Go version mismatch across tooling",
  category: "go",
  defaultSeverity: "high",
  description: "Detects inconsistent Go versions across go.mod, Dockerfiles, and CI workflows.",
  async check(context) {
    if (!context.stack.golang) return [];
    const evidence: string[] = [];

    // go.mod: "go 1.21"
    if (context.files.includes("go.mod")) {
      const content = await readRepositoryFile(context, "go.mod");
      if (content) {
        const m = /^go\s+(\d+\.\d+)/m.exec(content);
        if (m) evidence.push(`go.mod: go ${m[1]}`);
      }
    }

    // Dockerfiles FROM golang:1.21 or golang:1.21-alpine
    for (const file of dockerfiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      for (const match of content.matchAll(/^\s*FROM\s+golang:([^\s@\-]+)/gim)) {
        const v = goMajorMinor(match[1]);
        if (v) evidence.push(`${file}: FROM golang:${match[1]}`);
      }
    }

    // GitHub Actions go-version: '1.21'
    for (const file of workflows(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      for (const match of content.matchAll(/go-version\s*:\s*["']?([^\s"'#]+)/gi)) {
        const v = goMajorMinor(match[1]);
        if (v) evidence.push(`${file}: go-version: ${match[1]}`);
      }
    }

    if (evidence.length < 2) return [];

    const versions = new Set(
      evidence.map((e) => goMajorMinor(e.slice(e.lastIndexOf(":") + 1).trim())).filter(Boolean)
    );
    if (versions.size < 2) return [];

    return [{
      ruleId: "go/version-mismatch",
      severity: "high",
      message: "Go versions are inconsistent across tooling.",
      evidence,
      files: [...new Set(evidence.map((e) => e.split(":")[0]))],
      recommendation: "Align the Go version across go.mod, Dockerfiles, and CI workflows.",
    }];
  },
};
