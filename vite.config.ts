import { fileURLToPath } from "node:url";
import oxfmt from "@agntn/ox/oxfmt";
import oxlint from "@agntn/ox/oxlint";
import { defineConfig } from "vite-plus";

/** Lint, format and test run on Vite+. The build stays on obuild (`build.config.ts`). */
export default defineConfig({
  fmt: {
    ...oxfmt,
    ignorePatterns: ["dist", "coverage", "docs", "CHANGELOG.md"],
  },
  lint: {
    ...oxlint,
    ignorePatterns: ["dist", "coverage", "docs"],
  },
  resolve: {
    alias: {
      /** The package's own name means source here, or a test passes on a stale `dist/`. */
      "@agntn/chains": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
