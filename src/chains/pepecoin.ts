import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

export class Pepecoin extends Chain {
  static readonly key = "pepecoin" as const;
  readonly type = "utxo" as const;
  readonly name = "Pepecoin";
  readonly symbol = "PEP";
  readonly explorer = "https://peppool.space";
  readonly bip44 = 3434;
  readonly caip2 = "bip122:37981c0c48b8d48965376c8a42ece9a0";

  /**
   * Base58Check under 0x38 (`P...`) and 0x16 (`9...` or `A...`), 25 bytes, checksum
   * unchecked. No bech32: the fork carries Dogecoin's timed-out segwit. 0x16 is
   * Dogecoin's script version too, kept because Pepecoin has no other one.
   *
   * @param {string} address - Candidate Pepecoin address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58(address, 34);
    if (decoded?.length !== 25 || (decoded[0] !== 0x38 && decoded[0] !== 0x16)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
