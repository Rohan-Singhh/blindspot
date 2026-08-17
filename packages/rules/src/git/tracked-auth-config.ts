import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile } from "../utils.js";

const execFileAsync = promisify(execFile);
const AUTH_FILES = new Set([".npmrc", ".netrc", ".pypirc"]);

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().replace(/^['"]|['"]$/g, "");
  return normalized === ""
    || /\$\{[^}]+\}|\$[A-Za-z_][A-Za-z0-9_]*|%[A-Za-z_][A-Za-z0-9_]*%|\$\{\{/.test(normalized)
    || /^(?:<[^>]+>|\*+|x+|example|changeme|replace[-_ ]?me|your[-_ ].*|token)$/i.test(normalized);
}

function credentialLines(file: string, source: string): string[] {
  const basename = file.split("/").at(-1);
  const evidence: string[] = [];
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    let match: RegExpExecArray | null = null;
    if (basename === ".npmrc") match = /^\s*(?:\/\/[^:]+\/)?(?::)?(_authToken|_auth|_password)\s*=\s*(.*?)\s*$/i.exec(line);
    else if (basename === ".pypirc") match = /^\s*(password)\s*=\s*(.*?)\s*$/i.exec(line);
    if (match && !isPlaceholder(match[2])) evidence.push(`${file}:${index + 1}: literal ${match[1]} credential`);
    if (basename === ".netrc") {
      for (const password of line.matchAll(/(?:^|\s)(password)\s+(\S+)/gi)) {
        if (!isPlaceholder(password[2])) evidence.push(`${file}:${index + 1}: literal ${password[1]} credential`);
      }
    }
  }
  return evidence;
}

export const trackedAuthConfigRule: Rule = {
  id: "git/tracked-auth-config",
  title: "Tracked authentication configuration",
  category: "git",
  defaultSeverity: "critical",
  description: "Detects literal credentials in Git-tracked npm, netrc, and Python registry configuration.",
  async check(context): Promise<Finding[]> {
    let candidates: string[];
    try {
      const { stdout } = await execFileAsync("git", ["-C", context.rootDir, "ls-files", "-z"], { encoding: "buffer", maxBuffer: 8 * 1024 * 1024 });
      candidates = stdout.toString("utf8").split("\0").filter((file) => AUTH_FILES.has(file.split("/").at(-1) ?? ""));
    } catch { return []; }
    const evidence: string[] = [];
    for (const file of candidates) {
      const source = await readRepositoryFile(context, file);
      if (source) evidence.push(...credentialLines(file, source));
    }
    if (evidence.length === 0) return [];
    const files = [...new Set(evidence.map((item) => item.slice(0, item.lastIndexOf(":")) .replace(/:\d+$/, "")))];
    return [{
      ruleId: "git/tracked-auth-config",
      severity: "critical",
      message: "Literal authentication credentials are present in Git-tracked configuration.",
      files,
      evidence,
      recommendation: "Revoke or rotate exposed credentials, remove them from Git history, and reference environment variables or a secret manager instead.",
    }];
  },
};
