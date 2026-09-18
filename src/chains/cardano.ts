import { decodeBase58 } from "../core/base58.js";
import { BECH32, bech32Digits, bytesFromDigits, polymod } from "../core/bech32.js";
import { UTXO } from "../core/chain.js";
import { crc32 } from "../core/crc32.js";
import { InvalidAddressError } from "../core/errors.js";

type Prefix = "addr" | "stake";

const HASH_LENGTH = 28;
/** A base address is 57 bytes, 92 digits and the checksum; a stake address 29 bytes, 47 and the checksum. */
const MAX_DIGITS: Readonly<Record<Prefix, number>> = { addr: 98, stake: 53 };
const MAINNET = 1;
/** The ledger reads a 32-bit slot over at most five bytes and 16-bit indexes over three. */
const POINTER_COORDINATES = [
  [5, 2 ** 32],
  [3, 2 ** 16],
  [3, 2 ** 16],
] as const;

/** CIP-19 header types: two credentials, one and a pointer, one alone, and the stake credential. */
const SHELLEY_TYPES: Readonly<
  Partial<Record<number, { readonly hrp: Prefix; readonly payload: number | "pointer" }>>
> = {
  0: { hrp: "addr", payload: 2 * HASH_LENGTH },
  1: { hrp: "addr", payload: 2 * HASH_LENGTH },
  2: { hrp: "addr", payload: 2 * HASH_LENGTH },
  3: { hrp: "addr", payload: 2 * HASH_LENGTH },
  4: { hrp: "addr", payload: "pointer" },
  5: { hrp: "addr", payload: "pointer" },
  6: { hrp: "addr", payload: HASH_LENGTH },
  7: { hrp: "addr", payload: HASH_LENGTH },
  14: { hrp: "stake", payload: HASH_LENGTH },
  15: { hrp: "stake", payload: HASH_LENGTH },
};

/** An array of two, then tag 24 over the byte string that carries the payload. */
const BYRON_ENVELOPE_PREFIX = [0x82, 0xd8, 0x18] as const;
/** The payload is an array of three: the root, the attributes and the type. */
const BYRON_PAYLOAD_OPENER = 0x83;
/** CBOR major types the payload is written with. */
const UNSIGNED = 0;
const BYTES = 2;
const MAP = 5;
/** The attribute the ledger reads as a testnet magic; a mainnet address never carries it. */
const NETWORK_MAGIC_ATTRIBUTE = 2;
/** The types the ledger decodes: a verification key and a redeem key. */
const BYRON_TYPES: readonly number[] = [0, 2];
/** Bytes a CBOR argument takes after the head for the minor values that carry one. */
const ARGUMENT_WIDTHS: Readonly<Partial<Record<number, number>>> = { 24: 1, 25: 2, 26: 4 };

/** One CBOR head: the major type, its argument and how many bytes the head took. */
interface CborHead {
  readonly major: number;
  readonly value: number;
  readonly length: number;
}

function hasBytesAt(decoded: ArrayLike<number>, expected: readonly number[]): boolean {
  return expected.every((byte, index) => decoded[index] === byte);
}

/**
 * Reads one CBOR head with an argument of up to four bytes, or nothing where the bytes
 * run out or the head is indefinite or wider than that.
 *
 * @param {ArrayLike<number>} bytes - CBOR bytes.
 * @param {number} offset - Where the head starts.
 * @returns {CborHead | undefined} The head, or undefined.
 */
function cborHead(bytes: ArrayLike<number>, offset: number): CborHead | undefined {
  const initial = bytes[offset];
  if (initial === undefined) return undefined;
  const major = initial >> 5;
  const minor = initial & 0x1f;
  if (minor < 24) return { major, value: minor, length: 1 };
  const width = ARGUMENT_WIDTHS[minor];
  if (width === undefined || offset + width >= bytes.length) return undefined;
  let value = 0;
  for (let index = 1; index <= width; index++) value = value * 256 + (bytes[offset + index] ?? 0);
  return { major, value, length: 1 + width };
}

/**
 * The head at an offset when it is of the wanted major type, or nothing.
 *
 * @param {ArrayLike<number>} bytes - CBOR bytes.
 * @param {number} offset - Where the head starts.
 * @param {number} major - The major type the head has to be.
 * @returns {CborHead | undefined} The head, or undefined.
 */
function headOf(bytes: ArrayLike<number>, offset: number, major: number): CborHead | undefined {
  const head = cborHead(bytes, offset);
  return head?.major === major ? head : undefined;
}

/**
 * The payload behind the envelope as the ledger's `decodeCrcProtected` reads it: an array
 * of two, tag 24 over a byte string, then a CRC-32 that has to be the byte string's, with
 * nothing after it.
 *
 * @param {string} address - Candidate Byron address.
 * @returns {Uint8Array | undefined} The payload, or undefined when the checksum does not hold.
 */
function byronPayload(address: string): Uint8Array | undefined {
  const decoded = decodeBase58(address, 128);
  if (decoded === undefined || !hasBytesAt(decoded, BYRON_ENVELOPE_PREFIX)) return undefined;
  const wrapper = headOf(decoded, BYRON_ENVELOPE_PREFIX.length, BYTES);
  if (wrapper === undefined) return undefined;
  const start = BYRON_ENVELOPE_PREFIX.length + wrapper.length;
  const end = start + wrapper.value;
  const checksum = headOf(decoded, end, UNSIGNED);
  if (checksum === undefined || end + checksum.length !== decoded.length) return undefined;
  const payload = decoded.subarray(start, end);
  return checksum.value === crc32(payload) ? payload : undefined;
}

