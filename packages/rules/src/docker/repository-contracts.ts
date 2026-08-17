import type { Finding, Rule } from "@blindspot/core";
import { readRepositoryFile, sensitiveEnvFiles } from "../utils.js";

const rootDockerfile = (files: string[]) => files.find((file) => file === "Dockerfile");
function envIgnored(file: string, dockerignore: string): boolean {
  const patterns = dockerignore.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && !line.startsWith("!"));
  return patterns.some((pattern) => pattern === file || pattern === ".env" && file === ".env" || [".env*", ".env.*", "**/.env*", "**/.env.*"].includes(pattern));
}

export const envFileCopiedRule: Rule = {
  id: "docker/env-file-copied", title: "Sensitive env file enters Docker build context", category: "docker", defaultSeverity: "high",
  description: "Detects root Docker COPY-all instructions that can include local env files.",
  async check(context): Promise<Finding[]> {
    const dockerfile = rootDockerfile(context.files); const envFiles = sensitiveEnvFiles(context); if (!dockerfile || !envFiles.length) return [];
    const docker = await readRepositoryFile(context, dockerfile); if (!docker || !/^\s*COPY\s+(?:--\S+\s+)*\.\s+\S+/im.test(docker)) return [];
    const ignore = context.files.includes(".dockerignore") ? await readRepositoryFile(context, ".dockerignore") : "";
    const protectedFiles = envFiles.filter((file) => envIgnored(file, ignore ?? ""));
    const exposed = envFiles.filter((file) => !protectedFiles.includes(file)); if (!exposed.length) return [];
    return [{ ruleId: "docker/env-file-copied", severity: "high", message: "Docker COPY can include sensitive environment files in the build context.", files: [dockerfile, ...exposed], evidence: ["Dockerfile: COPY . ...", ...exposed.map((file) => `${file}: not excluded by .dockerignore`)], recommendation: "Exclude sensitive env files in .dockerignore or copy only required paths." }];
  },
};

export const npmInstallWithLockfileRule: Rule = {
  id: "docker/npm-install-with-lockfile", title: "Non-deterministic npm install in Docker", category: "docker", defaultSeverity: "medium",
  description: "Detects npm install in Docker when an npm lockfile exists.",
  async check(context): Promise<Finding[]> {
    const lock = context.files.includes("npm-shrinkwrap.json") ? "npm-shrinkwrap.json" : context.files.includes("package-lock.json") ? "package-lock.json" : undefined;
    const dockerfile = rootDockerfile(context.files); if (!lock || !dockerfile) return [];
    const docker = await readRepositoryFile(context, dockerfile); if (!docker || !/^\s*RUN\s+.*\bnpm\s+install\b/im.test(docker)) return [];
    return [{ ruleId: "docker/npm-install-with-lockfile", severity: "medium", message: "Docker uses npm install even though an npm lockfile is available.", files: [dockerfile, lock], evidence: ["Dockerfile: npm install", `${lock}: present`], recommendation: "Use npm ci in the container build for a lockfile-exact install." }];
  },
};
