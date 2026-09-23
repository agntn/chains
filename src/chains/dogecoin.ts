import { decodeBase58Check } from "../core/base58check.js";
import { UTXO } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

export class Dogecoin extends UTXO {
  static readonly key = "dogecoin" as const;
  readonly name = "Dogecoin";
  readonly symbol = "DOGE";
  override readonly decimals = 8;
  readonly explorer = "https://blockchair.com/dogecoin";
  readonly bip44 = 3;
  readonly caip2 = "bip122:1a91e3dace36e2be3bf030a65679fe82";

  /**
   * Base58Check under 0x1e (`D...`) and 0x16 (`9...` or `A...`), 25 bytes with the
   * checksum verified. No bech32: mainnet's SegWit deployment is disabled in
   * chainparams. Pepecoin kept 0x16, so a script-hash address reads on both chains.
   *
   * @param {string} address - Candidate Dogecoin address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58Check(address, 34);
    if (decoded?.length !== 25 || (decoded[0] !== 0x1e && decoded[0] !== 0x16)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
