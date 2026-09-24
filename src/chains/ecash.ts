import { decodeCashAddr } from "../core/cashaddr.js";
import { UTXO } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

export class Ecash extends UTXO {
  static readonly key = "ecash" as const;
  readonly name = "eCash";
  readonly symbol = "XEC";
  override readonly decimals = 2;
  readonly explorer = "https://explorer.e.cash";
  readonly bip44 = 899;

  /**
   * CashAddr with the checksum verified under the `ecash` prefix, written or not, so a bare
   * Bitcoin Cash address fails the way a typo does. Version 0x00 pay-to-pubkey-hash and 0x08
   * pay-to-script-hash over a 20-byte hash only. Legacy base58 stays out, same bytes as Bitcoin.
   *
   * @param {string} address - Candidate eCash address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const content = decodeCashAddr(address, "ecash");
    if (content?.hash.length !== 20 || (content.type !== 0 && content.type !== 1)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
