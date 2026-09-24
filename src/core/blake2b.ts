import { PERMUTATIONS } from "./blake256.js";

/**
 * BLAKE2b as RFC 7693 writes it, with the personalization field that Zcash's F4Jumble hashes
 * under. Written out because the core imports nothing at runtime.
 *
 * Each 64-bit word is two 32-bit halves, low half first. BigInt would read closer to the RFC
 * but runs several times slower, and a Unified Address may carry megabytes to hash.
 */

/** SHA-512's initial value, which BLAKE2b shares, as low and high halves. */
const INITIAL = [
  0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372, 0x5f1d36f1, 0xa54ff53a,
  0xade682d1, 0x510e527f, 0x2b3e6c1f, 0x9b05688c, 0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19,
] as const;

/** Twelve rounds: BLAKE's ten permutations, then the first two again. */
const ROUNDS = [...PERMUTATIONS, ...PERMUTATIONS.slice(0, 2)];

/** The four words each G call mixes, columns first and diagonals after, as half indices. */
const SLOTS = [
  [0, 8, 16, 24],
  [2, 10, 18, 26],
  [4, 12, 20, 28],
  [6, 14, 22, 30],
  [0, 10, 20, 30],
  [2, 12, 22, 24],
  [4, 14, 16, 26],
  [6, 8, 18, 28],
] as const;

const BLOCK = 128;

/**
 * Reads a block as 32 little-endian halves, zero past the end of the message, and one more
 * zero word after them: G adds it where the RFC adds no message word, which keeps every read
 * in bounds.
 * @param {ArrayLike<number>} message - Whole message.
 * @param {number} offset - First byte of the block.
 * @returns {Uint32Array} The sixteen message words as 32 halves, then the zero word.
 */
function readBlock(message: ArrayLike<number>, offset: number): Uint32Array {
  const words = new Uint32Array(34);
  const end = Math.min(BLOCK, message.length - offset);
  for (let index = 0; index < end; index += 4) {
    const at = offset + index;
    words[index >> 2] =
      (message[at] ?? 0) |
      ((message[at + 1] ?? 0) << 8) |
      ((message[at + 2] ?? 0) << 16) |
      ((message[at + 3] ?? 0) << 24);
  }
  return words;
}

/**
 * Lays out the working vector: the chaining value, then the initial value with the byte counter
 * and, on the final block, the last-block flag folded in.
 * @param {ArrayLike<number>} state - Chaining value, sixteen halves.
 * @param {number} counter - Bytes hashed so far, this block included.
 * @param {boolean} last - Whether this is the final block.
 * @returns {Uint32Array} The 32 halves the rounds work on.
 */
function workingVector(state: ArrayLike<number>, counter: number, last: boolean): Uint32Array {
  const v = new Uint32Array(32);
  v.set(state);
  v.set(INITIAL, 16);
  v[24] = (v[24] ?? 0) ^ counter;
  v[25] = (v[25] ?? 0) ^ Math.floor(counter / 0x100000000);
  if (last) {
    v[28] = ~(v[28] ?? 0);
    v[29] = ~(v[29] ?? 0);
  }
  return v;
}

/**
 * Runs the twelve rounds over one block and folds the result into the chaining value.
 * @param {ArrayLike<number>} state - Chaining value before the block, sixteen halves.
 * @param {ArrayLike<number>} m - The block's message words, 32 halves.
 * @param {number} counter - Bytes hashed so far, this block included.
 * @param {boolean} last - Whether this is the final block.
 * @returns {Uint32Array} Chaining value after the block.
 */
