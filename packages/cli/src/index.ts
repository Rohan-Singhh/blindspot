#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import {
  createRepositoryContext,
  runRules,
  type Finding,
  type RepositoryStack,
  type Rule,
  type Severity,
} from "@blindspot/core";
import { builtInRules } from "@blindspot/rules";
import { buildSarif } from "./sarif.js";
import { filterBaseline, loadBaseline, writeBaseline } from "./baseline.js";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const severityRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

type ScanOptions = {
  json?: boolean;
  quiet?: boolean;
  category?: string;
  severity?: Severity;
  sarif?: string;
  updateBaseline?: boolean;
  showSuppressed?: boolean;
};

// ── Config loading ────────────────────────────────────────────────────────────

interface IgnoreEntry { rule: string; path?: string; }

async function loadIgnoredRules(rootDir: string): Promise<Array<IgnoreEntry | string>> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path.join(rootDir, "blindspot.config.json"), "utf8"));
    if (!parsed || typeof parsed !== "object") throw new Error("blindspot.config.json must be a JSON object.");
    const cfg = parsed as Record<string, unknown>;
    const ignore = cfg.ignore;
    if (ignore === undefined) return [];
    if (!Array.isArray(ignore)) throw new Error("blindspot.config.json: 'ignore' must be an array.");
    for (const item of ignore) {
      if (typeof item !== "string" && (typeof item !== "object" || !item || typeof (item as Record<string, unknown>).rule !== "string")) {
        throw new Error("blindspot.config.json: each 'ignore' entry must be a string or { rule, path? }.");
      }
    }
    return ignore as Array<IgnoreEntry | string>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    if (error instanceof Error && error.message.startsWith("blindspot.config")) throw error;
    throw new Error("blindspot.config.json is invalid JSON.");
  }
}

function isIgnored(ruleId: string, files: string[] | undefined, ignoreList: Array<IgnoreEntry | string>): boolean {
  for (const entry of ignoreList) {
    if (typeof entry === "string") {
      if (entry === ruleId) return true;
    } else {
      if (entry.rule !== ruleId) continue;
      if (!entry.path) return true; // rule-level suppress
      // Path-prefix suppress
      if (files?.some((f) => f.startsWith(entry.path!))) return true;
    }
  }
  return false;
}

function enabledRules(options: ScanOptions, ignoreList: Array<IgnoreEntry | string>): Rule[] {
  return builtInRules.filter((rule) =>
    !ignoreList.some((e) => typeof e === "string" ? e === rule.id : e.rule === rule.id && !e.path) &&
    (!options.category || rule.category === options.category) &&
    (!options.severity || severityRank[rule.defaultSeverity] <= severityRank[options.severity])
  );
}

// ── Formatting ────────────────────────────────────────────────────────────────

function stackLabel(stack: RepositoryStack): string {
  const names: Partial<Record<keyof RepositoryStack, string>> = {
    node: "Node.js", typescript: "TypeScript", javascript: "JavaScript",
    docker: "Docker", githubActions: "GitHub Actions",
    prisma: "Prisma", nextjs: "Next.js", express: "Express",
    kubernetes: "Kubernetes", terraform: "Terraform",
    python: "Python", golang: "Go", java: "Java", rust: "Rust",
    gitlabCi: "GitLab CI", azurePipelines: "Azure Pipelines", circleCi: "CircleCI",
  };
  const parts: string[] = [
    ...Object.entries(names)
      .filter(([key]) => Boolean(stack[key as keyof RepositoryStack]))
      .map(([, name]) => name!),
    ...(stack.packageManager ? [String(stack.packageManager)] : []),
  ];
  return parts.join(" · ");
}

function formatHuman(
  findings: readonly Finding[],
  suppressed: readonly Finding[],
  showSuppressed: boolean,
  stack: RepositoryStack,
  fileCount: number,
  durationMs: number,
): string {
  const displayFindings = showSuppressed
    ? [...findings, ...suppressed.map((f) => ({ ...f, message: `[suppressed] ${f.message}` }))]
    : findings;

  const sections = displayFindings.map((finding) =>
    [
      finding.severity.toUpperCase(),
      finding.ruleId,
      "",
      finding.message,
      ...(finding.evidence?.length ? ["", ...finding.evidence] : []),
      ...(finding.files?.length ? ["", `Files: ${finding.files.join(", ")}`] : []),
      ...(finding.recommendation ? ["", "Suggested fix:", finding.recommendation] : []),
    ].join("\n")
  );

  const counts = Object.fromEntries(
    SEVERITIES.map((severity) => [severity, findings.filter((f) => f.severity === severity).length])
  ) as Record<Severity, number>;

  const header = `Blindspot v${metadata.version}\n\nDetected:\n${stackLabel(stack) || "No supported stack detected"}\n\nScanned ${fileCount} files in ${durationMs}ms`;
  const suppressedNote = suppressed.length > 0 ? `\n\n${suppressed.length} finding(s) suppressed by baseline.${showSuppressed ? " (shown above)" : " Use --show-suppressed to display them."}` : "";
  const summary = `Summary\n\nCritical  ${counts.critical}\nHigh      ${counts.high}\nMedium    ${counts.medium}\nLow       ${counts.low}`;

  return findings.length > 0
    ? `${header}\n\n${findings.length} ${findings.length === 1 ? "finding" : "findings"}\n\n${sections.join("\n\n────────────────────────────────────────\n\n")}${suppressedNote}\n\n${summary}`
    : `${header}\n\nNo issues found by the enabled Blindspot rules.${suppressedNote}\n\n${summary}`;
}

