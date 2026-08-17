import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { createRepositoryContext, runRules } from "@blindspot/core";
import { builtInRules, missingExampleVariableRule, rootUserRule, trackedEnvRule } from "@blindspot/rules";
import { copyFixture, fixturePath } from "./helpers.js";

const execFileAsync = promisify(execFile);
const contextFor = (name: string) => createRepositoryContext(fixturePath(name));

describe("git/tracked-env", () => {
  it("detects tracked sensitive environment files but excludes .env.example", async () => {
    const root = await copyFixture("tracked-env-repository");
    await execFileAsync("git", ["init"], { cwd: root });
    await execFileAsync("git", ["add", ".env", ".env.example"], { cwd: root });
    const findings = await trackedEnvRule.check(await createRepositoryContext(root));
    expect(findings).toHaveLength(1);
    expect(findings[0].files).toEqual([".env"]);
  });

  it("does not report untracked environment files", async () => {
    const root = await copyFixture("tracked-env-repository");
    await execFileAsync("git", ["init"], { cwd: root });
    expect(await trackedEnvRule.check(await createRepositoryContext(root))).toEqual([]);
  });

  it("does not report a tracked environment template variant", async () => {
    const root = await copyFixture("tracked-env-repository");
    await writeFile(path.join(root, ".env.dev.example"), "API_URL=\n");
    await execFileAsync("git", ["init"], { cwd: root });
    await execFileAsync("git", ["add", ".env.dev.example"], { cwd: root });
    expect(await trackedEnvRule.check(await createRepositoryContext(root))).toEqual([]);
  });

  it("still reports a tracked sensitive environment variant", async () => {
    const root = await copyFixture("tracked-env-repository");
    await writeFile(path.join(root, ".env.dev"), "API_URL=secret\n");
    await execFileAsync("git", ["init"], { cwd: root });
    await execFileAsync("git", ["add", ".env.dev"], { cwd: root });
    const findings = await trackedEnvRule.check(await createRepositoryContext(root));
    expect(findings[0].files).toEqual([".env.dev"]);
  });
});

describe("docker/root-user", () => {
  it("detects Dockerfiles without a non-root USER", async () => {
    const findings = await rootUserRule.check(await contextFor("unsafe-dockerfile"));
    expect(findings).toHaveLength(1);
    expect(findings[0].files).toEqual(["Dockerfile"]);
  });

  it("accepts a non-root USER in Dockerfile variants", async () => {
    expect(await rootUserRule.check(await contextFor("safe-dockerfile"))).toEqual([]);
  });
});

describe("env/example-missing-variable", () => {
  it("aggregates undocumented variables from dot and bracket syntax", async () => {
    const findings = await missingExampleVariableRule.check(await contextFor("missing-env-example-variable"));
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence).toEqual(["JWT_SECRET", "REDIS_URL"]);
  });

  it("does not report variables documented in .env.example", async () => {
    expect(await missingExampleVariableRule.check(await contextFor("complete-env-example"))).toEqual([]);
  });

  it("reports one clear finding when .env.example is absent", async () => {
    const root = await copyFixture("complete-env-example");
    await (await import("node:fs/promises")).rm(`${root}/.env.example`);
    const findings = await missingExampleVariableRule.check(await createRepositoryContext(root));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("Detected variables: DATABASE_URL, JWT_SECRET, REDIS_URL");
  });

  it("recognizes a variant environment template", async () => {
    const root = await copyFixture("complete-env-example");
    await (await import("node:fs/promises")).rm(`${root}/.env.example`);
    await writeFile(path.join(root, ".env.dev.example"), "REDIS_URL=\nDATABASE_URL=\nJWT_SECRET=\n");
    expect(await missingExampleVariableRule.check(await createRepositoryContext(root))).toEqual([]);
  });

  it("aggregates variables documented across nested templates", async () => {
    const root = await (await import("node:fs/promises")).mkdtemp(path.join(tmpdir(), "blindspot-env-"));
    await mkdir(path.join(root, "frontend"), { recursive: true });
    await mkdir(path.join(root, "backend"), { recursive: true });
    await writeFile(path.join(root, "index.ts"), "process.env.DATABASE_URL; process.env.JWT_SECRET; process.env.NEXT_PUBLIC_API_URL;");
    await writeFile(path.join(root, "backend", ".env.example"), "DATABASE_URL=\nJWT_SECRET=\n");
    await writeFile(path.join(root, "frontend", ".env.sample"), "NEXT_PUBLIC_API_URL=\n");
    expect(await missingExampleVariableRule.check(await createRepositoryContext(root))).toEqual([]);
  });
});

describe("repository-level rules", () => {
  it("detects stack information and issues in a realistic broken Node backend", async () => {
    const context = await contextFor("realistic-broken-node");
    expect(context.stack).toMatchObject({ node: true, javascript: true, docker: true, githubActions: true, express: true, packageManager: "pnpm" });
    const findings = await runRules(context, builtInRules);
    expect(findings.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining([
      "runtime/node-version-mismatch", "runtime/package-manager-mismatch", "ci/tests-not-run", "env/example-missing-variable", "docker/root-user",
    ]));
  });
});
