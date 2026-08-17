import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { duplicatePackageNameRule, internalDependencyVersionDriftRule, monorepoEngineDriftRule, monorepoMultipleLockfilesRule, monorepoPackageManagerDriftRule, workspaceScriptMissingRule } from "@blindspot/rules";
import { createFixture } from "../helpers.js";

const check = async (rule: typeof monorepoEngineDriftRule, files: Record<string, string>) => rule.check(await createRepositoryContext(await createFixture(files)));
const root = (extra = "") => `{"workspaces":["packages/*"]${extra}}`;

describe("monorepo contract rules", () => {
  it("detects package-manager drift across workspace manifests", async () => expect(await check(monorepoPackageManagerDriftRule, { "package.json": root(',"packageManager":"npm@10"'), "packages/api/package.json": '{"packageManager":"pnpm@9"}' })).toHaveLength(1));
  it("accepts aligned workspace package managers", async () => expect(await check(monorepoPackageManagerDriftRule, { "package.json": root(',"packageManager":"pnpm@9"'), "packages/api/package.json": '{"packageManager":"pnpm@9"}' })).toEqual([]));
  it("detects Node engine drift across workspace manifests", async () => expect(await check(monorepoEngineDriftRule, { "package.json": root(',"engines":{"node":">=22"}'), "packages/api/package.json": '{"engines":{"node":">=20"}}' })).toHaveLength(1));
  it("accepts aligned workspace Node engines", async () => expect(await check(monorepoEngineDriftRule, { "package.json": root(',"engines":{"node":">=22"}'), "packages/api/package.json": '{"engines":{"node":"^22"}}' })).toEqual([]));
  it("detects root and workspace-local lockfiles", async () => expect(await check(monorepoMultipleLockfilesRule, { "package.json": root(), "package-lock.json": "{}", "packages/api/package-lock.json": "{}" })).toHaveLength(1));
  it("accepts a root-managed monorepo lockfile", async () => expect(await check(monorepoMultipleLockfilesRule, { "package.json": root(), "package-lock.json": "{}", "packages/api/package.json": "{}" })).toEqual([]));
  it("detects duplicate declared workspace package names", async () => expect(await check(duplicatePackageNameRule, { "package.json": root(), "packages/api/package.json": '{"name":"@app/service"}', "packages/web/package.json": '{"name":"@app/service"}' })).toHaveLength(1));
  it("accepts unique workspace package names", async () => expect(await check(duplicatePackageNameRule, { "package.json": root(), "packages/api/package.json": '{"name":"@app/api"}', "packages/web/package.json": '{"name":"@app/web"}' })).toEqual([]));
  it("ignores packages outside declared workspace patterns", async () => expect(await check(duplicatePackageNameRule, { "package.json": root(), "packages/api/package.json": '{"name":"@app/api"}', "examples/api/package.json": '{"name":"@app/api"}' })).toEqual([]));
  it("detects a workspace missing a recursively required script", async () => expect(await check(workspaceScriptMissingRule, { "package.json": root(',"scripts":{"build":"npm run build --workspaces"}'), "packages/api/package.json": '{"scripts":{"build":"tsc"}}', "packages/web/package.json": "{}" })).toHaveLength(1));
  it("accepts recursive scripts defined by every workspace", async () => expect(await check(workspaceScriptMissingRule, { "package.json": root(',"scripts":{"test":"pnpm -r run test"}'), "packages/api/package.json": '{"scripts":{"test":"vitest"}}', "packages/web/package.json": '{"scripts":{"test":"vitest"}}' })).toEqual([]));
  it("accepts intentionally optional recursive scripts", async () => expect(await check(workspaceScriptMissingRule, { "package.json": root(',"scripts":{"lint":"npm run lint --workspaces --if-present"}'), "packages/api/package.json": "{}" })).toEqual([]));
  it("detects internal dependency ranges that exclude a workspace version", async () => expect(await check(internalDependencyVersionDriftRule, { "package.json": root(), "packages/api/package.json": '{"name":"@app/api","version":"2.0.0"}', "packages/web/package.json": '{"name":"@app/web","version":"1.0.0","dependencies":{"@app/api":"^1.4.0"}}' })).toHaveLength(1));
  it("accepts compatible internal dependency ranges", async () => expect(await check(internalDependencyVersionDriftRule, { "package.json": root(), "packages/api/package.json": '{"name":"@app/api","version":"1.5.0"}', "packages/web/package.json": '{"name":"@app/web","version":"1.0.0","dependencies":{"@app/api":"^1.4.0"}}' })).toEqual([]));
  it("leaves workspace protocols to the package manager", async () => expect(await check(internalDependencyVersionDriftRule, { "package.json": root(), "packages/api/package.json": '{"name":"@app/api","version":"2.0.0"}', "packages/web/package.json": '{"name":"@app/web","version":"1.0.0","dependencies":{"@app/api":"workspace:^1.0.0"}}' })).toEqual([]));
});
