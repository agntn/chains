import { decodeBase58 } from "../core/base58.ts";
import { Chain } from "../core/chain.ts";
import { InvalidAddressError, InvalidTxidError } from "../core/errors.ts";

export class Solana extends Chain {
  static readonly key = "solana" as const;
  readonly type = "solana" as const;
  readonly name = "Solana";
  readonly symbol = "SOL";
  override readonly decimals = 9;
  readonly explorer = "https://solscan.io";
  override readonly bip44 = 501;
  override readonly caip2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
  override readonly rpcDefault = "https://api.mainnet-beta.solana.com";

  override assertAddress(address: string): string {
    // An account is a 32-byte Ed25519 public key. A character-length window cannot
    // stand in for that: 34-character Bitcoin and TRON addresses decode to 25 bytes
    // and would pass one, while the 32-character System Program is a real account.
    if (decodeBase58(address, 44)?.length !== 32) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }

  /**
   * A transaction is named by its first signature, 64 Ed25519 bytes in base58, read
   * the way `Signature::from_str` reads it: at most 88 characters, exactly 64 bytes.
   *
   * @param {string} txid - Candidate Solana transaction signature.
   * @returns {string} The accepted signature unchanged.
   */
  override assertTxid(txid: string): string {
    const bytes = decodeBase58(txid, 88);
    if (bytes?.length !== 64) {
      throw new InvalidTxidError(
        this.key,
        txid,
        bytes
          ? `decodes to ${bytes.length} bytes, not the 64 of a signature`
          : "not base58 of at most 88 characters",
      );
    }
    return txid;
  }
}
