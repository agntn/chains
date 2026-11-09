import { createMcpServer as createToolServer } from "@agntn/tools/mcp";
import { serverInfo } from "./server-info.ts";
import { chainTools } from "./tools.ts";

export { serverInfo };

/**
 * Creates an unconnected MCP server; the executors load on the first `tools/call`.
 *
 * @returns {ReturnType<typeof createToolServer>} Unconnected MCP server from SDK 2.
 */
export function createMcpServer(): ReturnType<typeof createToolServer> {
  return createToolServer(serverInfo, chainTools);
}
