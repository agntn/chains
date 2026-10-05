import { toHex } from "./address.ts";
import type { DecodedAddress } from "./address.ts";
import { BECH32, BECH32M, bytesFromDigits, polymod, readBech32Digits } from "./bech32.ts";

/** A 40-byte program is 64 digits, with the version before it and the checksum after. */
const MAX_DIGITS = 71;

/** Pay-to-anchor, the one two-byte v1 program Bitcoin Core gives a name. */
const ANCHOR = "4e73";

/**
 * Names what breaks BIP-173/350's program rules, without allocating the program.
 * @param {readonly number[]} words - Program digits without version or checksum.
 * @param {number} version - Witness version.
 * @returns {string[]} Byte length and padding faults, empty when the program holds.
 */
function witnessProgramFaults(words: readonly number[], version: number): string[] {
  const length = Math.floor((words.length * 5) / 8);
  const padding = (words.length * 5) % 8;
  const faults: string[] = [];
  if (length < 2 || length > 40) {
    faults.push(`a ${length}-byte witness program, not 2 to 40`);
  } else if (version === 0 && length !== 20 && length !== 32) {
    faults.push(`a ${length}-byte program under witness version 0, which takes 20 or 32`);
  }
  const last = words.at(-1) ?? 0;
  if (padding > 4 || (last & ((1 << padding) - 1)) !== 0) {
    faults.push("digits that do not pack into whole bytes with zero padding");
  }
  return faults;
}

/**
 * The checksum rule alone. A residue that matches the other variant is a checksum written
 * for the wrong witness version, not a typo, so it gets its own words.
 * @param {string} hrp - Lowercase human-readable part.
 * @param {readonly number[]} data - Five-bit digits including the checksum.
 * @param {number} version - Witness version.
 * @returns {string | undefined} The fault, or undefined when the checksum holds.
 */
function checksumFault(hrp: string, data: readonly number[], version: number): string | undefined {
  const residue = polymod(hrp, data);
  const expected = version === 0 ? BECH32 : BECH32M;
  const other = version === 0 ? BECH32M : BECH32;
  // Past version 16 the version is the fault, and either checksum spells the digits right.
  if (residue === expected || (version > 16 && residue === other)) return undefined;
  if (residue !== other) return "the Bech32 checksum does not hold, so a character is wrong";
  return version === 0
    ? "a Bech32m checksum under witness version 0, which BIP-350 leaves on Bech32"
    : `a Bech32 checksum under witness version ${version}, where BIP-350 wants Bech32m`;
}

/** BIP-173's prefix: 1 to 83 printable ASCII characters. */
const BECH32_PREFIX = /^[\x21-\x7E]{1,83}$/;

/** Searched for rather than matched, so a few million digits can't run V8 out of stack. */
const NOT_BECH32_DIGIT = /[^qpzry9x8gf2tvdw0s3jn54khce6mua7l]/i;

/**
 * BIP-173's grammar for any prefix: the prefix, the last `1`, then the checksum's six digits or
 * more. The digits hold no `1`, so the separator is the last one.
 * @param {string} address - Candidate address.
 * @returns {boolean} Whether the address has Bech32's shape, checksum aside.
 */
function bech32Shaped(address: string): boolean {
  const separator = address.lastIndexOf("1");
  const digits = address.slice(separator + 1);
  return (
    separator > 0 &&
    digits.length >= 6 &&
    BECH32_PREFIX.test(address.slice(0, separator)) &&
    !NOT_BECH32_DIGIT.test(digits)
  );
}

/**
 * Whether the SegWit reader should explain a rejection rather than the Base58Check one: the
 * address opens with this chain's prefix, or it is Bech32 written for another chain or network,
 * a mistyped prefix included.
 * Only the reason depends on it. What passes is Base58Check or SegWit, whichever holds.
 * @param {string} address - Candidate address the Base58Check reader turned down.
 * @param {string} hrp - Lowercase human-readable part of this chain.
 * @returns {boolean} Whether the address reads as SegWit.
 */
export function segwitShaped(address: string, hrp: string): boolean {
  if (address.slice(0, hrp.length + 1).toLowerCase() === `${hrp}1`) return true;
  // One case throughout, as Bech32 writes it, which keeps out Base58 and its mixed case.
  const mixed = /[a-z]/.test(address) && /[A-Z]/.test(address);
  return !mixed && bech32Shaped(address);
}

/**
 * Checks a SegWit address and says what is wrong with it: Bech32 for witness v0 and Bech32m
 * for v1 through v16, as BIP-350 requires. Every fault the digits show is named at once.
 * @param {string} address - Candidate address.
 * @param {string} hrp - Lowercase mainnet human-readable part: `bc` on Bitcoin, `ltc` on Litecoin, `btg` on Bitcoin Gold.
 * @returns {string | undefined} The rules the address breaks, or undefined when it holds.
 */
export function segwitFault(address: string, hrp: string): string | undefined {
  const { digits, faults } = readBech32Digits(address, hrp, MAX_DIGITS);
  if (digits !== undefined) {
    const version = digits[0] ?? 0;
    if (version > 16) faults.push(`witness version ${version}, past the 16 BIP-173 defines`);
    faults.push(...witnessProgramFaults(digits.slice(1, -6), version));
    const checksum = checksumFault(hrp, digits, version);
    if (checksum) faults.push(checksum);
  }
  return faults.length === 0 ? undefined : faults.join("; ");
}

/**
 * Names the output a witness program pays to, the way Bitcoin Core's `Solver` does.
 * @param {number} version - Witness version.
 * @param {string} payload - The program in hex.
 * @returns {DecodedAddress} The kind, and the version when no BIP names the program.
 */
function witnessKind(version: number, payload: string): DecodedAddress {
  if (version === 0 && payload.length === 40) return { kind: "p2wpkh", payload, hash: "hash160" };
  if (version === 0) return { kind: "p2wsh", payload, hash: "sha256" };
  if (version === 1 && payload.length === 64) return { kind: "p2tr", payload };
  if (version === 1 && payload === ANCHOR) return { kind: "p2a", payload };
  return { kind: "witness", payload, version };
}

/**
 * Reads a SegWit address `segwitFault` already passed into its kind and witness program.
 * @param {string} address - Address that holds under the prefix.
 * @param {string} hrp - Lowercase human-readable part.
 * @returns {DecodedAddress | undefined} The kind and program, or undefined when it is not SegWit.
 */
export function segwitAddress(address: string, hrp: string): DecodedAddress | undefined {
  const { digits } = readBech32Digits(address, hrp, MAX_DIGITS);
  const program = digits && bytesFromDigits(digits.slice(1, -6));
  const version = digits?.[0];
  return version === undefined || program === undefined
    ? undefined
    : witnessKind(version, toHex(program));
}
