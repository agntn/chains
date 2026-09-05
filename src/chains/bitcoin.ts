import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

const BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

/**
 * Computes BIP-173 polymod, including the expanded mainnet HRP `bc`.
 * @param {readonly number[]} data - Five-bit digits including the checksum.
 * @returns {number} Bech32 or Bech32m residue.
 */
function polymod(data: readonly number[]): number {
  let checksum = 1;
  for (const value of [3, 3, 0, 2, 3, ...data]) {
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
 * Reads mainnet SegWit digits without accepting mixed case or oversized input.
 * @param {string} address - Candidate address.
 * @returns {number[] | undefined} Digits including the version and checksum, or invalid input.
 */
function segwitDigits(address: string): number[] | undefined {
  if (address.length < 14 || address.length > 74) return undefined;
  if (/[^A-Za-z0-9]/.test(address)) return undefined;
  const lower = address.toLowerCase();
  if (address !== lower && address !== address.toUpperCase()) return undefined;
  if (!lower.startsWith("bc1")) return undefined;
  const data = lower
    .slice(3)
    .split("")
    .map((character) => BECH32_ALPHABET.indexOf(character));
  return data.includes(-1) ? undefined : data;
}

/**
 * Accepts Bech32 for v0 and Bech32m for v1 through v16, as required by BIP-350.
 * @param {string} address - Candidate address, preserved on acceptance.
 * @returns {boolean} Whether its encoding and witness program are valid.
 */
function validSegwitAddress(address: string): boolean {
  const data = segwitDigits(address);
  if (data === undefined) return false;
  const version = data[0];
  if (version === undefined || version > 16) return false;
  if (!validWitnessProgram(data.slice(1, -6), version)) return false;
  return polymod(data) === (version === 0 ? 1 : 0x2bc830a3);
}

export class Bitcoin extends Chain {
  static readonly key = "bitcoin" as const;
  readonly type = "utxo" as const;
  readonly name = "Bitcoin";
  readonly symbol = "BTC";
  readonly explorer = "https://blockstream.info";
  readonly bip44 = 0;
  readonly caip2 = "bip122:000000000019d6689c085ae165831e93";

  /**
   * Checks SegWit encoding and legacy version/length; legacy checksums remain unchecked.
   *
   * @param {string} address - Candidate Bitcoin address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58(address, 35);
    const legacy = decoded?.length === 25 && (decoded[0] === 0x00 || decoded[0] === 0x05);
    if (!legacy && !validSegwitAddress(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
