import { decodeBase58Check } from "../core/base58check.js";
import { UTXO } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

export class Dash extends UTXO {
  static readonly key = "dash" as const;
  readonly name = "Dash";
  readonly symbol = "DASH";
  override readonly decimals = 8;
  readonly explorer = "https://insight.dash.org/insight";
  readonly bip44 = 5;
  readonly caip2 = "bip122:00000ffd590b1485b3caadc19b22e637";
  override readonly magic = "bf0c6bbd";
  override readonly pow = "x11";

  /**
   * Base58Check under 0x4c (`X...`) and 0x10 (`7...`), 25 bytes with the checksum verified.
   * That's all Dash Core's `DecodeDestination` reads: no SegWit, so no Bech32 branch.
   *
   * @param {string} address - Candidate Dash address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58Check(address, 34);
    if (decoded?.length !== 25 || (decoded[0] !== 0x4c && decoded[0] !== 0x10)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
