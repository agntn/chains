import { defineBuildConfig } from "obuild/config";

export default defineBuildConfig({
  // One bundle, four inputs: the entries share the chunk that holds the registry.
  // Separate bundles would each carry their own copy, so a class registered
  // through the package entrypoint would be invisible to the MCP server.
  entries: [
    {
      type: "bundle",
      input: ["./src/index.ts", "./src/cli.ts", "./src/mcp.ts", "./src/tool-operations.ts"],
    },
  ],
});
