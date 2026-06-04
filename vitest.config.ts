import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      chains: "/home/oritwoen/Projekty/oritwoen/chains/src/index.ts",
    },
  },
})
