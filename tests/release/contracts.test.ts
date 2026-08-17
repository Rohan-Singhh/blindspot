import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { npmFilesExcludesRuntimeRule, npmFilesIncludesSecretRule, publishPrivatePackageRule } from "@blindspot/rules";
import { createFixture } from "../helpers.js";

const check = async (rule: typeof npmFilesExcludesRuntimeRule, files: Record<string, string>) => rule.check(await createRepositoryContext(await createFixture(files)));

describe("release contract rules", () => {
  it("detects a runtime target excluded from npm files", async () => expect(await check(npmFilesExcludesRuntimeRule, { "package.json": '{"main":"dist/index.js","files":["lib"]}' })).toHaveLength(1));
  it("accepts a runtime target covered by npm files", async () => expect(await check(npmFilesExcludesRuntimeRule, { "package.json": '{"main":"dist/index.js","files":["dist"]}' })).toEqual([]));
  it("detects an explicitly packaged sensitive env file", async () => expect(await check(npmFilesIncludesSecretRule, { "package.json": '{"files":["dist",".env.production"]}' })).toHaveLength(1));
  it("allows env template files in npm files", async () => expect(await check(npmFilesIncludesSecretRule, { "package.json": '{"files":["dist",".env.production.example"]}' })).toEqual([]));
  it("detects CI publishing a private package", async () => expect(await check(publishPrivatePackageRule, { "package.json": '{"private":true}', ".github/workflows/release.yml": "steps:\n - run: npm publish" })).toHaveLength(1));
  it("allows non-publishing CI for a private package", async () => expect(await check(publishPrivatePackageRule, { "package.json": '{"private":true}', ".github/workflows/ci.yml": "steps:\n - run: npm test" })).toEqual([]));
});
