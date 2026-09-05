import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

// Same BIP-173 charset as bech32, under CashAddr's case rule: all-lowercase or
// all-uppercase with the prefix included, and mixed case is invalid.
const CASHADDR_ADDRESS =
  /^((ecash:)?[qp][qpzry9x8gf2tvdw0s3jn54khce6mua7l]{41}|(ECASH:)?[QP][QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{41})$/;

export class Ecash extends Chain {
  static readonly key = "ecash" as const;
  readonly type = "utxo" as const;
  readonly name = "eCash";
  readonly symbol = "XEC";
  override readonly decimals = 2;
  readonly explorer = "https://explorer.e.cash";
  readonly bip44 = 899;

  /**
   * CashAddr: version 0x00 pay-to-pubkey-hash writes a leading `q`, 0x08
   * pay-to-script-hash a `p`, 42 charset characters, prefix optional as in
   * upstream's ecashaddrjs. The checksum stays unchecked, so a prefixless
   * Bitcoin Cash address passes. Legacy base58 stays out: it is byte-identical
   * to a Bitcoin address.
   *
   * @param {string} address - Candidate eCash address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    if (!CASHADDR_ADDRESS.test(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
