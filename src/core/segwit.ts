const BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

/**
 * Computes the BIP-173 polymod over the expanded human-readable part and the digits.
 * @param {string} hrp - Lowercase human-readable part.
 * @param {readonly number[]} data - Five-bit digits including the checksum.
 * @returns {number} Bech32 or Bech32m residue.
 */
function polymod(hrp: string, data: readonly number[]): number {
  const codes = Array.from(hrp, (character) => character.codePointAt(0) ?? 0);
  const values = [...codes.map((code) => code >> 5), 0, ...codes.map((code) => code & 31), ...data];
  let checksum = 1;
  for (const value of values) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (const [bit, generator] of BECH32_GENERATORS.entries()) {
      if ((top >>> bit) & 1) checksum ^= generator;
    }
  }
  return checksum;
}

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
 * Reads the digits after the separator without accepting mixed case or oversized input.
 * @param {string} address - Candidate address.
 * @param {string} hrp - Lowercase human-readable part the address has to open with.
 * @returns {number[] | undefined} Digits including the version and checksum, or invalid input.
 */
function segwitDigits(address: string, hrp: string): number[] | undefined {
  if (address.length < hrp.length + 12 || address.length > hrp.length + 72) return undefined;
  if (/[^A-Za-z0-9]/.test(address)) return undefined;
  const lower = address.toLowerCase();
  if (address !== lower && address !== address.toUpperCase()) return undefined;
  if (!lower.startsWith(`${hrp}1`)) return undefined;
  const data = lower
    .slice(hrp.length + 1)
    .split("")
    .map((character) => BECH32_ALPHABET.indexOf(character));
  return data.includes(-1) ? undefined : data;
}

/**
 * Accepts Bech32 for witness v0 and Bech32m for v1 through v16, as BIP-350 requires.
 * @param {string} address - Candidate address.
 * @param {string} hrp - Lowercase mainnet human-readable part: `bc` on Bitcoin, `ltc` on Litecoin.
 * @returns {boolean} Whether its encoding and witness program are valid.
 */
export function validSegwitAddress(address: string, hrp: string): boolean {
  const data = segwitDigits(address, hrp);
  if (data === undefined) return false;
  const version = data[0];
  if (version === undefined || version > 16) return false;
  if (!validWitnessProgram(data.slice(1, -6), version)) return false;
  return polymod(hrp, data) === (version === 0 ? 1 : 0x2bc830a3);
}
