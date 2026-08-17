import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { duplicateTemplateVariableRule } from "@blindspot/rules";
import { createFixture } from "../helpers.js";

describe("environment contract rules", () => {
  it("detects duplicate declarations in one template", async () => { const root = await createFixture({ ".env.example": "PORT=\nPORT=3000\n" }); expect(await duplicateTemplateVariableRule.check(await createRepositoryContext(root))).toHaveLength(1); });
  it("allows the same variable in separate environment templates", async () => { const root = await createFixture({ ".env.dev.example": "PORT=\n", ".env.production.example": "PORT=\n" }); expect(await duplicateTemplateVariableRule.check(await createRepositoryContext(root))).toEqual([]); });
});
