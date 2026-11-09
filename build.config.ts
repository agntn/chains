import { defineBuildConfig } from "obuild/config";

export default defineBuildConfig({
  /** One bundle: the entries share one registry, so a chain registered anywhere reaches MCP. */
  entries: [
    {
      type: "bundle",
      input: [
        "./src/index.ts",
        "./src/ai.ts",
        "./src/cli.ts",
        "./src/mcp.ts",
        "./src/mcp-stdio.ts",
        "./src/tools.ts",
        "./src/tool-operations.ts",
      ],
    },
  ],
});
