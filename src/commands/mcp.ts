import { defineCommand } from "citty";

export default defineCommand({
  meta: {
    name: "mcp",
    description: "Run the chains MCP server over stdio",
  },
  /** citty resolves every subcommand to print the usage, so the SDK loads here, not on `--help`. */
  async run() {
    const [{ createMcpServer }, { StdioServerTransport }] = await Promise.all([
      import("../mcp.js"),
      import("@modelcontextprotocol/sdk/server/stdio.js"),
    ]);
    await createMcpServer().connect(new StdioServerTransport());
  },
});
