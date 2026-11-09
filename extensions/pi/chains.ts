import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { registerPiTools } from "@agntn/tools/pi";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type * as ChainTools from "../../dist/tools.d.mts";

const sourceModuleUrl = new URL("../../src/tools.ts", import.meta.url);
const distributionModuleUrl = new URL("../../dist/tools.mjs", import.meta.url);

/**
 * Source in a checkout, `dist` in a package, which ships no `src`.
 *
 * @returns {string} Module URL for the current package layout.
 */
export function resolveChainsModuleUrl(): string {
  return existsSync(fileURLToPath(sourceModuleUrl))
    ? sourceModuleUrl.href
    : distributionModuleUrl.href;
}

/**
 * Registers the chain tools with Pi, which marks a call failed only when it throws.
 *
 * @param pi - Pi extension API.
 * @returns {Promise<void>} Resolves once every tool is registered.
 */
export default async function chainsExtension(pi: ExtensionAPI): Promise<void> {
  const { chainTools } = (await import(resolveChainsModuleUrl())) as typeof ChainTools;
  registerPiTools(pi, chainTools);
}
