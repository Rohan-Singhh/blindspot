import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@blindspot/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@blindspot/rules": fileURLToPath(new URL("./packages/rules/src/index.ts", import.meta.url)),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
