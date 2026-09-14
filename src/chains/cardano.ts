import { decodeBase58 } from "../core/base58.js";
import { BECH32, bech32Digits, bytesFromDigits, polymod } from "../core/bech32.js";
import { Chain } from "../core/chain.js";
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

const BYRON_ENVELOPE_PREFIX = [0x82, 0xd8, 0x18, 0x58] as const;
const BYRON_PAYLOAD_PREFIX = [0x83, 0x58, 0x1c] as const;

function hasBytesAt(decoded: ArrayLike<number>, expected: readonly number[], offset = 0): boolean {
  return expected.every((byte, index) => decoded[offset + index] === byte);
}

function cborUnsignedLength(head: number): number {
  if (head <= 0x17) return 1;
  if (head === 0x18) return 2;
  if (head === 0x19) return 3;
  if (head === 0x1a) return 5;
  return 0;
}

/**
 * The Byron envelope: array(2), tag(24), bytes opening as the three-item
 * array with its 28-byte root, then a CRC head matching the bytes it
 * claims. Attributes, type and the CRC value stay unparsed on purpose.
 *
 * @param {ArrayLike<number>} decoded - Candidate decoded Byron address bytes.
 * @returns {boolean} Whether the bytes have the expected Byron CBOR envelope.
 */
function isByronEnvelope(decoded: ArrayLike<number>): boolean {
  if (!hasBytesAt(decoded, BYRON_ENVELOPE_PREFIX)) return false;

  const payloadLength = decoded[4] ?? 0;
  if (payloadLength < 33 || !hasBytesAt(decoded, BYRON_PAYLOAD_PREFIX, 5)) return false;

  const head = decoded[5 + payloadLength];
  if (head === undefined) return false;

  const crcBytes = cborUnsignedLength(head);
  return crcBytes > 0 && decoded.length === 5 + payloadLength + crcBytes;
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

export class Cardano extends Chain {
  static readonly key = "cardano" as const;
  readonly type = "utxo" as const;
  readonly name = "Cardano";
  readonly symbol = "ADA";
  override readonly decimals = 6;
  readonly explorer = "https://cardanoscan.io";
  readonly bip44 = 1815;
  readonly caip2 = "cip34:1-764824073";

  /**
   * Shelley and stake addresses decode: the Bech32 checksum under `addr` or `stake`, then
   * CIP-19's header, so the network tag has to be mainnet's, the type has to fit the prefix
   * and the payload the type. Byron stays a CBOR envelope check: the CRC is unverified and
   * a testnet address passes, because its network hides in an attribute this check does not open.
   *
   * @param {string} address - Candidate Cardano address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58(address, 128);
    const byron = decoded !== undefined && isByronEnvelope(decoded);
    if (!byron && !validShelleyAddress(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
