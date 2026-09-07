import { BECH32, BECH32M, bech32Digits, polymod } from "./bech32.js";

/** A 40-byte program is 64 digits, with the version before it and the checksum after. */
const MAX_DIGITS = 71;

/**
 * Checks byte length and canonical padding without allocating the witness program.
 * @param {readonly number[]} words - Program digits without version or checksum.
 * @param {number} version - Witness version.
 * @returns {boolean} Whether the program meets BIP-173/350 rules.
 */
function validWitnessProgram(words: readonly number[], version: number): boolean {
  const length = Math.floor((words.length * 5) / 8);
  const padding = (words.length * 5) % 8;
  if (length < 2 || length > 40 || padding > 4) return false;
  const last = words.at(-1);
  if (last === undefined || (last & ((1 << padding) - 1)) !== 0) return false;
  return version !== 0 || length === 20 || length === 32;
}

/**
 * Accepts Bech32 for witness v0 and Bech32m for v1 through v16, as BIP-350 requires.
 * @param {string} address - Candidate address.
 * @param {string} hrp - Lowercase mainnet human-readable part: `bc` on Bitcoin, `ltc` on Litecoin.
 * @returns {boolean} Whether its encoding and witness program are valid.
 */
export function validSegwitAddress(address: string, hrp: string): boolean {
  const data = bech32Digits(address, hrp, MAX_DIGITS);
  if (data === undefined) return false;
  const version = data[0];
  if (version === undefined || version > 16) return false;
  if (!validWitnessProgram(data.slice(1, -6), version)) return false;
  return polymod(hrp, data) === (version === 0 ? BECH32 : BECH32M);
}