// ── Scan command ──────────────────────────────────────────────────────────────

async function scan(scanPath: string | undefined, options: ScanOptions): Promise<void> {
  const startedAt = performance.now();
  const rootDir = path.resolve(scanPath ?? process.cwd());
  const context = await createRepositoryContext(rootDir);
  const ignoreList = await loadIgnoredRules(rootDir);
  const allFindings = await runRules(context, enabledRules(options, ignoreList));

  // Apply per-finding path-scoped ignores
  const filteredFindings = allFindings.filter((f) => !isIgnored(f.ruleId, f.files, ignoreList));

  // Baseline suppression
  let active = filteredFindings;
  let suppressed: Finding[] = [];

  if (options.updateBaseline) {
    await writeBaseline(rootDir, filteredFindings);
    process.stdout.write(`Baseline written to blindspot.baseline.json (${filteredFindings.length} finding${filteredFindings.length === 1 ? "" : "s"}).\n`);
    return;
  }

  const baseline = await loadBaseline(rootDir);
  if (baseline.size > 0) {
    const result = filterBaseline(filteredFindings, baseline);
    active = result.active;
    suppressed = result.suppressed;
  }

  const durationMs = Math.round(performance.now() - startedAt);

  // SARIF output
  if (options.sarif) {
    const sarifOutput = buildSarif(active, builtInRules, metadata.version);
    const sarifPath = path.resolve(rootDir, options.sarif);
    await writeFile(sarifPath, JSON.stringify(sarifOutput, null, 2) + "\n", "utf8");
    if (!options.quiet) process.stdout.write(`SARIF written to ${options.sarif}\n`);
  }

  // JSON output
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ stack: context.stack, findings: active, suppressed: suppressed.length, durationMs }, null, 2)}\n`);
  } else if (!options.quiet) {
    process.stdout.write(`${formatHuman(active, suppressed, options.showSuppressed ?? false, context.stack, context.files.length, durationMs)}\n`);
  }

  if (active.some((f) => f.severity === "critical" || f.severity === "high")) {
    process.exitCode = 1;
  }
}

// ── CLI wiring ────────────────────────────────────────────────────────────────

function addScanOptions(command: Command): Command {
  return command
    .argument("[path]", "repository path", ".")
    .option("--json", "write findings as JSON")
    .option("--quiet", "suppress normal scan output")
    .option("--category <category>", "run rules in a category")
    .option("--severity <severity>", "minimum severity: critical, high, medium, or low")
    .option("--sarif <file>", "write SARIF 2.1.0 output to a file")
    .option("--update-baseline", "write current findings to blindspot.baseline.json and exit")
    .option("--show-suppressed", "show baseline-suppressed findings marked as [suppressed]")
    .action(async (scanPath: string, options: ScanOptions, commandWithOptions: Command) => {
      const merged = { ...commandWithOptions.parent?.opts<ScanOptions>(), ...options };
      if (merged.severity && !SEVERITIES.includes(merged.severity)) {
        throw new Error("--severity must be critical, high, medium, or low.");
      }
      await scan(scanPath, merged);
    });
}

const metadata = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
) as { version: string };

const examples = [
  "Examples:",
  "",
  "  blindspot",
  "  blindspot scan",
  "  blindspot scan ./api",
  "  blindspot scan --json",
  "  blindspot scan --severity high",
  "  blindspot scan --category docker",
  "  blindspot scan --sarif results.sarif",
  "  blindspot scan --update-baseline",
  "  blindspot scan --show-suppressed",
].join("\n");

const program = new Command();
program
  .name("blindspot")
  .description(`Find the problems your linters don't.\n\n${examples}`)
  .version(metadata.version);

addScanOptions(program);
addScanOptions(program.command("scan").description(`scan a repository\n\n${examples}`));

program
  .command("rules")
  .description("list available rules")
  .option("--category <category>", "filter rules by category")
  .action((options: { category?: string }, command: Command) => {
    const category = options.category || command.parent?.opts<{ category?: string }>().category;
    const rules = builtInRules
      .filter((rule) => !category || rule.category === category)
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const rule of rules) {
      process.stdout.write(`${rule.id.padEnd(50)} ${rule.defaultSeverity}\n`);
    }
  });

program.parseAsync().catch((error: unknown) => {
  process.stderr.write(`Blindspot failed: ${error instanceof Error ? error.message : "Unknown error"}\n`);
  process.exitCode = 2;
});
