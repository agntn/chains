import { defineCommand } from "citty";
import consola from "consola";
import { resolveOrFail } from "./shared.js";

export default defineCommand({
  meta: {
    description: "Resolve a name, symbol, or alias to its canonical chain key",
  },
  args: {
    input: {
      type: "positional",
      description: "Chain name, symbol, or alias (for example: matic, btc, arb)",
      required: true,
    },
  },
  run({ args }) {
    const chain = resolveOrFail(args.input);
    if (!chain) return;

    consola.log(chain.key);
  },
});
