/** Where a chain's hex txid rule departs from 64 bare hex digits in either case. */
export interface HexTxidShape {
  /** `0x` in front, as every EVM chain and Aptos write it. */
  readonly prefixed?: boolean;
  /** Lowercase only, because the chain's own reader refuses anything else. */
  readonly lowercase?: boolean;
}

const HEX = /^[0-9a-fA-F]*$/;
const UPPERCASE_HEX = /[A-F]/;
/** `0x` in either case, so a capital X reads as a prefix spelled wrong rather than as a digit. */
const PREFIX = /^0x/i;

/**
 * The `0x` rule alone.
 *
 * @param {string | undefined} prefix - The `0x` or `0X` the txid starts with, if any.
 * @param {boolean} prefixed - Whether the chain writes `0x`.
 * @returns {string | undefined} The fault, or undefined when the txid follows the chain.
 */
function prefixFault(prefix: string | undefined, prefixed: boolean): string | undefined {
  if (prefix === undefined) return prefixed ? "no 0x in front of the hex digits" : undefined;
  if (!prefixed) return `${prefix} in front, which this chain's txids never carry`;
  return prefix === "0x" ? undefined : `${prefix} in front, where this chain writes 0x`;
}

/**
 * The digit count alone, counted as characters when some of them are not hex.
 *
 * @param {string} digits - Everything after the prefix.
 * @param {string | undefined} prefix - The prefix the txid starts with, if any.
 * @returns {string | undefined} The fault, or undefined for 64 digits.
 */
function lengthFault(digits: string, prefix: string | undefined): string | undefined {
  if (digits.length === 64) return undefined;
  const unit = HEX.test(digits) ? "hex digits" : "characters";
  return `${digits.length} ${unit}${prefix === undefined ? "" : ` after ${prefix}`}, not 64`;
}

/**
 * Checks a transaction id written as 32 bytes of hex and says what is wrong with it.
 *
 * One call decides both, so the answer and its reason can't disagree. Every fault
 * the string has is named at once, a character outside hex included: a model fixing
 * only the first one would send the string back and learn about the second on the
 * next call.
 *
 * @param {string} txid - Candidate transaction id.
 * @param {Readonly<HexTxidShape>} shape - The chain's prefix and case rule.
 * @returns {string | undefined} The rules the txid breaks, or undefined when it holds.
 */
export function hexTxidFault(txid: string, shape: Readonly<HexTxidShape> = {}): string | undefined {
  const prefix = PREFIX.exec(txid)?.[0];
  const digits = prefix === undefined ? txid : txid.slice(2);
  const faults = [
    prefixFault(prefix, shape.prefixed === true),
    HEX.test(digits) ? undefined : "characters that are not hex digits",
    lengthFault(digits, prefix),
    shape.lowercase && UPPERCASE_HEX.test(digits)
      ? "uppercase hex digits, and this chain reads lowercase only"
      : undefined,
  ].filter((fault) => fault !== undefined);
  return faults.length === 0 ? undefined : faults.join("; ");
}
