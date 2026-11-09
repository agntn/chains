/** Vercel AI SDK tools over the same definitions MCP, Pi, OMP and the CLI read. */

import { toAiTools, type AiTools } from "@agntn/tools/ai";
import { chainTools } from "./tools.ts";

/** Every chain tool under its MCP name. The registry and the executors wait for the first call. */
export const chainsAiTools: AiTools<typeof chainTools> = toAiTools(chainTools);
