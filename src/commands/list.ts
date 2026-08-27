import { defineCommand } from "citty";
import consola from "consola";
import { quoted } from "../core/text.js";
import { chains, create } from "../index.js";

export default defineCommand({
  meta: {
    name: "list",
    description: "List every registered chain",
  },
  args: {
    type: {
      type: "string",
      description:
        "Only show chains of this family (evm, utxo, solana, stellar, xrpl, move, ton, tron, octra)",
    },
    json: {
      type: "boolean",
      description: "Print machine-readable JSON",
      default: false,
    },
  },
  run({ args }) {
    const family = args.type;
    const rows = chains()
      .map((key) => create(key))
      .filter((chain) => !family || chain.type === family);

    if (args.json) {
      consola.log(
        JSON.stringify(
          rows.map((chain) => ({
            key: chain.key,
            name: chain.name,
            symbol: chain.symbol,
            type: chain.type,
          })),
          undefined,
          2,
        ),
      );
      return;
    }

    if (family && rows.length === 0) {
      consola.warn(`No registered chain has type: ${quoted(family)}`);
      return;
    }

    for (const chain of rows) {
      consola.log(
        `${chain.key.padEnd(10)} ${chain.symbol.padEnd(6)} ${chain.type.padEnd(7)} ${chain.name}`,
      );
    }
  },
});
