import { defineCommand } from "citty";
import consola from "consola";
import { quoted, stripControlCharacters } from "../core/text.ts";
import { ChainsError, InvalidAddressError, InvalidTxidError } from "../index.ts";
import { resolveOrFail } from "./shared.ts";

/**
 * The line a failed check prints: the rejection with its reason when the validator gave one,
 * or the message of an error that means nothing was checked.
 *
 * @param {Readonly<ChainsError>} error - What the check threw.
 * @param {string} rejection - The rejection line, caller input already quoted.
 * @returns {string} One line with no control characters from the caller or a custom chain.
 */
function failureLine(error: Readonly<ChainsError>, rejection: string): string {
  if (error instanceof InvalidAddressError || error instanceof InvalidTxidError) {
    return error.reason ? `${rejection} - ${stripControlCharacters(error.reason)}` : rejection;
  }
  return stripControlCharacters(error.message);
}

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
      consola.error(failureLine(error, `Invalid ${chain.key} ${subject}: ${quoted(args.value)}`));
      process.exitCode = 1;
    }
  },
});
