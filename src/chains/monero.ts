import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Monero pads each eight-byte block to eleven digits; the final five bytes use seven.
 * @param {string} address - Candidate standard, subaddress or integrated address.
 * @returns {number | undefined} Network/type byte, or undefined for invalid encoding.
 */
function addressPrefix(address: string): number | undefined {
  if (address.length !== 95 && address.length !== 106) return undefined;
  let prefix: number | undefined;
  for (let offset = 0; offset < address.length; offset += 11) {
    const block = address.slice(offset, offset + 11);
    let value = 0n;
    for (const character of block) {
      const digit = ALPHABET.indexOf(character);
      if (digit < 0) return undefined;
      value = value * 58n + BigInt(digit);
    }
    const byteLength = block.length === 11 ? 8 : 5;
    if (value >= 1n << BigInt(byteLength * 8)) return undefined;
    if (offset === 0) prefix = Number(value >> 56n);
  }
  return prefix;
}

/** Monero mainnet, including subaddresses and integrated payment IDs. */
export class Monero extends Chain {
  static readonly key = "monero" as const;
  readonly type = "monero" as const;
  readonly name = "Monero";
  readonly symbol = "XMR";
  readonly bip44 = 128;
  readonly caip2 = "monero:418015bb9ae982a1975da7d79277c270";
  readonly explorer = "https://xmrchain.net";

  /**
   * Checks block encoding and mainnet envelopes, not Keccak checksums or curve points.
   * @param {string} address - Candidate Monero address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const prefix = addressPrefix(address);
    const valid = address.length === 106 ? prefix === 19 : prefix === 18 || prefix === 42;
    if (!valid) throw new InvalidAddressError(this.key, address);
    return address;
  }
}
