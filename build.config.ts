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
  hooks: {
    /**
     * typebox is only a peer, which obuild marks external, so the CLI and MCP server inline it.
     *
     * @param {import("rolldown").InputOptions} config - The rolldown options obuild passes in.
     */
    rolldownConfig(config) {
      const externals = Array.isArray(config.external) ? config.external : [];
      config.external = externals.filter(
        (entry) => entry !== "typebox" && !(entry instanceof RegExp && entry.test("typebox/value")),
      );
    },
  },
});
