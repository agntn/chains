import { BITCOIN_ALPHABET } from "../core/base58.ts";
import { readBase58Check } from "../core/base58check.ts";
import { blake256 } from "../core/blake256.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";

/**
 * The leading bytes of every mainnet address dcrd's version 0 encoders write, by decoded
 * length: 0x07 and the hash address type, or 0x13 0x86 and a public key's signature selector.
 */
const LAYOUTS: Readonly<Record<number, readonly (readonly number[])[]>> = {
  26: [
    [0x07, 0x3f],
    [0x07, 0x1f],
    [0x07, 0x01],
    [0x07, 0x1a],
  ],
  39: [
    [0x13, 0x86, 0x00],
    [0x13, 0x86, 0x80],
    [0x13, 0x86, 0x01],
    [0x13, 0x86, 0x02],
    [0x13, 0x86, 0x82],
  ],
};

/**
 * Checks the decoded bytes against those layouts.
 * @param {ArrayLike<number>} bytes - Decoded address, checksum included.
 * @returns {string | undefined} The fault, or undefined for an address dcrd writes.
 */
function layoutFault(bytes: ArrayLike<number>): string | undefined {
  const prefixes = LAYOUTS[bytes.length];
  if (prefixes === undefined) return `decodes to ${bytes.length} bytes, not 26 or 39`;
  const known = prefixes.some((prefix) => prefix.every((byte, index) => bytes[index] === byte));
  return known ? undefined : "version bytes that name no mainnet address type dcrd writes";
}

/** Decred mainnet; network and address types follow dcrd's version 0 encoders. */
export class Decred extends UTXO {
  static readonly key = "decred" as const;
  readonly name = "Decred";
  readonly symbol = "DCR";
  override readonly decimals = 8;
  readonly explorer = "https://dcrdata.decred.org";
  readonly bip44 = 42;
  override readonly magic = "f900b4d9";
  override readonly pow = "blake3";

  /**
   * Base58Check under dcrd's two version bytes with the BLAKE-256 checksum verified, so one
   * character off fails. The curve point behind a public key address stays unchecked.
   * @param {string} address - Candidate Decred address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const { bytes, faults } = readBase58Check(address, 54, BITCOIN_ALPHABET, blake256);
    const layout = bytes !== undefined && bytes.length >= 4 ? layoutFault(bytes) : undefined;
    if (layout) faults.unshift(layout);
    if (faults.length > 0) throw new InvalidAddressError(this.key, address, faults.join("; "));
    return address;
  }
}
