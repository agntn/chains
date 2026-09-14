/** SHA-256 as FIPS 180-4 writes it, for the Base58Check checksum. */

type State = [number, number, number, number, number, number, number, number];

/** The first 32 bits of the fractional parts of the cube roots of the first 64 primes. */
const ROUNDS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

/** The first 32 bits of the fractional parts of the square roots of the first 8 primes. */
const INITIAL: Readonly<State> = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

function rotateRight(word: number, bits: number): number {
  return (word >>> bits) | (word << (32 - bits));
}

/**
 * Extends the sixteen words of one block to the sixty-four the rounds read.
 * @param {ArrayLike<number>} head - The block's sixteen 32-bit words.
 * @returns {Uint32Array} The full message schedule.
 */
function schedule(head: ArrayLike<number>): Uint32Array {
  const words = new Uint32Array(64);
  words.set(head);
  for (let t = 16; t < 64; t++) {
    const near = words[t - 2] ?? 0;
    const far = words[t - 15] ?? 0;
    const sigma1 = rotateRight(near, 17) ^ rotateRight(near, 19) ^ (near >>> 10);
    const sigma0 = rotateRight(far, 7) ^ rotateRight(far, 18) ^ (far >>> 3);
    words[t] = (words[t - 16] ?? 0) + sigma0 + (words[t - 7] ?? 0) + sigma1;
  }
  return words;
}

/**
 * Runs the sixty-four rounds over one block and folds the result into the state.
 * @param {Readonly<State>} state - Hash value before the block.
 * @param {ArrayLike<number>} words - The block's message schedule.
 * @returns {State} Hash value after the block.
 */
function compress(state: Readonly<State>, words: ArrayLike<number>): State {
  let [a, b, c, d, e, f, g, h] = state;
  for (const [t, constant] of ROUNDS.entries()) {
    const choice = (e & f) ^ (~e & g);
    const majority = (a & b) ^ (a & c) ^ (b & c);
    const t1 =
      h +
      (rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)) +
      choice +
      constant +
      (words[t] ?? 0);
    const t2 = (rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)) + majority;
    [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
  }
  return [
    (state[0] + a) >>> 0,
    (state[1] + b) >>> 0,
    (state[2] + c) >>> 0,
    (state[3] + d) >>> 0,
    (state[4] + e) >>> 0,
    (state[5] + f) >>> 0,
    (state[6] + g) >>> 0,
    (state[7] + h) >>> 0,
  ];
}

/**
 * Hashes a message with SHA-256.
 *
 * Written out rather than imported: the core imports nothing at runtime, which is what lets
 * the validators run in a browser, and the Web Crypto digest is asynchronous while
 * `assertAddress` answers on the spot. Base58Check hashes a few dozen bytes, so this follows
 * FIPS 180-4 and makes no attempt at speed.
 *
 * @param {ArrayLike<number>} message - Bytes to hash.
 * @returns {Uint8Array} The 32-byte digest.
 */
export function sha256(message: ArrayLike<number>): Uint8Array {
  const padded = new Uint8Array(Math.ceil((message.length + 9) / 64) * 64);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setBigUint64(padded.length - 8, BigInt(message.length) * 8n);

  let state: State = [...INITIAL];
  for (let offset = 0; offset < padded.length; offset += 64) {
    const head = Array.from({ length: 16 }, (_, t) => view.getUint32(offset + t * 4));
    state = compress(state, schedule(head));
  }

  const digest = new Uint8Array(32);
  const out = new DataView(digest.buffer);
  for (const [index, word] of state.entries()) out.setUint32(index * 4, word);
  return digest;
}
