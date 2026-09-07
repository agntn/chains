import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

const PREFIX = "ecash";
const ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATORS = [0x98f2bc8e61n, 0x79b76d99e2n, 0xf33e5fb3c4n, 0xae2eabe2a8n, 0x1e4f43e470n];
/** Low five bits of each prefix character, then a zero for the separator. */
const PREFIX_DIGITS = [
  ...Array.from(PREFIX, (character) => (character.codePointAt(0) ?? 0) & 31),
  0,
];
/** One version byte and a 20-byte hash fill 34 digits, the checksum takes 8 more. */
const PAYLOAD_LENGTH = 42;

/**
 * The CashAddr polymod, on BigInt because its 40-bit residue outgrows number's bitwise operators.
 *
 * @param {readonly number[]} digits - Payload digits including the checksum.
 * @returns {bigint} Zero when the checksum holds.
 */
function polymod(digits: readonly number[]): bigint {
  let checksum = 1n;
  for (const value of [...PREFIX_DIGITS, ...digits]) {
    const top = checksum >> 35n;
    checksum = ((checksum & 0x07ffffffffn) << 5n) ^ BigInt(value);
    for (const [bit, generator] of GENERATORS.entries()) {
      if ((top >> BigInt(bit)) & 1n) checksum ^= generator;
    }
  }
  return checksum ^ 1n;
}

/**
 * Payload digits behind an optional prefix, case judged over the whole string as the spec does.
 *
 * @param {string} address - Candidate address.
 * @returns {number[] | undefined} Payload digits including the checksum, or invalid input.
 */
function payloadDigits(address: string): number[] | undefined {
  if (/[^A-Za-z0-9:]/.test(address)) return undefined;
  const lower = address.toLowerCase();
  if (address !== lower && address !== address.toUpperCase()) return undefined;
  const payload = lower.startsWith(`${PREFIX}:`) ? lower.slice(PREFIX.length + 1) : lower;
  if (payload.length !== PAYLOAD_LENGTH) return undefined;
  const digits = Array.from(payload, (character) => ALPHABET.indexOf(character));
  return digits.includes(-1) ? undefined : digits;
}

export class Ecash extends Chain {
  static readonly key = "ecash" as const;
  readonly type = "utxo" as const;
  readonly name = "eCash";
  readonly symbol = "XEC";
  override readonly decimals = 2;
  readonly explorer = "https://explorer.e.cash";
  readonly bip44 = 899;

  /**
   * CashAddr with the checksum verified under the `ecash` prefix, written or not, so a bare
   * Bitcoin Cash address fails the way a typo does. Version 0x00 pay-to-pubkey-hash and 0x08
   * pay-to-script-hash over a 20-byte hash only. Legacy base58 stays out, same bytes as Bitcoin.
   *
   * @param {string} address - Candidate eCash address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const digits = payloadDigits(address);
    if (digits === undefined || polymod(digits) !== 0n) {
      throw new InvalidAddressError(this.key, address);
    }
    const version = ((digits[0] ?? 0) << 3) | ((digits[1] ?? 0) >> 2);
    const padding = (digits[33] ?? 0) & 0b11;
    if ((version !== 0x00 && version !== 0x08) || padding !== 0) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
