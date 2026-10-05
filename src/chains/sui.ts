import { decodeBase58 } from "../core/base58.ts";
import { Move } from "../core/chain.ts";
import { InvalidTxidError } from "../core/errors.ts";

/** Hex with `0x`, how Sui writes an address and never a digest. */
const HEX = /^0x[0-9a-fA-F]+$/;

export class Sui extends Move {
  static readonly key = "sui" as const;
  readonly name = "Sui";
  readonly symbol = "SUI";
  override readonly decimals = 9;
  readonly explorer = "https://suiscan.xyz";
  override readonly bip44 = 784;
  override readonly caip2 = "sui:mainnet";

  /**
   * A digest is 32 bytes in base58, read the way `TransactionDigest::from_str` reads
   * it: decode, require exactly 32 bytes. Aptos writes its hashes in hex, so the two
   * Move chains do not share this rule.
   *
   * @param {string} txid - Candidate Sui transaction digest.
   * @returns {string} The accepted digest unchanged.
   */
  override assertTxid(txid: string): string {
    const bytes = decodeBase58(txid, 44);
    if (bytes?.length !== 32) {
      let reason = "not base58 of at most 44 characters";
      if (bytes) reason = `decodes to ${bytes.length} bytes, not the 32 of a digest`;
      else if (HEX.test(txid)) reason = "hex, and Sui writes a digest in base58";
      throw new InvalidTxidError(this.key, txid, reason);
    }
    return txid;
  }
}
