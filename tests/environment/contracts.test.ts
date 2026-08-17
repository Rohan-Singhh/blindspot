import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { duplicateTemplateVariableRule, templateWorkspaceDriftRule } from "@blindspot/rules";
import { createFixture } from "../helpers.js";

describe("environment contract rules", () => {
  it("detects duplicate declarations in one template", async () => { const root = await createFixture({ ".env.example": "PORT=\nPORT=3000\n" }); expect(await duplicateTemplateVariableRule.check(await createRepositoryContext(root))).toHaveLength(1); });
  it("allows the same variable in separate environment templates", async () => { const root = await createFixture({ ".env.dev.example": "PORT=\n", ".env.production.example": "PORT=\n" }); expect(await duplicateTemplateVariableRule.check(await createRepositoryContext(root))).toEqual([]); });
  it("detects a variable documented only in another workspace", async () => { const root = await createFixture({ "package.json": '{"workspaces":["apps/*"]}', "apps/api/package.json": "{}", "apps/api/.env.example": "PORT=\n", "apps/api/src.ts": "process.env.REDIS_URL", "apps/web/package.json": "{}", "apps/web/.env.example": "REDIS_URL=\n" }); expect(await templateWorkspaceDriftRule.check(await createRepositoryContext(root))).toHaveLength(1); });
  it("accepts a variable documented in its own workspace", async () => { const root = await createFixture({ "package.json": '{"workspaces":["apps/*"]}', "apps/api/package.json": "{}", "apps/api/.env.example": "REDIS_URL=\n", "apps/api/src.ts": "process.env['REDIS_URL']", "apps/web/package.json": "{}", "apps/web/.env.example": "REDIS_URL=\n" }); expect(await templateWorkspaceDriftRule.check(await createRepositoryContext(root))).toEqual([]); });
  it("does not duplicate the general missing-template rule", async () => { const root = await createFixture({ "package.json": '{"workspaces":["apps/*"]}', "apps/api/package.json": "{}", "apps/api/.env.example": "PORT=\n", "apps/api/src.ts": "process.env.UNKNOWN_VAR", "apps/web/package.json": "{}", "apps/web/.env.example": "OTHER=\n" }); expect(await templateWorkspaceDriftRule.check(await createRepositoryContext(root))).toEqual([]); });
});
