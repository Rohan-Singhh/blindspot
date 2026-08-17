import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { dependencyDirectoryCommittedRule, ignoredLockfileRule, trackedAuthConfigRule, trackedPrivateKeyRule, trackedServiceAccountRule } from "@blindspot/rules";
import { createFixture } from "../helpers.js";

const execFileAsync = promisify(execFile);
async function gitFixture(files: Record<string, string>, add: string[] = []): Promise<string> { const root = await createFixture(files); await execFileAsync("git", ["init"], { cwd: root }); if (add.length) await execFileAsync("git", ["add", "-f", ...add], { cwd: root }); return root; }

describe("Git contract rules", () => {
  it("detects a tracked file with a private-key header", async () => { const root = await gitFixture({ "deploy.key": "-----BEGIN PRIVATE KEY-----\nabc" }, ["deploy.key"]); expect(await trackedPrivateKeyRule.check(await createRepositoryContext(root))).toHaveLength(1); });
  it("does not report a tracked public certificate", async () => { const root = await gitFixture({ "server.pem": "-----BEGIN CERTIFICATE-----\nabc" }, ["server.pem"]); expect(await trackedPrivateKeyRule.check(await createRepositoryContext(root))).toEqual([]); });
  it("detects committed node_modules content", async () => { const root = await gitFixture({ "node_modules/demo/index.js": "export {};" }, ["node_modules/demo/index.js"]); expect(await dependencyDirectoryCommittedRule.check(await createRepositoryContext(root))).toHaveLength(1); });
  it("accepts an untracked node_modules directory", async () => { const root = await gitFixture({ "node_modules/demo/index.js": "export {};" }); expect(await dependencyDirectoryCommittedRule.check(await createRepositoryContext(root))).toEqual([]); });
  it("detects a lockfile ignored by Git", async () => { const root = await gitFixture({ ".gitignore": "package-lock.json\n", "package-lock.json": "{}" }); expect(await ignoredLockfileRule.check(await createRepositoryContext(root))).toHaveLength(1); });
  it("accepts a lockfile not ignored by Git", async () => { const root = await gitFixture({ ".gitignore": "dist/\n", "package-lock.json": "{}" }); expect(await ignoredLockfileRule.check(await createRepositoryContext(root))).toEqual([]); });
  it("detects tracked service-account credentials", async () => { const credential = JSON.stringify({ type: "service_account", client_email: "bot@example.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nnot-a-real-key" }); const root = await gitFixture({ "service-account.json": credential }, ["service-account.json"]); expect(await trackedServiceAccountRule.check(await createRepositoryContext(root))).toHaveLength(1); });
  it("accepts untracked service-account credentials", async () => { const credential = JSON.stringify({ type: "service_account", client_email: "bot@example.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nnot-a-real-key" }); const root = await gitFixture({ "service-account.json": credential }); expect(await trackedServiceAccountRule.check(await createRepositoryContext(root))).toEqual([]); });
  it("does not mistake public client configuration for credentials", async () => { const root = await gitFixture({ "firebase.json": JSON.stringify({ project_info: {}, client: [{ api_key: [] }] }) }, ["firebase.json"]); expect(await trackedServiceAccountRule.check(await createRepositoryContext(root))).toEqual([]); });
  it("detects a literal token in tracked auth configuration without exposing it", async () => { const root = await gitFixture({ ".npmrc": "//registry.npmjs.org/:_authToken=npm_secret_value\n" }, [".npmrc"]); const findings = await trackedAuthConfigRule.check(await createRepositoryContext(root)); expect(findings).toHaveLength(1); expect(JSON.stringify(findings)).not.toContain("npm_secret_value"); });
  it("accepts environment-variable auth configuration", async () => { const root = await gitFixture({ ".npmrc": "//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n" }, [".npmrc"]); expect(await trackedAuthConfigRule.check(await createRepositoryContext(root))).toEqual([]); });
  it("accepts untracked auth configuration", async () => { const root = await gitFixture({ ".netrc": "machine example.com login bot password secret-value\n" }); expect(await trackedAuthConfigRule.check(await createRepositoryContext(root))).toEqual([]); });
});
