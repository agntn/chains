import { bytesFromDigits } from "./bech32.js";

const ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATORS = [0x98f2bc8e61n, 0x79b76d99e2n, 0xf33e5fb3c4n, 0xae2eabe2a8n, 0x1e4f43e470n];
/** A version byte and the spec's largest hash, 64 bytes, fill 104 digits, the checksum takes 8 more. */
const MAX_DIGITS = 112;

/** What a CashAddr payload carries once its checksum holds and its version byte agrees with it. */
export interface CashAddrContent {
  /** The type field of the version byte: 0 pay-to-pubkey-hash, 1 pay-to-script-hash, and so on. */
  readonly type: number;
  readonly hash: Uint8Array;
}

/**
 * The CashAddr polymod, on BigInt because its 40-bit residue outgrows number's bitwise operators.
 *
 * @param {string} prefix - Lowercase prefix the checksum is taken under.
 * @param {readonly number[]} digits - Payload digits including the checksum.
 * @returns {bigint} Zero when the checksum holds.
 */
function polymod(prefix: string, digits: readonly number[]): bigint {
  const prefixDigits = Array.from(prefix, (character) => (character.codePointAt(0) ?? 0) & 31);
  let checksum = 1n;
  for (const value of [...prefixDigits, 0, ...digits]) {
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
 * @param {string} prefix - Lowercase prefix the address may carry.
 * @returns {number[] | undefined} Payload digits including the checksum, or invalid input.
 */
function payloadDigits(address: string, prefix: string): number[] | undefined {
  if (/[^A-Za-z0-9:]/.test(address)) return undefined;
  const lower = address.toLowerCase();
  if (address !== lower && address !== address.toUpperCase()) return undefined;
  const payload = lower.startsWith(`${prefix}:`) ? lower.slice(prefix.length + 1) : lower;
  if (payload.length <= 8 || payload.length > MAX_DIGITS) return undefined;
  const digits = Array.from(payload, (character) => ALPHABET.indexOf(character));
  return digits.includes(-1) ? undefined : digits;
}

/**
 * Reads the version byte the way Bitcoin Cash Node does: the reserved top bit clear, and the
 * hash as long as the size bits say, 20 + 4n bytes, doubled when the third bit is set.
 *
 * @param {ArrayLike<number>} bytes - Version byte followed by the hash.
 * @returns {number | undefined} The type field, or a payload the version disowns.
 */
function versionType(bytes: ArrayLike<number>): number | undefined {
  const version = bytes[0] ?? 0x80;
  if (version & 0x80) return undefined;
  const size = (20 + 4 * (version & 0x03)) * (version & 0x04 ? 2 : 1);
  return bytes.length === size + 1 ? version >> 3 : undefined;
}

/**
 * Decodes CashAddr under one prefix, written or not: checksum verified, padding zero, version
 * byte in agreement with the hash length. Which types and sizes a chain pays to is the caller's.
 *
 * @param {string} address - Candidate address.
 * @param {string} prefix - Lowercase mainnet prefix: `bitcoincash` or `ecash`.
 * @returns {CashAddrContent | undefined} Type and hash, or invalid input.
 */
export function decodeCashAddr(address: string, prefix: string): CashAddrContent | undefined {
  const digits = payloadDigits(address, prefix);
  if (digits === undefined || polymod(prefix, digits) !== 0n) return undefined;
  const bytes = bytesFromDigits(digits.slice(0, -8));
  const type = bytes === undefined ? undefined : versionType(bytes);
  return bytes === undefined || type === undefined ? undefined : { type, hash: bytes.subarray(1) };
}
