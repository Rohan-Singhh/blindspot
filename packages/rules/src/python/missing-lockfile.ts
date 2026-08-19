import type { Finding, Rule } from "@blindspot/core";

const PYTHON_LOCKFILES = ["poetry.lock", "Pipfile.lock", "requirements.lock", "pdm.lock", "uv.lock"];

export const pythonMissingLockfileRule: Rule = {
  id: "python/missing-lockfile",
  title: "Python project has no lockfile",
  category: "python",
  defaultSeverity: "medium",
  description: "Detects Python projects with requirements.txt or Pipfile but no lockfile, making installs non-deterministic.",
  async check(context) {
    if (!context.stack.python) return [];

    const hasRequirements = context.files.some((f) =>
      /(?:^|\/)requirements(?:[-_]\w+)?\.txt$/.test(f) || f === "Pipfile"
    );
    if (!hasRequirements) return [];

    // Poetry, Pipenv, PDM, or uv all produce a lockfile
    const hasLockfile = PYTHON_LOCKFILES.some((lf) => context.files.includes(lf));
    if (hasLockfile) return [];

    const requirementFiles = context.files.filter((f) =>
      /(?:^|\/)requirements(?:[-_]\w+)?\.txt$/.test(f) || f === "Pipfile"
    );

    return [{
      ruleId: "python/missing-lockfile",
      severity: "medium",
      message: "Python dependencies declared without a lockfile — installs will be non-deterministic.",
      files: requirementFiles,
      evidence: requirementFiles.map((f) => `found: ${f}`),
      recommendation: "Use Poetry (poetry.lock), Pipenv (Pipfile.lock), PDM (pdm.lock), or uv (uv.lock) to generate and commit a lockfile.",
    }];
  },
};
