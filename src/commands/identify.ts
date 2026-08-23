import { defineCommand } from "citty";
import consola from "consola";
import { identify } from "../index.js";

export default defineCommand({
  meta: {
    name: "identify",
    description: "Report which chains accept an address's format",
  },
  args: {
    address: {
      type: "positional",
      description: "Address of unknown origin",
      required: true,
    },
    json: {
      type: "boolean",
      description: "Print machine-readable JSON",
      default: false,
    },
  },
  run({ args }) {
    const { matches, unchecked } = identify(args.address.trim());

    if (args.json) {
      consola.log(
        JSON.stringify(
          {
            matches: matches.map((chain) => chain.key),
            unchecked: unchecked.map((chain) => chain.key),
          },
          undefined,
          2,
        ),
      );
      return;
    }

    if (matches.length === 0) {
      consola.warn("No registered validator accepts this address");
    }
    for (const chain of matches) {
      consola.log(`${chain.key.padEnd(10)} ${chain.type.padEnd(7)} ${chain.name}`);
    }
    if (unchecked.length > 0) {
      consola.log(`Not checked (no validator): ${unchecked.map((chain) => chain.key).join(", ")}`);
    }
  },
});
