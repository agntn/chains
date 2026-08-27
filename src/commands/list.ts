import { defineCommand } from "citty";
import consola from "consola";
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
        "Only show chains of this family (evm, utxo, solana, stellar, move, ton, tron, octra)",
    },
    json: {
      type: "boolean",
      description: "Print machine-readable JSON",
      default: false,
    },
  },
  run({ args }) {
    const rows = chains()
      .map((key) => create(key))
      .filter((chain) => !args.type || chain.type === args.type);

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

    if (rows.length === 0) {
      consola.warn(`No registered chain has type: ${args.type}`);
      return;
    }

    for (const chain of rows) {
      consola.log(
        `${chain.key.padEnd(10)} ${chain.symbol.padEnd(6)} ${chain.type.padEnd(7)} ${chain.name}`,
      );
    }
  },
});
