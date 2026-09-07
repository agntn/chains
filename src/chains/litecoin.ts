import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { validSegwitAddress } from "../core/segwit.js";

export class Litecoin extends Chain {
  static readonly key = "litecoin" as const;
  readonly type = "utxo" as const;
  readonly name = "Litecoin";
  readonly symbol = "LTC";
  override readonly decimals = 8;
  readonly explorer = "https://litecoinspace.org";
  readonly bip44 = 2;
  readonly caip2 = "bip122:12a765e31ffd4059bada1e25190f6e98";

  /**
   * Checks SegWit under `ltc` and legacy version/length; legacy checksums stay unchecked.
   * The deprecated 0x05 script-hash version stays out: byte-identical to a Bitcoin `3...`.
   *
   * @param {string} address - Candidate Litecoin address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58(address, 35);
    const legacy = decoded?.length === 25 && (decoded[0] === 0x30 || decoded[0] === 0x32);
    if (!legacy && !validSegwitAddress(address, "ltc")) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