/**
 * Walks the attribute map as the ledger decodes it, byte strings under ascending Word8
 * keys it keeps unparsed unless it knows them, and stops at a network magic, which only
 * a test network writes.
 *
 * @param {ArrayLike<number>} payload - Payload bytes.
 * @param {number} offset - Where the map head starts.
 * @returns {number | undefined} The offset after the map, or undefined.
 */
function skipMainnetAttributes(payload: ArrayLike<number>, offset: number): number | undefined {
  const map = headOf(payload, offset, MAP);
  if (map === undefined) return undefined;
  let next = offset + map.length;
  let previous = -1;
  for (let entry = 0; entry < map.value; entry++) {
    const key = headOf(payload, next, UNSIGNED);
    const value = key && headOf(payload, next + key.length, BYTES);
    if (key === undefined || value === undefined || key.value <= previous || key.value > 0xff) {
      return undefined;
    }
    if (key.value === NETWORK_MAGIC_ATTRIBUTE) return undefined;
    previous = key.value;
    next += key.length + value.length + value.value;
  }
  return next;
}

/**
 * The payload as the ledger decodes it: the 28-byte root, the attributes and a type it
 * knows, ending where the bytes end.
 *
 * @param {ArrayLike<number>} payload - Bytes behind a checksum that holds.
 * @returns {boolean} Whether the payload is a mainnet Byron address.
 */
function isMainnetByronPayload(payload: ArrayLike<number>): boolean {
  if (payload[0] !== BYRON_PAYLOAD_OPENER) return false;
  const root = headOf(payload, 1, BYTES);
  if (root === undefined || root.value !== HASH_LENGTH) return false;
  const typeOffset = skipMainnetAttributes(payload, 1 + root.length + HASH_LENGTH);
  if (typeOffset === undefined) return false;
  const type = headOf(payload, typeOffset, UNSIGNED);
  return (
    type !== undefined &&
    BYRON_TYPES.includes(type.value) &&
    typeOffset + type.length === payload.length
  );
}

/**
 * The checksum has to hold and the payload behind it has to be a mainnet address.
 *
 * @param {string} address - Candidate Byron address.
 * @returns {boolean} Whether the address is one the mainnet ledger accepts.
 */
function validByronAddress(address: string): boolean {
  const payload = byronPayload(address);
  return payload !== undefined && isMainnetByronPayload(payload);
}

/**
 * Three pointer coordinates, seven bits a byte with the high bit carrying on, as the ledger
 * decodes them since Babbage: within their widths and with nothing left after the last one.
 *
 * @param {ArrayLike<number>} bytes - Payload bytes after the payment credential.
 * @returns {boolean} Whether the bytes are exactly one well-formed pointer.
 */
function validPointer(bytes: ArrayLike<number>): boolean {
  let offset = 0;
  for (const [width, limit] of POINTER_COORDINATES) {
    let value = 0;
    let length = 0;
    let byte: number | undefined;
    do {
      byte = bytes[offset++];
      if (byte === undefined || ++length > width) return false;
      value = value * 128 + (byte & 0x7f);
    } while (byte & 0x80);
    if (value >= limit) return false;
  }
  return offset === bytes.length;
}

/**
 * The bytes behind a Bech32 checksum that holds under the prefix.
 *
 * @param {string} address - Candidate Shelley or stake address.
 * @param {Prefix} hrp - Prefix the address opens with.
 * @returns {Uint8Array | undefined} Header and payload, or invalid input.
 */
function shelleyBytes(address: string, hrp: Prefix): Uint8Array | undefined {
  const digits = bech32Digits(address, hrp, MAX_DIGITS[hrp]);
  if (digits === undefined || polymod(hrp, digits) !== BECH32) return undefined;
  return bytesFromDigits(digits.slice(0, -6));
}

/**
 * Header and payload as CIP-19 lays them out: the network tag has to be mainnet's, the type
 * has to be one written under the prefix, and the payload has to be what the type carries.
 *
 * @param {string} address - Candidate Shelley or stake address.
 * @returns {boolean} Whether the checksum holds and the bytes behind it fit the header.
 */
function validShelleyAddress(address: string): boolean {
  const hrp = /^stake1/i.test(address) ? "stake" : "addr";
  const bytes = shelleyBytes(address, hrp);
  const header = bytes?.[0];
  if (bytes === undefined || header === undefined || (header & 0x0f) !== MAINNET) return false;
  const layout = SHELLEY_TYPES[header >> 4];
  if (layout === undefined || layout.hrp !== hrp) return false;
  const payload = bytes.subarray(1);
  if (layout.payload === "pointer") return validPointer(payload.subarray(HASH_LENGTH));
  return payload.length === layout.payload;
}

export class Cardano extends UTXO {
  static readonly key = "cardano" as const;
  readonly name = "Cardano";
  readonly symbol = "ADA";
  override readonly decimals = 6;
  readonly explorer = "https://cardanoscan.io";
  readonly bip44 = 1815;
  readonly caip2 = "cip34:1-764824073";

  /**
   * Shelley and stake addresses decode: the Bech32 checksum under `addr` or `stake`, then
   * CIP-19's header, so the network tag has to be mainnet's, the type has to fit the prefix
   * and the payload the type. Byron addresses decode the way the ledger reads them: the
   * CRC-32 has to be the payload's, the payload has to be the root, the attributes and a
   * known type, and a network magic among the attributes makes it a testnet address.
   *
   * @param {string} address - Candidate Cardano address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    if (!validByronAddress(address) && !validShelleyAddress(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
