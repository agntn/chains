import { settle } from "../core/address.ts";
import type { DecodedAddress } from "../core/address.ts";
import { cashAddrKind, decodeCashAddr } from "../core/cashaddr.ts";
import { UTXO } from "../core/chain.ts";
import { InvalidAddressError } from "../core/errors.ts";

/** Hash lengths Bitcoin Cash Node pays to, by type: 0 and 2 hash a key, 1 and 3 a script. */
const HASH_LENGTHS: readonly (readonly number[])[] = [[20], [20, 32], [20], [20, 32]];

export class BitcoinCash extends UTXO {
  static readonly key = "bitcoincash" as const;
  readonly name = "Bitcoin Cash";
  readonly symbol = "BCH";
  override readonly decimals = 8;
  readonly explorer = "https://blockchair.com/bitcoin-cash";
  override readonly bip44 = 145;
  override readonly caip2 = "bip122:000000000000000000651ef99cb9fcbe";
  override readonly magic = "e3e1f3e8";
  override readonly pow = "sha256d";

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

  /**
   * The CashAddr type and hash, 32-byte script hashes read as the double SHA-256 they are.
   *
   * @param {string} address - Candidate Bitcoin Cash address.
   * @returns {DecodedAddress} Kind and payload.
   */
  override decodeAddress(address: string): DecodedAddress {
    this.assertAddress(address);
    const content = decodeCashAddr(address, "bitcoincash");
    return settle(this.key, address, content && cashAddrKind(content.type, content.hash));
  }
}
