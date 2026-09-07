const ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

/** The residue a Bech32 checksum leaves, and the one BIP-350 chose for Bech32m. */
export const BECH32 = 1;
export const BECH32M = 0x2bc830a3;

/**
 * Computes the BIP-173 polymod over the expanded human-readable part and the digits.
 * @param {string} hrp - Lowercase human-readable part.
 * @param {readonly number[]} data - Five-bit digits including the checksum.
 * @returns {number} Bech32 or Bech32m residue.
 */
export function polymod(hrp: string, data: readonly number[]): number {
  const codes = Array.from(hrp, (character) => character.codePointAt(0) ?? 0);
  const values = [...codes.map((code) => code >> 5), 0, ...codes.map((code) => code & 31), ...data];
  let checksum = 1;
  for (const value of values) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (const [bit, generator] of GENERATORS.entries()) {
      if ((top >>> bit) & 1) checksum ^= generator;
    }
  }
  return checksum;
}

/**
 * Reads the digits after the separator without accepting mixed case or oversized input.
 * BIP-173's 90-character cap is the caller's to apply: Cardano writes 103-character base
 * addresses under the same encoding, so the bound is the most digits the format writes.
 * @param {string} address - Candidate address.
 * @param {string} hrp - Lowercase human-readable part the address has to open with.
 * @param {number} maxDigits - Most digits the format writes after the separator, checksum included.
 * @returns {number[] | undefined} Digits including the checksum, or invalid input.
 */
export function bech32Digits(
  address: string,
  hrp: string,
  maxDigits: number,
): number[] | undefined {
  const count = address.length - hrp.length - 1;
  if (count < 7 || count > maxDigits) return undefined;
  if (/[^A-Za-z0-9]/.test(address)) return undefined;
  const lower = address.toLowerCase();
  if (address !== lower && address !== address.toUpperCase()) return undefined;
  if (!lower.startsWith(`${hrp}1`)) return undefined;
  const data = Array.from(lower.slice(hrp.length + 1), (character) => ALPHABET.indexOf(character));
  return data.includes(-1) ? undefined : data;
}

/**
 * Packs five-bit digits into bytes under BIP-173's rule: fewer than five padding bits, all zero.
 * @param {readonly number[]} digits - Payload digits without the checksum.
 * @returns {Uint8Array | undefined} The bytes, or undefined when the digits do not spell bytes.
 */
export function bytesFromDigits(digits: readonly number[]): Uint8Array | undefined {
  const padding = (digits.length * 5) % 8;
  if (padding >= 5) return undefined;
  const bytes = new Uint8Array((digits.length * 5 - padding) / 8);
  let accumulator = 0;
  let bits = 0;
  let offset = 0;
  for (const digit of digits) {
    accumulator = (accumulator << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes[offset++] = (accumulator >> bits) & 0xff;
      accumulator &= (1 << bits) - 1;
    }
  }
  return accumulator === 0 ? bytes : undefined;
}
