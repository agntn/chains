import { base58CheckFault } from "../core/base58check.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";

export class Dogecoin extends UTXO {
  static readonly key = "dogecoin" as const;
  readonly name = "Dogecoin";
  readonly symbol = "DOGE";
  override readonly decimals = 8;
  readonly explorer = "https://blockchair.com/dogecoin";
  readonly bip44 = 3;
  readonly caip2 = "bip122:1a91e3dace36e2be3bf030a65679fe82";
  override readonly magic = "c0c0c0c0";
  override readonly pow = "scrypt";

  /**
   * Base58Check under 0x1e (`D...`) and 0x16 (`9...` or `A...`), 25 bytes with the
   * checksum verified. No bech32: mainnet's SegWit deployment is disabled in
   * chainparams. Pepecoin kept 0x16, so a script-hash address reads on both chains.
   *
   * @param {string} address - Candidate Dogecoin address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const fault = base58CheckFault(address, 34, { width: 25, versions: [0x1e, 0x16] });
    if (fault) throw new InvalidAddressError(this.key, address, fault);
    return address;
  }
}
