import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { cachePackageManagerMismatchRule, scriptCommandMissingRule } from "@blindspot/rules";
import { createFixture } from "../helpers.js";

const workflow = (command: string) => `jobs:\n  test:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: ${command}`;
const check = async (rule: typeof scriptCommandMissingRule, files: Record<string, string>) => rule.check(await createRepositoryContext(await createFixture(files)));

describe("CI contract rules", () => {
  it("detects an undefined script invoked by CI", async () => expect(await check(scriptCommandMissingRule, { "package.json": '{"scripts":{"test":"vitest"}}', ".github/workflows/ci.yml": "steps:\n - run: npm run compile" })).toHaveLength(1));
  it("accepts a defined script invoked by CI", async () => expect(await check(scriptCommandMissingRule, { "package.json": '{"scripts":{"build":"tsc"}}', ".github/workflows/ci.yml": "steps:\n - run: npm run build" })).toEqual([]));
  it("stays quiet for nested working-directory scripts", async () => expect(await check(scriptCommandMissingRule, { "package.json": '{}', ".github/workflows/ci.yml": "defaults:\n  run:\n    working-directory: frontend\nsteps:\n - run: npm run build" })).toEqual([]));
  it("detects setup-node cache and lockfile drift", async () => expect(await check(cachePackageManagerMismatchRule, { "package-lock.json": "{}", ".github/workflows/ci.yml": workflow("yarn") })).toHaveLength(1));
  it("accepts an aligned setup-node cache", async () => expect(await check(cachePackageManagerMismatchRule, { "package-lock.json": "{}", ".github/workflows/ci.yml": workflow("npm") })).toEqual([]));
  it("stays quiet when cache-dependency-path selects another lockfile", async () => expect(await check(cachePackageManagerMismatchRule, { "package-lock.json": "{}", ".github/workflows/ci.yml": `${workflow("yarn")}\n          cache-dependency-path: frontend/yarn.lock` })).toEqual([]));
});
