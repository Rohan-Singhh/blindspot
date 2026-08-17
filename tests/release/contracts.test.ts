import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { npmFilesExcludesRuntimeRule, npmFilesIncludesSecretRule, publishPrivatePackageRule, publishWorkspaceMismatchRule } from "@blindspot/rules";
import { createFixture } from "../helpers.js";

const check = async (rule: typeof npmFilesExcludesRuntimeRule, files: Record<string, string>) => rule.check(await createRepositoryContext(await createFixture(files)));

describe("release contract rules", () => {
  it("detects a runtime target excluded from npm files", async () => expect(await check(npmFilesExcludesRuntimeRule, { "package.json": '{"main":"dist/index.js","files":["lib"]}' })).toHaveLength(1));
  it("accepts a runtime target covered by npm files", async () => expect(await check(npmFilesExcludesRuntimeRule, { "package.json": '{"main":"dist/index.js","files":["dist"]}' })).toEqual([]));
  it("detects an explicitly packaged sensitive env file", async () => expect(await check(npmFilesIncludesSecretRule, { "package.json": '{"files":["dist",".env.production"]}' })).toHaveLength(1));
  it("allows env template files in npm files", async () => expect(await check(npmFilesIncludesSecretRule, { "package.json": '{"files":["dist",".env.production.example"]}' })).toEqual([]));
  it("detects CI publishing a private package", async () => expect(await check(publishPrivatePackageRule, { "package.json": '{"private":true}', ".github/workflows/release.yml": "steps:\n - run: npm publish" })).toHaveLength(1));
  it("allows non-publishing CI for a private package", async () => expect(await check(publishPrivatePackageRule, { "package.json": '{"private":true}', ".github/workflows/ci.yml": "steps:\n - run: npm test" })).toEqual([]));
  it("detects publishing from a private workspace", async () => expect(await check(publishWorkspaceMismatchRule, { ".github/workflows/release.yml": "steps:\n  - run: npm publish\n    working-directory: packages/cli", "packages/cli/package.json": '{"private":true}' })).toHaveLength(1));
  it("detects a publish directory without package.json", async () => expect(await check(publishWorkspaceMismatchRule, { ".github/workflows/release.yml": "steps:\n  - run: npm publish\n    working-directory: packages/cli", "packages/cli/README.md": "CLI" })).toHaveLength(1));
  it("accepts a publishable workspace target", async () => expect(await check(publishWorkspaceMismatchRule, { ".github/workflows/release.yml": "steps:\n  - run: npm publish\n    working-directory: packages/cli", "packages/cli/package.json": '{"name":"cli"}' })).toEqual([]));
  it("stays quiet for dynamic publish directories", async () => expect(await check(publishWorkspaceMismatchRule, { ".github/workflows/release.yml": "steps:\n  - run: npm publish\n    working-directory: ${{ matrix.package }}", "packages/cli/package.json": '{"name":"cli"}' })).toEqual([]));
});
