import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { registerOmpTools } from "@agntn/tools/omp";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import type * as ChainTools from "../../dist/tools.d.mts";

const sourceModulePath = fileURLToPath(new URL("../../src/tools.ts", import.meta.url));

/**
 * Both specifiers stay literal: compiled OMP resolves bare imports only where it sees them.
 *
 * @returns {Promise<typeof ChainTools>} The tool definitions.
 */
function loadTools(): Promise<typeof ChainTools> {
  return (
    existsSync(sourceModulePath) ? import("../../src/tools.ts") : import("../../dist/tools.mjs")
  ) as Promise<typeof ChainTools>;
}

/**
 * Registers the chain tools with OMP, which reads `isError` off the result.
 *
 * @param pi - OMP extension API.
 * @returns {Promise<void>} Resolves once every tool is registered.
 */
export default async function chainsOmpExtension(pi: ExtensionAPI): Promise<void> {
  const { Text } = pi.pi;
  const { chainTools } = await loadTools();
  registerOmpTools(pi, chainTools, { Text });
}
