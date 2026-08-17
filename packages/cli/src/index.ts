#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { scanRepository, type Finding, type Severity } from "@blindspot/core";
import { builtInRules } from "@blindspot/rules";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

function formatHuman(findings: readonly Finding[]): string {
  const sections = findings.map((finding) => [
    finding.severity.toUpperCase(), finding.ruleId, "", finding.message,
    ...(finding.files?.length ? ["", `Files: ${finding.files.join(", ")}`] : []),
    ...(finding.recommendation ? ["", `Suggested fix: ${finding.recommendation}`] : []),
  ].join("\n"));
  const counts = Object.fromEntries(SEVERITIES.map((severity) => [
    severity, findings.filter((finding) => finding.severity === severity).length,
  ])) as Record<Severity, number>;
  const summary = [
    `${findings.length} ${findings.length === 1 ? "finding" : "findings"}`,
    "", `Critical: ${counts.critical}`, `High:     ${counts.high}`,
    `Medium:   ${counts.medium}`, `Low:      ${counts.low}`,
  ].join("\n");
  if (findings.length === 0) return `Blindspot\n\nNo issues found.\n\n${summary}`;
  return `Blindspot\n\n${findings.length} issues found\n\n${sections.join("\n\n────────────────────────────\n\n")}\n\n${summary}`;
}

async function scan(scanPath: string | undefined, options: { json?: boolean }): Promise<void> {
  const target = path.resolve(scanPath ?? process.cwd());
  const findings = await scanRepository(target, builtInRules);
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ findings }, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatHuman(findings)}\n`);
  }
  if (findings.some((finding) => finding.severity === "critical" || finding.severity === "high")) {
    process.exitCode = 1;
  }
}

function addScanOptions(command: Command): Command {
  return command.argument("[path]", "repository path", ".").option("--json", "write findings as JSON")
    .action(async (scanPath: string, options: { json?: boolean }, commandWithOptions: Command) => {
      const json = options.json || commandWithOptions.parent?.opts<{ json?: boolean }>().json;
      await scan(scanPath, { json });
    });
}

const program = new Command();
program.name("blindspot").description("Find the problems your linters don't.").version("0.1.0");
addScanOptions(program);
addScanOptions(program.command("scan").description("scan a repository"));

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Blindspot error";
  process.stderr.write(`Blindspot failed: ${message}\n`);
  process.exitCode = 2;
});
