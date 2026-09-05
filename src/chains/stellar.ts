import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STRKEY_TYPES: Readonly<
  Partial<Record<string, { readonly bytes: number; readonly version: number }>>
> = {
  G: { bytes: 35, version: 6 << 3 },
  M: { bytes: 43, version: 12 << 3 },
  C: { bytes: 35, version: 2 << 3 },
};

/**
 * Decodes canonical RFC 4648 base32 without padding or ignored trailing bits.
 *
 * @param {string} input - Base32 text to decode.
 * @param {number} expectedBytes - Exact decoded byte count.
 * @returns {Uint8Array | undefined} Decoded bytes, or undefined for invalid input.
 */
function decodeBase32(input: string, expectedBytes: number): Uint8Array | undefined {
  const decoded = new Uint8Array(expectedBytes);
  let accumulator = 0;
  let bits = 0;
  let offset = 0;

  for (const character of input) {
    const digit = BASE32_ALPHABET.indexOf(character);
    if (digit < 0) return undefined;
    accumulator = (accumulator << 5) | digit;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      if (offset >= expectedBytes) return undefined;
      decoded[offset++] = (accumulator >> bits) & 0xff;
      accumulator &= (1 << bits) - 1;
    }
  }

  if (offset !== expectedBytes || accumulator !== 0) return undefined;
  return decoded;
}

/**
 * Computes the CRC16-XModem checksum used by SEP-23 Strkeys.
 *
 * @param {ArrayLike<number>} payload - Bytes covered by the checksum.
 * @returns {number} The unsigned 16-bit checksum.
 */
function crc16Xmodem(payload: ArrayLike<number>): number {
  let checksum = 0;
  for (let index = 0; index < payload.length; index++) {
    const byte = payload[index] ?? 0;
    checksum ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      checksum = checksum & 0x8000 ? ((checksum << 1) ^ 0x1021) & 0xffff : (checksum << 1) & 0xffff;
    }
  }
  return checksum;
}

function isAddressStrkey(address: string): boolean {
  const type = STRKEY_TYPES[address[0] ?? ""];
  if (!type) return false;

  const expectedLength = Math.ceil((type.bytes * 8) / 5);
  if (address.length !== expectedLength) return false;

  const decoded = decodeBase32(address, type.bytes);
  if (!decoded || decoded[0] !== type.version) return false;

  const payload = decoded.subarray(0, -2);
  const checksum = crc16Xmodem(payload);
  return decoded.at(-2) === (checksum & 0xff) && decoded.at(-1) === ((checksum >> 8) & 0xff);
}

/** Stellar account, muxed-account and contract addresses encoded as SEP-23 Strkeys. */
export class Stellar extends Chain {
  static readonly key = "stellar" as const;
  readonly type = "stellar" as const;
  readonly name = "Stellar";
  readonly symbol = "XLM";
  override readonly decimals = 7;
  readonly explorer = "https://stellar.expert/explorer/public";
  readonly bip44 = 148;
  readonly caip2 = "stellar:pubnet";
  readonly rpcDefault = "https://soroban-rpc.mainnet.stellar.gateway.fm";

  override assertAddress(address: string): string {
    if (!isAddressStrkey(address)) throw new InvalidAddressError(this.key, address);
    return address;
  }
}
