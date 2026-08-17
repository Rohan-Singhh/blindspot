import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile } from "../utils.js";

const execFileAsync = promisify(execFile);

export const trackedServiceAccountRule: Rule = {
  id: "git/tracked-service-account",
  title: "Tracked service-account credentials",
  category: "git",
  defaultSeverity: "critical",
  description: "Detects Git-tracked JSON files containing Google-style service-account private credentials.",
  async check(context): Promise<Finding[]> {
    let tracked: string[];
    try {
      const { stdout } = await execFileAsync("git", ["-C", context.rootDir, "ls-files", "-z"], { encoding: "buffer", maxBuffer: 8 * 1024 * 1024 });
      tracked = stdout.toString("utf8").split("\0").filter((file) => file.endsWith(".json"));
    } catch { return []; }

    const exposed: string[] = [];
    for (const file of tracked) {
      const source = await readRepositoryFile(context, file);
      if (!source) continue;
      try {
        const value = JSON.parse(source) as Record<string, unknown>;
        if (value.type === "service_account"
          && typeof value.client_email === "string"
          && typeof value.private_key === "string"
          && /-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(value.private_key)) exposed.push(file);
      } catch { /* Non-JSON content is not a service-account credential. */ }
    }
    if (exposed.length === 0) return [];
    return [{
      ruleId: "git/tracked-service-account",
      severity: "critical",
      message: "Service-account private credentials are tracked by Git.",
      files: exposed,
      evidence: exposed.map((file) => `${file}: service_account JSON with client_email and private_key fields`),
      recommendation: "Disable and rotate the exposed service-account keys, remove the files from Git history, and load credentials from a secret manager.",
    }];
  },
};
