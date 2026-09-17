import { defineCommand } from "citty";
import consola from "consola";
import { quoted, stripControlCharacters } from "../core/text.js";
import { ChainsError, InvalidAddressError, InvalidTxidError } from "../index.js";
import { resolveOrFail } from "./shared.js";

export default defineCommand({
  meta: {
    name: "validate",
    description:
      "Validate an address, or with --txid a transaction id, against a chain's format rules",
  },
  args: {
    chain: {
      type: "positional",
      description: "Chain key, name, symbol, or alias",
      required: true,
    },
    value: {
      type: "positional",
      description: "Address to validate, or a transaction id with --txid",
      required: true,
    },
    txid: {
      type: "boolean",
      description: "Check the value as a transaction id instead of an address",
      default: false,
    },
  },
  run({ args }) {
    const chain = resolveOrFail(args.chain);
    if (!chain) return;
    const subject = args.txid ? "txid" : "address";

    try {
      if (args.txid) chain.assertTxid(args.value);
      else chain.assertAddress(args.value);
      consola.success(`Valid ${chain.name} ${subject}`);
    } catch (error) {
      if (!(error instanceof ChainsError)) throw error;
      consola.error(
        error instanceof InvalidAddressError || error instanceof InvalidTxidError
          ? `Invalid ${chain.key} ${subject}: ${quoted(args.value)}`
          : stripControlCharacters(error.message),
      );
      process.exitCode = 1;
    }
  },
});
