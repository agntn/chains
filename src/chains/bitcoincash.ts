import { decodeCashAddr } from "../core/cashaddr.js";
import { UTXO } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

/** Hash lengths Bitcoin Cash Node pays to, by type: 0 and 2 hash a key, 1 and 3 a script. */
const HASH_LENGTHS: readonly (readonly number[])[] = [[20], [20, 32], [20], [20, 32]];

export class BitcoinCash extends UTXO {
  static readonly key = "bitcoincash" as const;
  readonly name = "Bitcoin Cash";
  readonly symbol = "BCH";
  override readonly decimals = 8;
  readonly explorer = "https://blockchair.com/bitcoin-cash";
  readonly bip44 = 145;
  readonly caip2 = "bip122:000000000000000000651ef99cb9fcbe";

  /**
   * CashAddr with the checksum verified under the `bitcoincash` prefix, written or not, as
   * Bitcoin Cash Node decodes it: pay-to-pubkey-hash (`q...`) over 20 bytes, pay-to-script-hash
   * (`p...`) over 20 or 32, and the token-aware twins CashTokens added (`z...`, `r...`). Legacy
   * base58 stays out, same bytes as Bitcoin, and an eCash address fails on the checksum.
   *
   * @param {string} address - Candidate Bitcoin Cash address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const content = decodeCashAddr(address, "bitcoincash");
    if (!content || !HASH_LENGTHS[content.type]?.includes(content.hash.length)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
