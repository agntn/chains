import { defineCommand } from "citty";
import consola from "consola";
import { identifyAddress } from "../tool-operations.js";

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
    const { content, details } = identifyAddress(args.address);

    if (args.json) {
      consola.log(JSON.stringify(details, undefined, 2));
      return;
    }

    consola.log(content[0]?.text ?? "");
  },
});
