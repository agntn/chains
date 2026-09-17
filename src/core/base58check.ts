import { decodeBase58 } from "./base58.js";
import { sha256 } from "./sha256.js";

type Digest = (message: ArrayLike<number>) => Uint8Array;

/**
 * Decodes Base58Check, or undefined when the input is not base58 or its checksum does not hold.
 *
 * The bytes come back whole, checksum included, so callers keep counting in the widths the
 * formats are described in: 25 for a legacy Bitcoin address, 35 for an X-address. The digest
 * is an argument because Decred took Bitcoin's encoding with BLAKE-256 in place of SHA-256.
 *
 * @param {string} input - Base58Check text to decode.
 * @param {number} maxLength - Maximum accepted character count.
 * @param {string} [alphabet] - Ordered 58-character alphabet, Bitcoin's by default.
 * @param {Digest} [digest] - Hash behind the checksum, SHA-256 by default.
 * @returns {Uint8Array | undefined} Decoded bytes, or undefined for invalid input.
 */
export function decodeBase58Check(
  input: string,
  maxLength: number,
  alphabet?: string,
  digest: Digest = sha256,
): Uint8Array | undefined {
  const bytes = decodeBase58(input, maxLength, alphabet);
  if (bytes === undefined || bytes.length < 4) return undefined;
  const checksum = digest(digest(bytes.subarray(0, -4)));
  for (let index = 0; index < 4; index++) {
    if (bytes[bytes.length - 4 + index] !== checksum[index]) return undefined;
  }
  return bytes;
}
