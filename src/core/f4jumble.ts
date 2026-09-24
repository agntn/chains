import { blake2b } from "./blake2b.js";

/**
 * The inverse of ZIP-316's F4Jumble, the four-round Feistel permutation a Unified Address is
 * scrambled with before Bech32m writes it. Only the inverse is here: a validator reads
 * addresses and never writes one.
 */

/** BLAKE2b's longest digest, ℓ_H in the ZIP. */
const HASH_LENGTH = 64;

/** The shortest input F4Jumble is defined for, and the longest, (2^16 + 1) · ℓ_H. */
export const F4JUMBLE_MIN = 38;
export const F4JUMBLE_MAX = (2 ** 16 + 1) * HASH_LENGTH;

const H_TAG = Array.from("UA_F4Jumble_H", (character) => character.codePointAt(0) ?? 0);
const G_TAG = Array.from("UA_F4Jumble_G", (character) => character.codePointAt(0) ?? 0);

/**
 * H_i: BLAKE2b under `UA_F4Jumble_H` and [i, 0, 0], as long as the left half.
 * @param {number} round - i, 0 or 1.
 * @param {ArrayLike<number>} input - Right half.
 * @param {number} length - Left half's length.
 * @returns {Uint8Array} The mask for the left half.
 */
function hashRound(round: number, input: ArrayLike<number>, length: number): Uint8Array {
  return blake2b(input, length, [...H_TAG, round, 0, 0]);
}

/**
 * G_i: 64-byte BLAKE2b blocks under `UA_F4Jumble_G`, i and the block counter little-endian,
 * cut to the right half's length.
 * @param {number} round - i, 0 or 1.
 * @param {ArrayLike<number>} input - Left half.
 * @param {number} length - Right half's length.
 * @returns {Uint8Array} The mask for the right half.
 */
function expandRound(round: number, input: ArrayLike<number>, length: number): Uint8Array {
  const output = new Uint8Array(Math.ceil(length / HASH_LENGTH) * HASH_LENGTH);
  for (let block = 0; block * HASH_LENGTH < length; block++) {
    const personal = [...G_TAG, round, block & 0xff, block >>> 8];
    output.set(blake2b(input, HASH_LENGTH, personal), block * HASH_LENGTH);
  }
  return output.subarray(0, length);
}

/**
 * XORs two byte strings of the same length.
 * @param {ArrayLike<number>} bytes - Input.
 * @param {ArrayLike<number>} mask - Mask.
 * @returns {Uint8Array} bytes ⊕ mask.
 */
function xor(bytes: ArrayLike<number>, mask: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(bytes.length);
  for (let index = 0; index < out.length; index++)
    out[index] = (bytes[index] ?? 0) ^ (mask[index] ?? 0);
  return out;
}

/**
 * Undoes F4Jumble on c || d: y = c ⊕ H_1(d), x = d ⊕ G_1(y), a = y ⊕ H_0(x), b = x ⊕ G_0(a).
 * @param {ArrayLike<number>} jumbled - The bytes Bech32m carried.
 * @returns {Uint8Array | undefined} a || b, the raw encoding with its padding, or undefined when
 * the length is outside what F4Jumble is defined for.
 */
export function f4jumbleInverse(jumbled: ArrayLike<number>): Uint8Array | undefined {
  if (jumbled.length < F4JUMBLE_MIN || jumbled.length > F4JUMBLE_MAX) return undefined;
  const leftLength = Math.min(HASH_LENGTH, Math.floor(jumbled.length / 2));
  const bytes = Uint8Array.from(jumbled);
  const c = bytes.subarray(0, leftLength);
  const d = bytes.subarray(leftLength);
  const y = xor(c, hashRound(1, d, leftLength));
  const x = xor(d, expandRound(1, y, d.length));
  const a = xor(y, hashRound(0, x, leftLength));
  const b = xor(x, expandRound(0, a, x.length));
  const message = new Uint8Array(jumbled.length);
  message.set(a);
  message.set(b, leftLength);
  return message;
}
