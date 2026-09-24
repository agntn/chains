import { defineCommand } from "citty";
import consola from "consola";
import type { ChainInfo } from "../core/types.js";
import { resolveOrFail } from "./shared.js";

/**
 * One line per field, a field the chain doesn't have left out.
 *
 * @param {ChainInfo} chain - The resolved chain.
 */
function printChain(chain: ChainInfo & { readonly key: string }): void {
  consola.log(`${chain.name} (${chain.key})`);
  const rows: Array<[string, string | number | undefined]> = [
    ["symbol", chain.symbol],
    ["decimals", chain.decimals ?? "unknown"],
    ["type", chain.type],
    ["bip44", chain.bip44],
    ["chainId", chain.chainId],
    ["caip2", chain.caip2],
    ["magic", chain.magic],
    ["pow", chain.pow],
    ["explorer", chain.explorer],
    ["rpc", chain.rpcDefault],
  ];
  for (const [label, value] of rows) {
    if (value !== undefined && value !== "") consola.log(`  ${label.padEnd(12)}${value}`);
  }
}

export default defineCommand({
  meta: {
    name: "info",
    description: "Show canonical metadata for a chain",
  },
  args: {
    chain: {
      type: "positional",
      description: "Chain key, name, symbol, or alias (defaults to Ethereum)",
      required: false,
    },
    json: {
      type: "boolean",
      description: "Print machine-readable JSON",
      default: false,
    },
  },
  run({ args }) {
    const chain = resolveOrFail(args.chain ?? "ethereum");
    if (!chain) return;

    if (args.json) {
      consola.log(
        JSON.stringify(
          {
            key: chain.key,
            name: chain.name,
            symbol: chain.symbol,
            decimals: chain.decimals,
            type: chain.type,
            bip44: chain.bip44,
            chainId: chain.chainId,
            caip2: chain.caip2,
            magic: chain.magic,
            pow: chain.pow,
            explorer: chain.explorer,
            rpcDefault: chain.rpcDefault,
          },
          undefined,
          2,
        ),
      );
      return;
    }

    printChain(chain);
  },
});
