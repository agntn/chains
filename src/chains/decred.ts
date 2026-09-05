import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

/** Decred mainnet; network and address types follow dcrd's version 0 encoders. */
export class Decred extends Chain {
  static readonly key = "decred" as const;
  readonly type = "utxo" as const;
  readonly name = "Decred";
  readonly symbol = "DCR";
  override readonly decimals = 8;
  readonly explorer = "https://dcrdata.decred.org";
  readonly bip44 = 42;

  /**
   * Checks the envelope, not the BLAKE-256 checksum or public key curve points.
   * @param {string} address - Candidate Decred address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58(address, 54);
    if (!decoded) throw new InvalidAddressError(this.key, address);
    const isHash =
      decoded.length === 26 &&
      decoded[0] === 0x07 &&
      [0x3f, 0x1f, 0x01, 0x1a].some((prefix) => prefix === decoded[1]);
    const isPubKey =
      decoded.length === 39 &&
      decoded[0] === 0x13 &&
      decoded[1] === 0x86 &&
      [0, 0x80, 1, 2, 0x82].some((signature) => signature === decoded[2]);
    if (!isHash && !isPubKey) throw new InvalidAddressError(this.key, address);
    return address;
  }
}
