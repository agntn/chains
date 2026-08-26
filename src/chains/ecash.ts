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
  readonly explorer = "https://explorer.e.cash";
  readonly bip44 = 899;

  /**
   * CashAddr: a version byte and a 20-byte hash, 42 charset characters with
   * the checksum. Version 0x00 pay-to-pubkey-hash writes a leading `q`, 0x08
   * pay-to-script-hash a `p`, and the larger hash sizes the spec reserves stay
   * out because no eCash script pays to them. The `ecash:` prefix is optional,
   * as it is in upstream's own ecashaddrjs. The checksum stays unchecked: this
   * is a format check, so a prefixless Bitcoin Cash address passes, the two
   * encodings differing only in that checksum. Legacy base58 stays out: eCash
   * kept Bitcoin's 0x00 and 0x05 versions, so accepting them would make every
   * `1...` and `3...` address identify as both chains.
   */
  override assertAddress(address: string): string {
    if (!CASHADDR_ADDRESS.test(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
