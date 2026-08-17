import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile, rootLockfiles } from "../utils.js";

const execFileAsync = promisify(execFile);
async function tracked(rootDir: string): Promise<string[]> { try { const { stdout } = await execFileAsync("git", ["-C", rootDir, "ls-files", "-z"], { encoding: "buffer", maxBuffer: 8 * 1024 * 1024 }); return stdout.toString("utf8").split("\0").filter(Boolean); } catch { return []; } }

export const trackedPrivateKeyRule: Rule = {
  id: "git/tracked-private-key", title: "Tracked private key", category: "git", defaultSeverity: "critical",
  description: "Detects Git-tracked files containing recognized private-key headers.",
  async check(context): Promise<Finding[]> {
    const candidates = (await tracked(context.rootDir)).filter((file) => /(?:^|\/)(?:id_(?:rsa|dsa|ecdsa|ed25519)|[^/]+\.(?:pem|key))$/i.test(file)); const exposed: string[] = [];
    for (const file of candidates) { const content = await readRepositoryFile(context, file); if (content && /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(content)) exposed.push(file); }
    if (!exposed.length) return [];
    return [{ ruleId: "git/tracked-private-key", severity: "critical", message: "Private key material is tracked by Git.", files: exposed, evidence: exposed.map((file) => `${file}: contains a private-key header`), recommendation: "Revoke or rotate exposed keys, remove them from Git history, and store them outside the repository." }];
  },
};

export const dependencyDirectoryCommittedRule: Rule = {
  id: "git/dependency-directory-committed", title: "Dependency directory committed", category: "git", defaultSeverity: "medium",
  description: "Detects files tracked inside node_modules.",
  async check(context): Promise<Finding[]> {
    const affected = (await tracked(context.rootDir)).filter((file) => /(^|\/)node_modules\//.test(file)); if (!affected.length) return [];
    return [{ ruleId: "git/dependency-directory-committed", severity: "medium", message: "Git tracks installed dependency files under node_modules.", files: affected.slice(0, 20), evidence: [`${affected.length} tracked file${affected.length === 1 ? "" : "s"} under node_modules`], recommendation: "Remove dependency directories from Git tracking and ignore node_modules/." }];
  },
};

export const ignoredLockfileRule: Rule = {
  id: "git/ignored-lockfile", title: "Package lockfile ignored by Git", category: "git", defaultSeverity: "medium",
  description: "Detects an existing root lockfile excluded by Git ignore rules.",
  async check(context): Promise<Finding[]> {
    const ignored: string[] = [];
    for (const file of rootLockfiles(context)) { try { await execFileAsync("git", ["-C", context.rootDir, "check-ignore", "--quiet", "--", file]); ignored.push(file); } catch { /* not ignored or not Git */ } }
    if (!ignored.length) return [];
    return [{ ruleId: "git/ignored-lockfile", severity: "medium", message: "A root package-manager lockfile is ignored by Git.", files: ignored, evidence: ignored.map((file) => `${file}: matched by Git ignore rules`), recommendation: "Remove the lockfile ignore rule and commit the lockfile when reproducible installs are required." }];
  },
};
