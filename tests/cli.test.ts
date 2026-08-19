import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { copyFixture, fixturePath } from "./helpers.js";

const cli = path.resolve("packages/cli/dist/index.js");
const run = (arguments_: string[]) => execFileSync(process.execPath, [cli, ...arguments_], { encoding: "utf8" });

describe("CLI integration", () => {
  it("scans an empty non-Git directory without crashing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "blindspot-empty-"));
    expect(run(["scan", root])).toContain("No issues found by the enabled Blindspot rules.");
  });

  it("emits JSON only and suppresses output in quiet mode", async () => {
    const safe = fixturePath("safe-repository");
    const parsed = JSON.parse(run(["scan", safe, "--json"])) as { findings: unknown[]; stack: object; durationMs: number };
    expect(parsed.findings).toEqual([]); expect(parsed.stack).toHaveProperty("typescript", true); expect(parsed.durationMs).toBeTypeOf("number");
    expect(run(["scan", safe, "--quiet"])).toBe("");
  });

  it("honours category filters and ignored-rule config", async () => {
    const root = await copyFixture("unsafe-dockerfile");
    await writeFile(path.join(root, "blindspot.config.json"), JSON.stringify({ ignore: ["docker/root-user"] }));
    const output = run(["scan", root, "--category", "docker"]);
    expect(output).toContain("No issues found by the enabled Blindspot rules.");
  });

  it("lists the rule registry and filters it by category", () => {
    const output = run(["rules", "--category", "docker"]);
    expect(output).toContain("docker/root-user");
    expect(output).toContain("docker/env-file-copied");
    expect(output).not.toContain("git/tracked-env");
  });

  it("writes SARIF 2.1.0 output alongside a scan", async () => {
    const root = await copyFixture("safe-repository");
    run(["scan", root, "--sarif", "results.sarif", "--quiet"]);
    const sarif = JSON.parse(await readFile(path.join(root, "results.sarif"), "utf8")) as { version: string; runs: unknown[] };
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs).toHaveLength(1);
  });

  it("suppresses an established baseline without hiding new scan output", async () => {
    const root = await copyFixture("unsafe-dockerfile");
    expect(run(["scan", root, "--update-baseline"])).toContain("Baseline written");
    const output = run(["scan", root]);
    expect(output).toContain("suppressed by baseline");
    expect(output).toContain("No issues found");
  });
});
