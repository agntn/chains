import { defineCommand } from "citty";
import consola from "consola";
import { ChainsError } from "../index.js";
import { resolveOrFail } from "./shared.js";

export default defineCommand({
  meta: {
    description: "Validate an address against a chain's format rules",
  },
  args: {
    chain: {
      type: "positional",
      description: "Chain key, name, symbol, or alias",
      required: true,
    },
    address: {
      type: "positional",
      description: "Address to validate",
      required: true,
    },
  },
  run({ args }) {
    const chain = resolveOrFail(args.chain);
    if (!chain) return;

    try {
      chain.assertAddress(args.address);
      consola.success(`Valid ${chain.name} address`);
    } catch (error) {
      if (error instanceof ChainsError) {
        consola.error(error.message);
        process.exitCode = 1;
        return;
      }
      throw error;
    }
  },
});
