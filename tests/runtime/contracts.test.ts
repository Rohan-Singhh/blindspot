import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { missingLockfileRule, multipleLockfilesRule, packageManagerFieldDriftRule } from "@blindspot/rules";
import { createFixture } from "../helpers.js";

const check = async (rule: typeof missingLockfileRule, files: Record<string, string>) => rule.check(await createRepositoryContext(await createFixture(files)));

describe("runtime contract rules", () => {
  it("detects a declared manager without its lockfile", async () => expect(await check(missingLockfileRule, { "package.json": '{"packageManager":"pnpm@9"}' })).toHaveLength(1));
  it("accepts a declared manager with its lockfile", async () => expect(await check(missingLockfileRule, { "package.json": '{"packageManager":"pnpm@9"}', "pnpm-lock.yaml": "lockfileVersion: '9'" })).toEqual([]));
  it("detects competing root lockfiles", async () => expect(await check(multipleLockfilesRule, { "package-lock.json": "{}", "yarn.lock": "" })).toHaveLength(1));
  it("accepts one root lockfile", async () => expect(await check(multipleLockfilesRule, { "package-lock.json": "{}" })).toEqual([]));
  it("detects packageManager and lockfile drift", async () => expect(await check(packageManagerFieldDriftRule, { "package.json": '{"packageManager":"pnpm@9"}', "package-lock.json": "{}" })).toHaveLength(1));
  it("accepts an aligned packageManager field", async () => expect(await check(packageManagerFieldDriftRule, { "package.json": '{"packageManager":"npm@10"}', "package-lock.json": "{}" })).toEqual([]));
});
