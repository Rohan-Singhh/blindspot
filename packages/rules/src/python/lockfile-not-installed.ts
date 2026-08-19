import type { Finding, Rule } from "@blindspot/core";
import { dockerfiles, readRepositoryFile, workflows } from "../utils.js";

export const pythonLockfileNotInstalledRule: Rule = {
  id: "python/lockfile-not-installed",
  title: "Python lockfile present but not used in Docker or CI",
  category: "python",
  defaultSeverity: "medium",
  description: "Detects a poetry.lock or Pipfile.lock that is never used by the install command in Dockerfiles or CI workflows.",
  async check(context) {
    if (!context.stack.python) return [];

    const hasPoetryLock = context.files.includes("poetry.lock");
    const hasPipfileLock = context.files.includes("Pipfile.lock");
    if (!hasPoetryLock && !hasPipfileLock) return [];

    const evidence: string[] = [];

    // Check Dockerfiles
    for (const file of dockerfiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;

      if (hasPoetryLock && /pip\s+install\s+-r\s+requirements/i.test(content)) {
        evidence.push(`${file}: uses pip install -r while poetry.lock is present`);
      }
      if (hasPipfileLock && /pip\s+install\s+-r\s+requirements/i.test(content) && !/pipenv\s+install/i.test(content)) {
        evidence.push(`${file}: uses pip install -r while Pipfile.lock is present`);
      }
    }

    // Check GitHub Actions workflows
    for (const file of workflows(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      if (hasPoetryLock && /pip\s+install\s+-r/i.test(content) && !/poetry\s+install/i.test(content)) {
        evidence.push(`${file}: uses pip install -r while poetry.lock is present`);
      }
    }

    if (evidence.length === 0) return [];
    return [{
      ruleId: "python/lockfile-not-installed",
      severity: "medium",
      message: "A Python lockfile is present but the install command in Docker or CI does not use it.",
      evidence,
      files: [...new Set(evidence.map((e) => e.split(":")[0]))],
      recommendation: hasPoetryLock
        ? "Replace pip install -r requirements.txt with poetry install --no-root to use the lockfile."
        : "Replace pip install -r requirements.txt with pipenv install --deploy to use Pipfile.lock.",
    }];
  },
};
