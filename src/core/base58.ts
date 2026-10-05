import { base58, type Base58Alphabet } from "@agntn/encodings/base58";

/** One base58 digit. Bitcoin's alphabet and the XRP Ledger's order the same 58 characters. */
export const BASE58_DIGIT = /^[1-9A-HJ-NP-Za-km-z]$/;

const BASE58_TEXT = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * Decodes a base58 string to its bytes, or undefined when the input is not
 * base58 or longer than maxLength.
 *
 * Character count does not determine byte count: base58 writes every leading zero
 * byte as "1", so a 32-byte key runs anywhere from 32 characters (Solana's System
 * Program, all zeroes) to 44. A chain that needs to know how many bytes an address
 * carries has to decode it.
 *
 * The alphabet is a parameter because base58 is an ordering, not one encoding: read
 * an XRP Ledger address off Bitcoin's ordering and the bytes come back wrong rather
 * than rejected.
 *
 * The bound is required because decoding is quadratic: every character grows the
 * number the next multiply has to walk, and a 100k-character string ties the
 * process up for seconds. An address format knows its maximum length, so the
 * caller states it and oversized input is rejected before any work. So is a character
 * outside the 58 digits, which then costs no exception.
 *
 * @param {string} input - Base58 text to decode.
 * @param {number} maxLength - Maximum accepted character count.
 * @param {Base58Alphabet} alphabet - `bitcoin`, or `ripple` for the XRP Ledger.
 * @returns {Uint8Array | undefined} Decoded bytes, or undefined for invalid input.
 */
export function decodeBase58(
  input: string,
  maxLength: number,
  alphabet: Base58Alphabet = "bitcoin",
): Uint8Array | undefined {
  if (input.length > maxLength || !BASE58_TEXT.test(input)) return undefined;
  try {
    return base58.decode(input, { alphabet });
  } catch {
    return undefined;
  }
}
