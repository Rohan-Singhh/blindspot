import type { Finding, Rule } from "@blindspot/core";
import { packageJson, readRepositoryFile } from "../utils.js";

function parseJsonc(source: string): Record<string, unknown> | undefined {
  let result = ""; let inString = false; let escaped = false; let lineComment = false; let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]; const next = source[index + 1];
    if (lineComment) { if (char === "\n") { lineComment = false; result += char; } continue; }
    if (blockComment) { if (char === "*" && next === "/") { blockComment = false; index += 1; } continue; }
    if (!inString && char === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (!inString && char === "/" && next === "*") { blockComment = true; index += 1; continue; }
    result += char;
    if (inString && char === "\\" && !escaped) { escaped = true; continue; }
    if (char === '"' && !escaped) inString = !inString;
    escaped = false;
  }
  try { return JSON.parse(result.replace(/,\s*([}\]])/g, "$1")) as Record<string, unknown>; } catch { return undefined; }
}

function packageTargets(pkg: Record<string, unknown>): string[] {
  const targets: string[] = [];
  for (const field of ["main", "module", "types", "typings"] as const) if (typeof pkg[field] === "string") targets.push(`package ${field}: ${pkg[field]}`);
  return targets;
}

function targetPath(evidence: string): string { return evidence.slice(evidence.indexOf(":") + 1).trim().replace(/^\.\//, "").replaceAll("\\", "/"); }

export const buildOutputMismatchRule: Rule = {
  id: "runtime/build-output-mismatch", title: "TypeScript build output mismatch", category: "runtime", defaultSeverity: "high",
  description: "Compares TypeScript outDir with package runtime targets and Docker Node commands.",
  async check(context): Promise<Finding[]> {
    if (!context.files.includes("package.json") || !context.files.includes("tsconfig.json")) return [];
    const pkg = await packageJson(context); const scripts = pkg?.scripts && typeof pkg.scripts === "object" ? pkg.scripts as Record<string, unknown> : undefined;
    if (!pkg || typeof scripts?.build !== "string" || !/(?:^|\s)(?:npx\s+)?tsc(?:\s|$)/.test(scripts.build)) return [];
    const tsconfigSource = await readRepositoryFile(context, "tsconfig.json"); const tsconfig = tsconfigSource ? parseJsonc(tsconfigSource) : undefined;
    const compilerOptions = tsconfig?.compilerOptions && typeof tsconfig.compilerOptions === "object" ? tsconfig.compilerOptions as Record<string, unknown> : undefined;
    if (typeof compilerOptions?.outDir !== "string") return [];
    const outDir = compilerOptions.outDir.replace(/^\.\//, "").replace(/[\\/]$/, "").replaceAll("\\", "/"); if (!outDir || outDir === ".") return [];
    const targets = packageTargets(pkg);
    for (const file of context.files.filter((candidate) => /(^|\/)Dockerfile(?:\..+)?$/.test(candidate))) {
      const docker = await readRepositoryFile(context, file); if (!docker) continue;
      for (const match of docker.matchAll(/\b(?:CMD|ENTRYPOINT)\s*\[\s*["']node["']\s*,\s*["']([^"']+)["']/gi)) targets.push(`${file} Node target: ${match[1]}`);
    }
    const mismatches = targets.filter((entry) => { const target = targetPath(entry); return !target.startsWith(`${outDir}/`) && target !== outDir; });
    if (!mismatches.length) return [];
    return [{ ruleId: "runtime/build-output-mismatch", severity: "high", message: "TypeScript build output does not match declared runtime targets.", files: ["package.json", "tsconfig.json", ...mismatches.filter((item) => item.includes("Dockerfile")).map((item) => item.split(" Node target:")[0])], evidence: [`tsconfig outDir: ${outDir}`, ...mismatches], recommendation: "Align tsconfig outDir with package entry points and container runtime commands." }];
  },
};
