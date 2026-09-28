/** Where a chain's hex txid rule departs from 64 bare hex digits in either case. */
export interface HexTxidShape {
  /** `0x` in front, as every EVM chain and Aptos write it. */
  readonly prefixed?: boolean;
  /** Lowercase only, because the chain's own reader refuses anything else. */
  readonly lowercase?: boolean;
}

const HEX = /^[0-9a-fA-F]*$/;

/**
 * The `0x` rule alone.
 *
 * @param {boolean} hasPrefix - Whether the txid starts with `0x`.
 * @param {boolean} prefixed - Whether the chain writes one.
 * @returns {string | undefined} The fault, or undefined when the two agree.
 */
function prefixFault(hasPrefix: boolean, prefixed: boolean): string | undefined {
  if (hasPrefix === prefixed) return undefined;
  return hasPrefix
    ? "0x in front, which this chain's txids never carry"
    : "no 0x in front of the hex digits";
}

/**
 * The digit count alone.
 *
 * @param {string} digits - The hex digits after any `0x`.
 * @param {boolean} hasPrefix - Whether a `0x` came before them.
 * @returns {string | undefined} The fault, or undefined for 64 digits.
 */
function lengthFault(digits: string, hasPrefix: boolean): string | undefined {
  if (digits.length === 64) return undefined;
  return `${digits.length} hex digits${hasPrefix ? " after 0x" : ""}, not 64`;
}

/**
 * Checks a transaction id written as 32 bytes of hex and says what is wrong with it.
 *
 * One call decides both, so the answer and its reason can't disagree. Every fault
 * the string has is named at once: a model fixing only the first one would send
 * the string back and learn about the second on the next call.
 *
 * @param {string} txid - Candidate transaction id.
 * @param {Readonly<HexTxidShape>} shape - The chain's prefix and case rule.
 * @returns {string | undefined} The rules the txid breaks, or undefined when it holds.
 */
export function hexTxidFault(txid: string, shape: Readonly<HexTxidShape> = {}): string | undefined {
  const hasPrefix = txid.startsWith("0x");
  const digits = hasPrefix ? txid.slice(2) : txid;
  if (!HEX.test(digits)) {
    return shape.prefixed ? "not 0x followed by 64 hex digits" : "not 64 hex digits";
  }
  const faults = [
    prefixFault(hasPrefix, shape.prefixed === true),
    lengthFault(digits, hasPrefix),
    shape.lowercase && digits !== digits.toLowerCase()
      ? "uppercase hex digits, and this chain reads lowercase only"
      : undefined,
  ].filter((fault) => fault !== undefined);
  return faults.length === 0 ? undefined : faults.join("; ");
}
