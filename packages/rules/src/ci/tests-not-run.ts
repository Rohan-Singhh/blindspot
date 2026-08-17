import type { Finding, Rule } from "@blindspot/core";
import { packageJson, readRepositoryFile, workflows } from "../utils.js";

export const testsNotRunRule: Rule = {
  id: "ci/tests-not-run", title: "Tests are not run in CI", category: "ci", defaultSeverity: "high",
  description: "Detects GitHub Actions workflows that do not appear to run the repository test script.",
  async check(context): Promise<Finding[]> {
    const workflowFiles = workflows(context); if (!workflowFiles.length) return [];
    const pkg = await packageJson(context); const scripts = pkg?.scripts as Record<string, unknown> | undefined;
    if (!scripts || typeof scripts.test !== "string" || !scripts.test.trim() || /^echo\b/.test(scripts.test.trim())) return [];
    const contents = await Promise.all(workflowFiles.map((file) => readRepositoryFile(context, file)));
    if (contents.some((content) => content && /\b(?:npm|pnpm|yarn)(?:\s+run)?\s+test\b/.test(content))) return [];
    return [{ ruleId: "ci/tests-not-run", severity: "high", message: "This repository defines a test suite, but GitHub Actions does not appear to run it.", files: ["package.json", ...workflowFiles], recommendation: "Run the test script in at least one GitHub Actions workflow." }];
  },
};
