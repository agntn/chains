import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { validSegwitAddress } from "../core/segwit.js";

export class Bitcoin extends Chain {
  static readonly key = "bitcoin" as const;
  readonly type = "utxo" as const;
  readonly name = "Bitcoin";
  readonly symbol = "BTC";
  override readonly decimals = 8;
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
    if (!legacy && !validSegwitAddress(address, "bc")) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
