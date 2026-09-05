import { defineCommand } from "citty";
import consola from "consola";
import { resolveOrFail } from "./shared.js";

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
            explorer: chain.explorer,
            rpcDefault: chain.rpcDefault,
          },
          undefined,
          2,
        ),
      );
      return;
    }

    consola.log(`${chain.name} (${chain.key})`);
    consola.log(`  symbol      ${chain.symbol}`);
    consola.log(`  decimals    ${chain.decimals ?? "unknown"}`);
    consola.log(`  type        ${chain.type}`);
    if (chain.bip44 !== undefined) consola.log(`  bip44       ${chain.bip44}`);
    if (chain.chainId) consola.log(`  chainId     ${chain.chainId}`);
    if (chain.caip2) consola.log(`  caip2       ${chain.caip2}`);
    consola.log(`  explorer    ${chain.explorer}`);
    if (chain.rpcDefault) consola.log(`  rpc         ${chain.rpcDefault}`);
  },
});
