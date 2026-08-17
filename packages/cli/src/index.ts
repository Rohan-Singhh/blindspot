#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { createRepositoryContext, runRules, type Finding, type RepositoryStack, type Rule, type Severity } from "@blindspot/core";
import { builtInRules } from "@blindspot/rules";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const severityRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
type ScanOptions = { json?: boolean; quiet?: boolean; category?: string; severity?: Severity };

async function loadIgnoredRules(rootDir: string): Promise<Set<string>> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path.join(rootDir, "blindspot.config.json"), "utf8"));
    if (!parsed || typeof parsed !== "object" || ("ignore" in parsed && (!Array.isArray(parsed.ignore) || !parsed.ignore.every((id) => typeof id === "string")))) throw new Error("blindspot.config.json must contain an optional string array named 'ignore'.");
    return new Set((parsed as { ignore?: string[] }).ignore ?? []);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Set();
    if (error instanceof Error && error.message.startsWith("blindspot.config")) throw error;
    throw new Error("blindspot.config.json is invalid JSON.");
  }
}

function enabledRules(options: ScanOptions, ignored: ReadonlySet<string>): Rule[] {
  return builtInRules.filter((rule) => !ignored.has(rule.id) && (!options.category || rule.category === options.category) && (!options.severity || severityRank[rule.defaultSeverity] <= severityRank[options.severity]));
}

function stackLabel(stack: RepositoryStack): string {
  const names: Record<string, string> = { node: "Node.js", typescript: "TypeScript", javascript: "JavaScript", docker: "Docker", githubActions: "GitHub Actions", prisma: "Prisma", nextjs: "Next.js", express: "Express" };
  return [...Object.entries(names).filter(([key]) => stack[key as keyof RepositoryStack]).map(([, name]) => name), ...(stack.packageManager ? [String(stack.packageManager)] : [])].join(" · ");
}

function formatHuman(findings: readonly Finding[], stack: RepositoryStack, fileCount: number, durationMs: number): string {
  const sections = findings.map((finding) => [finding.severity.toUpperCase(), finding.ruleId, "", finding.message, ...(finding.evidence?.length ? ["", ...finding.evidence] : []), ...(finding.files?.length ? ["", `Files: ${finding.files.join(", ")}`] : []), ...(finding.recommendation ? ["", "Suggested fix:", finding.recommendation] : [])].join("\n"));
  const counts = Object.fromEntries(SEVERITIES.map((severity) => [severity, findings.filter((finding) => finding.severity === severity).length])) as Record<Severity, number>;
  const header = `Blindspot v${metadata.version}\n\nDetected:\n${stackLabel(stack) || "No supported stack detected"}\n\nScanned ${fileCount} files in ${durationMs}ms`;
  const summary = `Summary\n\nCritical  ${counts.critical}\nHigh      ${counts.high}\nMedium    ${counts.medium}\nLow       ${counts.low}`;
  return findings.length ? `${header}\n\n${findings.length} findings\n\n${sections.join("\n\n────────────────────────────────────────\n\n")}\n\n${summary}` : `${header}\n\nNo issues found by the enabled Blindspot rules.\n\n${summary}`;
}

async function scan(scanPath: string | undefined, options: ScanOptions): Promise<void> {
  const startedAt = performance.now();
  const rootDir = path.resolve(scanPath ?? process.cwd());
  const context = await createRepositoryContext(rootDir);
  const findings = await runRules(context, enabledRules(options, await loadIgnoredRules(rootDir)));
  const durationMs = Math.round(performance.now() - startedAt);
  if (options.json) process.stdout.write(`${JSON.stringify({ stack: context.stack, findings, durationMs }, null, 2)}\n`);
  else if (!options.quiet) process.stdout.write(`${formatHuman(findings, context.stack, context.files.length, durationMs)}\n`);
  if (findings.some((finding) => finding.severity === "critical" || finding.severity === "high")) process.exitCode = 1;
}

function addScanOptions(command: Command): Command {
  return command.argument("[path]", "repository path", ".").option("--json", "write findings as JSON").option("--quiet", "suppress normal scan output").option("--category <category>", "run rules in a category").option("--severity <severity>", "minimum severity: critical, high, medium, or low")
    .action(async (scanPath: string, options: ScanOptions, commandWithOptions: Command) => {
      const merged = { ...commandWithOptions.parent?.opts<ScanOptions>(), ...options };
      if (merged.severity && !SEVERITIES.includes(merged.severity)) throw new Error("--severity must be critical, high, medium, or low.");
      await scan(scanPath, merged);
    });
}

const metadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
const examples = "Examples:\n\n  blindspot\n  blindspot scan\n  blindspot scan ./api\n  blindspot scan --json\n  blindspot scan --severity high\n  blindspot scan --category docker";
const program = new Command();
program.name("blindspot").description(`Find the problems your linters don't.\n\n${examples}`).version(metadata.version);
addScanOptions(program); addScanOptions(program.command("scan").description(`scan a repository\n\n${examples}`));
program.parseAsync().catch((error: unknown) => { process.stderr.write(`Blindspot failed: ${error instanceof Error ? error.message : "Unknown error"}\n`); process.exitCode = 2; });
