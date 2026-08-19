import type { Finding, Rule } from "@blindspot/core";
import { dockerfiles, readRepositoryFile, workflows, majorVersion } from "../utils.js";

/** Extract Python major.minor from common version strings like 3.11, 3.11.2, python3.11 */
function pythonMajorMinor(value: string): string | undefined {
  const m = /(\d+\.\d+)/.exec(value);
  return m ? m[1] : undefined;
}

export const pythonVersionMismatchRule: Rule = {
  id: "python/version-mismatch",
  title: "Python version mismatch across tooling",
  category: "python",
  defaultSeverity: "high",
  description: "Detects inconsistent Python versions across .python-version, pyproject.toml, Dockerfiles, and CI workflows.",
  async check(context) {
    if (!context.stack.python) return [];
    const evidence: string[] = [];

    // .python-version
    if (context.files.includes(".python-version")) {
      const content = await readRepositoryFile(context, ".python-version");
      const v = content?.trim().split(/\s+/)[0];
      if (v && pythonMajorMinor(v)) evidence.push(`.python-version: ${v}`);
    }

    // pyproject.toml requires-python = ">=3.11"
    if (context.files.includes("pyproject.toml")) {
      const content = await readRepositoryFile(context, "pyproject.toml");
      if (content) {
        const m = /requires-python\s*=\s*["']([^"']+)["']/.exec(content);
        if (m) evidence.push(`pyproject.toml: requires-python = "${m[1]}"`);
      }
    }

    // Dockerfiles FROM python:3.x
    for (const file of dockerfiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      for (const match of content.matchAll(/^\s*FROM\s+python:([^\s@\-]+)/gim)) {
        const v = pythonMajorMinor(match[1]);
        if (v) evidence.push(`${file}: FROM python:${match[1]}`);
      }
    }

    // GitHub Actions python-version: "3.11"
    for (const file of workflows(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      for (const match of content.matchAll(/python-version\s*:\s*["']?([^\s"'#\[]+)/gi)) {
        const v = pythonMajorMinor(match[1]);
        if (v) evidence.push(`${file}: python-version: ${match[1]}`);
      }
    }

    if (evidence.length < 2) return [];

    // Extract major.minor from each evidence entry for comparison
    const versions = new Set(
      evidence.map((e) => {
        const after = e.slice(e.indexOf(":") + 1).trim();
        return pythonMajorMinor(after);
      }).filter(Boolean)
    );
    if (versions.size < 2) return [];

    return [{
      ruleId: "python/version-mismatch",
      severity: "high",
      message: "Python versions are inconsistent across tooling.",
      evidence,
      files: [...new Set(evidence.map((e) => e.split(":")[0]))],
      recommendation: "Align Python versions across .python-version, pyproject.toml, Dockerfiles, and CI workflows.",
    }];
  },
};
