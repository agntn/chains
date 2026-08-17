import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Point the package's own name at source, so tests never validate a stale dist
      // through Node's self-reference resolution.
      "@agntn/chains": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
});
