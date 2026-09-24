import { decodeBase58Check } from "../core/base58check.js";
import { BECH32, BECH32M, bech32Digits, bytesFromDigits, polymod } from "../core/bech32.js";
import { UTXO } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { F4JUMBLE_MAX, f4jumbleInverse } from "../core/f4jumble.js";

/** Most digits a Unified Address can carry: F4Jumble's longest input, then the checksum. */
const UNIFIED_DIGITS = Math.ceil((F4JUMBLE_MAX * 8) / 5) + 6;

/** The largest typecode or length a CompactSize may hold in a Unified Address. */
const MAX_COMPACT_SIZE = 0x2000000;

/** Receiver lengths ZIP-316 fixes: P2PKH, P2SH, Sapling, Orchard. */
const RECEIVER_LENGTHS: readonly number[] = [20, 20, 43, 43];

/** The long CompactSize forms: flag, bytes after it, and the smallest value each may carry. */
const LONG_FORMS = new Map([
  [0xfd, { width: 2, shortest: 0xfd }],
  [0xfe, { width: 4, shortest: 0x10000 }],
  [0xff, { width: 8, shortest: 0x100000000 }],
]);

interface Item {
  readonly typecode: number;
  readonly length: number;
}

/**
 * Reads an unsigned little-endian integer.
 * @param {ArrayLike<number>} bytes - Source.
 * @param {number} start - First byte.
 * @param {number} end - One past the last byte.
 * @returns {number} The value; past 2^53 it loses precision, far above anything accepted.
 */
function readLittleEndian(bytes: ArrayLike<number>, start: number, end: number): number {
  let value = 0;
  for (let index = end - 1; index >= start; index--) value = value * 256 + (bytes[index] ?? 0);
  return value;
}

/**
 * Reads a canonical CompactSize the way `zcash_encoding` does: the shortest form only, and
 * nothing above the limit.
 * @param {ArrayLike<number>} bytes - Raw encoding.
 * @param {number} offset - Where the value starts.
 * @returns {readonly [number, number] | undefined} The value and the offset after it.
 */
function readCompactSize(
  bytes: ArrayLike<number>,
  offset: number,
): readonly [number, number] | undefined {
  const flag = bytes[offset] ?? 0x100;
  const form = LONG_FORMS.get(flag);
  if (!form) return flag < 0xfd ? [flag, offset + 1] : undefined;
  const end = offset + 1 + form.width;
  if (end > bytes.length) return undefined;
  const value = readLittleEndian(bytes, offset + 1, end);
  return value < form.shortest || value > MAX_COMPACT_SIZE ? undefined : [value, end];
}

/**
 * Splits a raw encoding into its items, or undefined when an item runs past the end.
 * @param {ArrayLike<number>} raw - Raw encoding without the padding.
 * @returns {Item[] | undefined} Typecode and length of every item, in order.
 */
function readItems(raw: ArrayLike<number>): Item[] | undefined {
  const items: Item[] = [];
  let offset = 0;
  while (offset < raw.length) {
    const typecode = readCompactSize(raw, offset);
    const length = typecode && readCompactSize(raw, typecode[1]);
    if (!typecode || !length || length[1] + length[0] > raw.length) return undefined;
    items.push({ typecode: typecode[0], length: length[0] });
    offset = length[1] + length[0];
  }
  return items;
}

/**
 * One item against ZIP-316's per-item rules for Revision 0.
 * @param {Item} item - The item.
 * @param {number} previous - The typecode before it, -1 for the first.
 * @returns {boolean} Whether it may stand where it stands.
 */
function validItem({ typecode, length }: Item, previous: number): boolean {
  if (typecode <= previous) return false;
  if (typecode === 1 && previous === 0) return false;
  if (typecode >= 0xe0 && typecode <= 0xfc) return false;
  return typecode > 3 || length === RECEIVER_LENGTHS[typecode];
}

