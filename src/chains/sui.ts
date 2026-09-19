import { decodeBase58 } from "../core/base58.js";
import { Move } from "../core/chain.js";
import { InvalidTxidError } from "../core/errors.js";

export class Sui extends Move {
  static readonly key = "sui" as const;
  readonly name = "Sui";
  readonly symbol = "SUI";
  override readonly decimals = 9;
  readonly explorer = "https://suiscan.xyz";
  readonly bip44 = 784;
  readonly caip2 = "sui:mainnet";

  /**
   * A digest is 32 bytes in base58, read the way `TransactionDigest::from_str` reads
   * it: decode, require exactly 32 bytes. Aptos writes its hashes in hex, so the two
   * Move chains do not share this rule.
   *
   * @param {string} txid - Candidate Sui transaction digest.
   * @returns {string} The accepted digest unchanged.
   */
  override assertTxid(txid: string): string {
    if (decodeBase58(txid, 44)?.length !== 32) throw new InvalidTxidError(this.key, txid);
    return txid;
  }
}
