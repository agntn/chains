/** Keccak-256 as the Keccak team submitted it, before FIPS 202 changed the padding: what Ethereum hashes with. */

/** The twenty-five 64-bit lanes of the state, indexed as x + 5y over the five-by-five grid. */
type Lanes = readonly bigint[];

/** Bytes absorbed per permutation: 1600 bits of state less twice the 256-bit digest. */
const RATE = 136;
const LANE_MASK = (1n << 64n) - 1n;

/** The twenty-four round constants, the LFSR output the reference `rc` function describes. */
const ROUND_CONSTANTS = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
] as const;

/** The rho rotation of each lane, in lane order. */
const ROTATIONS = [
  0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14,
] as const;

function rotateLeft(lane: bigint, bits: number): bigint {
  return ((lane << BigInt(bits)) | (lane >> BigInt(64 - bits))) & LANE_MASK;
}

function column(lanes: Lanes, x: number): bigint {
  return (
    (lanes[x] ?? 0n) ^
    (lanes[x + 5] ?? 0n) ^
    (lanes[x + 10] ?? 0n) ^
    (lanes[x + 15] ?? 0n) ^
    (lanes[x + 20] ?? 0n)
  );
}

/**
 * Theta: folds the parity of the two neighbouring columns into every lane.
 * @param {Lanes} lanes - The state before the step.
 * @returns {bigint[]} The state after it.
 */
function theta(lanes: Lanes): bigint[] {
  const parity = Array.from({ length: 5 }, (_, x) => column(lanes, x));
  return lanes.map((lane, index) => {
    const x = index % 5;
    return lane ^ (parity[(x + 4) % 5] ?? 0n) ^ rotateLeft(parity[(x + 1) % 5] ?? 0n, 1);
  });
}

/**
 * Rho and pi: rotates each lane by its offset and moves it to (y, 2x + 3y).
 * @param {Lanes} lanes - The state before the step.
 * @returns {bigint[]} The state after it.
 */
function rhoPi(lanes: Lanes): bigint[] {
  const moved = Array.from({ length: 25 }, () => 0n);
  for (const [index, lane] of lanes.entries()) {
    const x = index % 5;
    const y = (index - x) / 5;
    moved[y + 5 * ((2 * x + 3 * y) % 5)] = rotateLeft(lane, ROTATIONS[index] ?? 0);
  }
  return moved;
}

/**
 * Chi: the one non-linear step, each lane against the next two in its row.
 * @param {Lanes} lanes - The state before the step.
 * @returns {bigint[]} The state after it.
 */
function chi(lanes: Lanes): bigint[] {
  return lanes.map((lane, index) => {
    const row = index - (index % 5);
    const next = lanes[row + ((index + 1) % 5)] ?? 0n;
    const after = lanes[row + ((index + 2) % 5)] ?? 0n;
    return lane ^ (~next & after);
  });
}

/**
 * Keccak-f[1600]: twenty-four rounds of theta, rho, pi, chi and iota.
 * @param {Lanes} lanes - The state before the permutation.
 * @returns {bigint[]} The state after it.
 */
function permute(lanes: Lanes): bigint[] {
  let state = [...lanes];
  for (const constant of ROUND_CONSTANTS) {
    state = chi(rhoPi(theta(state)));
    state[0] = (state[0] ?? 0n) ^ constant;
  }
  return state;
}

/**
 * Hashes a message with Keccak-256.
 *
 * Written out for the same reason `sha256.ts` and `blake256.ts` are: the core imports nothing
 * at runtime and `assertAddress` answers on the spot. Web Crypto has no Keccak at all, and
 * its SHA3-256 is a different hash by one padding byte. EIP-55 reads the case of an EVM
 * address off this digest. The padding is Keccak's own, a set bit right after the message and
 * another closing the block; a message ending one byte short of the block gets both in one.
 *
 * @param {ArrayLike<number>} message - Bytes to hash.
 * @returns {Uint8Array} The 32-byte digest.
 */
export function keccak256(message: ArrayLike<number>): Uint8Array {
  const padded = new Uint8Array(Math.ceil((message.length + 1) / RATE) * RATE);
  padded.set(message);
  const last = padded.length - 1;
  padded[message.length] = 0x01;
  padded[last] = last === message.length ? 0x81 : 0x80;
  const view = new DataView(padded.buffer);

  let lanes: bigint[] = Array.from({ length: 25 }, () => 0n);
  for (let offset = 0; offset < padded.length; offset += RATE) {
    for (let index = 0; index < RATE / 8; index++) {
      lanes[index] = (lanes[index] ?? 0n) ^ view.getBigUint64(offset + index * 8, true);
    }
    lanes = permute(lanes);
  }

  const digest = new Uint8Array(32);
  const out = new DataView(digest.buffer);
  for (let index = 0; index < 4; index++) out.setBigUint64(index * 8, lanes[index] ?? 0n, true);
  return digest;
}
