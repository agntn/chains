/** BLAKE-256 as the SHA-3 finalist submission writes it, for Decred's Base58Check checksum. */

type State = [number, number, number, number, number, number, number, number];
type Vector = [...State, ...State];
type Quarter = readonly [number, number, number, number];

/** The first 512 bits of the fractional part of pi, mixed into the message words and the counter. */
const CONSTANTS = [
  0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344, 0xa4093822, 0x299f31d0, 0x082efa98, 0xec4e6c89,
  0x452821e6, 0x38d01377, 0xbe5466cf, 0x34e90c6c, 0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5, 0xb5470917,
] as const;

/** SHA-256's initial value, which BLAKE-256 shares. */
const INITIAL: Readonly<State> = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

/**
 * The ten message permutations, which BLAKE2b takes over unchanged. Rounds eleven through
 * fourteen walk the first four again.
 */
export const PERMUTATIONS = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
] as const;

const ROUNDS = [...PERMUTATIONS, ...PERMUTATIONS.slice(0, 4)];

/** The four words each G call of a round mixes: the columns first, then the diagonals. */
const SLOTS = [
  [0, 4, 8, 12],
  [1, 5, 9, 13],
  [2, 6, 10, 14],
  [3, 7, 11, 15],
  [0, 5, 10, 15],
  [1, 6, 11, 12],
  [2, 7, 8, 13],
  [3, 4, 9, 14],
] as const;

function rotateRight(word: number, bits: number): number {
  return ((word >>> bits) | (word << (32 - bits))) >>> 0;
}

/**
 * The G function: mixes one message pair into four words of the working vector.
 * @param {Quarter} quarter - The four words before the call.
 * @param {number} x - First message word with its constant folded in.
 * @param {number} y - Second message word with its constant folded in.
 * @returns {Quarter} The four words after the call.
 */
function mix(quarter: Quarter, x: number, y: number): Quarter {
  let [a, b, c, d] = quarter;
  a = (a + b + x) >>> 0;
  d = rotateRight(d ^ a, 16);
  c = (c + d) >>> 0;
  b = rotateRight(b ^ c, 12);
  a = (a + b + y) >>> 0;
  d = rotateRight(d ^ a, 8);
  c = (c + d) >>> 0;
  b = rotateRight(b ^ c, 7);
  return [a, b, c, d];
}

/**
 * Runs the fourteen rounds over one block and folds the result into the state.
 * @param {Readonly<State>} state - Hash value before the block.
 * @param {readonly number[]} words - The block's sixteen 32-bit words.
 * @param {number} low - Low 32 bits of the message bits hashed through this block.
 * @param {number} high - High 32 bits of the same count.
 * @returns {State} Hash value after the block.
 */
function compress(
  state: Readonly<State>,
  words: readonly number[],
  low: number,
  high: number,
): State {
  const v: Vector = [
    ...state,
    CONSTANTS[0],
    CONSTANTS[1],
    CONSTANTS[2],
    CONSTANTS[3],
    (CONSTANTS[4] ^ low) >>> 0,
    (CONSTANTS[5] ^ low) >>> 0,
    (CONSTANTS[6] ^ high) >>> 0,
    (CONSTANTS[7] ^ high) >>> 0,
  ];
  for (const sigma of ROUNDS) {
    for (const [call, [a, b, c, d]] of SLOTS.entries()) {
      const i = sigma[2 * call] ?? 0;
      const j = sigma[2 * call + 1] ?? 0;
      const x = (words[i] ?? 0) ^ (CONSTANTS[j] ?? 0);
      const y = (words[j] ?? 0) ^ (CONSTANTS[i] ?? 0);
      [v[a], v[b], v[c], v[d]] = mix([v[a], v[b], v[c], v[d]], x, y);
    }
  }
  return [
    (state[0] ^ v[0] ^ v[8]) >>> 0,
    (state[1] ^ v[1] ^ v[9]) >>> 0,
    (state[2] ^ v[2] ^ v[10]) >>> 0,
    (state[3] ^ v[3] ^ v[11]) >>> 0,
    (state[4] ^ v[4] ^ v[12]) >>> 0,
    (state[5] ^ v[5] ^ v[13]) >>> 0,
    (state[6] ^ v[6] ^ v[14]) >>> 0,
    (state[7] ^ v[7] ^ v[15]) >>> 0,
  ];
}

/**
 * Hashes a message with BLAKE-256.
 *
 * Written out for the same reason `sha256.ts` is: the core imports nothing at runtime and
 * `assertAddress` answers on the spot. Decred's Base58Check takes this digest where Bitcoin's
 * takes SHA-256. The padding is SHA-256's closed by a set bit before the length, and a block
 * holding padding alone is hashed under a zero counter.
 *
 * @param {ArrayLike<number>} message - Bytes to hash.
 * @returns {Uint8Array} The 32-byte digest.
 */
export function blake256(message: ArrayLike<number>): Uint8Array {
  const padded = new Uint8Array(Math.ceil((message.length + 9) / 64) * 64);
  padded.set(message);
  const last = padded.length - 9;
  padded[message.length] = 0x80;
  padded[last] = last === message.length ? 0x81 : 0x01;
  const view = new DataView(padded.buffer);
  view.setBigUint64(padded.length - 8, BigInt(message.length) * 8n);

  let state: State = [...INITIAL];
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = Array.from({ length: 16 }, (_, t) => view.getUint32(offset + t * 4));
    const counted = offset < message.length ? Math.min(offset + 64, message.length) * 8 : 0;
    state = compress(state, words, counted >>> 0, Math.floor(counted / 2 ** 32));
  }

  const digest = new Uint8Array(32);
  const out = new DataView(digest.buffer);
  for (const [index, word] of state.entries()) out.setUint32(index * 4, word);
  return digest;
}