/**
 * Undoes the Bech32m and F4Jumble layers and cuts the padding.
 * @param {string} address - Candidate address.
 * @returns {Uint8Array | undefined} The raw encoding, or undefined when a layer does not hold.
 */
function unwrapUnified(address: string): Uint8Array | undefined {
  const data = bech32Digits(address, "u", UNIFIED_DIGITS);
  if (data === undefined || polymod("u", data) !== BECH32M) return undefined;
  const jumbled = bytesFromDigits(data.slice(0, -6));
  const padded = jumbled && f4jumbleInverse(jumbled);
  if (!padded) return undefined;
  const padding = padded.subarray(-16);
  if (padding[0] !== 0x75 || padding.subarray(1).some((byte) => byte !== 0)) return undefined;
  return padded.subarray(0, -16);
}

/**
 * Parses a Revision 0 Unified Address the way ZIP-316 tells a consumer to: Bech32m under `u`,
 * F4Jumble undone, the padding checked and cut, then every item read. Items come in ascending
 * typecode order without repeats, the four known receivers have their fixed lengths, P2PKH and
 * P2SH never share an address, MUST-understand metadata (0xE0 to 0xFC) is refused, and at
 * least one item is neither transparent nor metadata. Unknown typecodes pass, as the ZIP
 * requires for forward compatibility. The curve points inside a Sapling or Orchard receiver are
 * not decompressed.
 * @param {string} address - Candidate address.
 * @returns {boolean} Whether it spells a mainnet Unified Address.
 */
function validUnifiedAddress(address: string): boolean {
  const raw = unwrapUnified(address);
  const items = raw && readItems(raw);
  if (!items) return false;
  const ordered = items.every((item, index) => validItem(item, items[index - 1]?.typecode ?? -1));
  const shielded = items.some(
    ({ typecode }) => typecode > 1 && (typecode < 0xc0 || typecode > 0xdf),
  );
  return ordered && shielded;
}

/**
 * Reads a Bech32 or Bech32m address under a fixed prefix whose payload has a fixed length.
 * @param {string} address - Candidate address.
 * @param {string} hrp - Human-readable part.
 * @param {number} residue - `BECH32` or `BECH32M`.
 * @param {number} length - Payload bytes.
 * @returns {boolean} Whether the checksum holds and the payload has that length.
 */
function validFixedBech32(address: string, hrp: string, residue: number, length: number): boolean {
  const data = bech32Digits(address, hrp, Math.ceil((length * 8) / 5) + 6);
  if (data === undefined || polymod(hrp, data) !== residue) return false;
  return bytesFromDigits(data.slice(0, -6))?.length === length;
}

/** Zcash mainnet, read the way `zcash_address` parses a string. */
export class Zcash extends UTXO {
  static readonly key = "zcash" as const;
  readonly name = "Zcash";
  readonly symbol = "ZEC";
  override readonly decimals = 8;
  readonly explorer = "https://blockchair.com/zcash";
  readonly bip44 = 133;
  readonly caip2 = "bip122:00040fe8ec8471911baa1db1266ea15d";

  /**
   * Transparent `t1...` and `t3...` are Base58Check under the two-byte versions 0x1cb8 and
   * 0x1cbd. Sapling `zs1...` is Bech32 over 43 bytes, a ZIP-320 `tex1...` is Bech32m over a
   * 20-byte key hash, and a Unified Address `u1...` is checked as ZIP-316 Revision 0 describes.
   * Sprout `zc...` stays out: ZIP 211 closed the Sprout pool to new value at Canopy, so nothing
   * can pay one.
   *
   * @param {string} address - Candidate Zcash address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58Check(address, 35);
    const transparent =
      decoded?.length === 26 && decoded[0] === 0x1c && (decoded[1] === 0xb8 || decoded[1] === 0xbd);
    if (
      !transparent &&
      !validFixedBech32(address, "zs", BECH32, 43) &&
      !validFixedBech32(address, "tex", BECH32M, 20) &&
      !validUnifiedAddress(address)
    ) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
