import { Chain } from "../core/chain.js";
import { InvalidAddressError, InvalidTxidError } from "../core/errors.js";
import { keccak256 } from "../core/keccak256.js";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Keccak-256 of the transaction, 32 bytes as hex, either case. */
const TXID = /^[0-9a-fA-F]{64}$/;

/**
 * Reads one block of digits as a number, or undefined on a digit outside the alphabet.
 * @param {string} block - Eleven or seven base58 digits.
 * @returns {bigint | undefined} The value the digits spell.
 */
function blockValue(block: string): bigint | undefined {
  let value = 0n;
  for (const character of block) {
    const digit = ALPHABET.indexOf(character);
    if (digit < 0) return undefined;
    value = value * 58n + BigInt(digit);
  }
  return value;
}

/**
 * Monero pads each eight-byte block to eleven digits; the final five bytes use seven.
 * A block past its byte width is refused, the way the reference decoder refuses it.
 * @param {string} address - Candidate standard, subaddress or integrated address.
 * @returns {readonly number[] | undefined} The 69 or 77 bytes, or undefined when they do not fit.
 */
function addressBytes(address: string): readonly number[] | undefined {
  if (address.length !== 95 && address.length !== 106) return undefined;
  const bytes: number[] = [];
  for (let offset = 0; offset < address.length; offset += 11) {
    const block = address.slice(offset, offset + 11);
    const width = block.length === 11 ? 8 : 5;
    const value = blockValue(block);
    if (value === undefined || value >= 1n << BigInt(width * 8)) return undefined;
    for (let byte = width - 1; byte >= 0; byte--) {
      bytes.push(Number((value >> BigInt(8 * byte)) & 0xffn));
    }
  }
  return bytes;
}

/**
 * Network and type byte: 18 for a standard address and 42 for a subaddress on 69
 * bytes, 19 for an integrated address on 77. Testnet and stagenet fall out here.
 * @param {readonly number[]} bytes - Decoded address.
 * @returns {boolean} Whether the envelope is a mainnet one.
 */
function isMainnet(bytes: readonly number[]): boolean {
  const prefix = bytes[0];
  return bytes.length === 77 ? prefix === 19 : prefix === 18 || prefix === 42;
}

/**
 * The last four bytes are the head of the Keccak-256 of everything before them.
 * @param {readonly number[]} bytes - Decoded address.
 * @returns {boolean} Whether the checksum holds.
 */
function holdsChecksum(bytes: readonly number[]): boolean {
  const digest = keccak256(bytes.slice(0, -4));
  return bytes.slice(-4).every((byte, index) => byte === digest[index]);
}

/** Monero mainnet, including subaddresses and integrated payment IDs. */
export class Monero extends Chain {
  static readonly key = "monero" as const;
  readonly type = "monero" as const;
  readonly name = "Monero";
  readonly symbol = "XMR";
  override readonly decimals = 12;
  readonly bip44 = 128;
  readonly caip2 = "monero:418015bb9ae982a1975da7d79277c270";
  override readonly pow = "randomx";
  readonly explorer = "https://xmrchain.net";

  /**
   * Checks block encoding, mainnet envelopes and the Keccak checksum, not curve points.
   * @param {string} address - Candidate Monero address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const bytes = addressBytes(address);
    if (bytes === undefined || !isMainnet(bytes) || !holdsChecksum(bytes)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }

  /**
   * Shape only, there's no transaction here to hash.
   * @param {string} txid - Candidate Monero transaction hash.
   * @returns {string} The accepted txid unchanged.
   */
  override assertTxid(txid: string): string {
    if (!TXID.test(txid)) throw new InvalidTxidError(this.key, txid);
    return txid;
  }
}