function compress(
  state: ArrayLike<number>,
  m: ArrayLike<number>,
  counter: number,
  last: boolean,
): Uint32Array {
  const v = workingVector(state, counter, last);

  /**
   * v[a] += v[b], plus the message word at x when there is one, carrying into the high half.
   * @param {number} a - Half index of the word that takes the sum.
   * @param {number} b - Half index of the word added.
   * @param {number} [x] - Half index of the message word added, the zero word by default.
   */
  const add = (a: number, b: number, x = 32) => {
    const low = (v[a] ?? 0) + (v[b] ?? 0) + (m[x] ?? 0);
    v[a] = low;
    v[a + 1] = (v[a + 1] ?? 0) + (v[b + 1] ?? 0) + (m[x + 1] ?? 0) + Math.floor(low / 0x100000000);
  };
  /**
   * v[a] = (v[a] ^ v[b]) rotated right.
   * @param {number} a - Half index of the word that takes the result.
   * @param {number} b - Half index of the other operand.
   * @param {number} bits - Rotation: 32, 24, 16 or 63.
   */
  const rotate = (a: number, b: number, bits: number) => {
    const x = (v[a] ?? 0) ^ (v[b] ?? 0);
    const y = (v[a + 1] ?? 0) ^ (v[b + 1] ?? 0);
    const low = bits >= 32 ? y : x;
    const high = bits >= 32 ? x : y;
    const shift = bits % 32;
    v[a] = shift === 0 ? low : (low >>> shift) | (high << (32 - shift));
    v[a + 1] = shift === 0 ? high : (high >>> shift) | (low << (32 - shift));
  };

  for (const permutation of ROUNDS) {
    for (let call = 0; call < 8; call++) {
      const [a, b, c, d] = SLOTS[call] ?? SLOTS[0];
      add(a, b, (permutation[2 * call] ?? 0) * 2);
      rotate(d, a, 32);
      add(c, d);
      rotate(b, c, 24);
      add(a, b, (permutation[2 * call + 1] ?? 0) * 2);
      rotate(d, a, 16);
      add(c, d);
      rotate(b, c, 63);
    }
  }
  return fold(state, v);
}

/**
 * Folds both halves of the working vector into the chaining value.
 * @param {ArrayLike<number>} state - Chaining value before the block.
 * @param {ArrayLike<number>} v - Working vector after the rounds.
 * @returns {Uint32Array} Chaining value after the block.
 */
function fold(state: ArrayLike<number>, v: ArrayLike<number>): Uint32Array {
  const next = new Uint32Array(16);
  for (let index = 0; index < 16; index++) {
    next[index] = (state[index] ?? 0) ^ (v[index] ?? 0) ^ (v[index + 16] ?? 0);
  }
  return next;
}

/**
 * The initial value with the parameter block folded in: digest length, no key, fanout and depth
 * 1, and the personalization in the last sixteen bytes.
 * @param {number} outLength - Digest length in bytes.
 * @param {ArrayLike<number>} personal - Personalization bytes.
 * @returns {Uint32Array} The first chaining value.
 */
function initialState(outLength: number, personal: ArrayLike<number>): Uint32Array {
  const parameters = readBlock([outLength, 0, 1, 1], 0);
  const personalization = readBlock(personal, 0);
  const state = new Uint32Array(INITIAL);
  for (let index = 0; index < 16; index++) {
    const personalWord = index >= 12 ? (personalization[index - 12] ?? 0) : 0;
    state[index] = (state[index] ?? 0) ^ (parameters[index] ?? 0) ^ personalWord;
  }
  return state;
}

/**
 * Hashes a message with BLAKE2b, unkeyed and without a salt.
 * @param {ArrayLike<number>} message - Bytes to hash.
 * @param {number} [outLength] - Digest length in bytes, 1 to 64.
 * @param {ArrayLike<number>} [personal] - Personalization, up to 16 bytes, zero-padded.
 * @returns {Uint8Array} The digest.
 */
export function blake2b(
  message: ArrayLike<number>,
  outLength = 64,
  personal: ArrayLike<number> = [],
): Uint8Array {
  let state = initialState(outLength, personal);
  let offset = 0;
  while (message.length - offset > BLOCK) {
    state = compress(state, readBlock(message, offset), offset + BLOCK, false);
    offset += BLOCK;
  }
  state = compress(state, readBlock(message, offset), message.length, true);
  const digest = new Uint8Array(outLength);
  for (let index = 0; index < outLength; index++) {
    digest[index] = (state[index >> 2] ?? 0) >>> ((index & 3) * 8);
  }
  return digest;
}
