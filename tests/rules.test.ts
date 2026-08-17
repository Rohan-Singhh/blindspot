import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { missingExampleVariableRule, rootUserRule, trackedEnvRule } from "@blindspot/rules";
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
  it("reports each undocumented variable from dot and bracket syntax", async () => {
    const findings = await missingExampleVariableRule.check(await contextFor("missing-env-example-variable"));
    expect(findings.map((finding) => finding.message)).toEqual([
      "JWT_SECRET is used by the application but is not documented in .env.example.",
      "REDIS_URL is used by the application but is not documented in .env.example.",
    ]);
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
});
