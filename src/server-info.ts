import type { McpServerInfo } from "@agntn/tools/mcp";
import { version } from "./version.ts";

/** How `chains mcp` introduces itself, apart so the CLI can name it without the SDK. */
export const serverInfo = { name: "chains", version } satisfies McpServerInfo;
