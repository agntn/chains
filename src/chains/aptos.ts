import { Move } from "../core/chain.js";
import { InvalidTxidError } from "../core/errors.js";

/** `0x` and 32 bytes of hex as the node writes a hash; `HashValue::from_str` reads either case. */
const TXID = /^0x[0-9a-fA-F]{64}$/;

export class Aptos extends Move {
  static readonly key = "aptos" as const;
  readonly name = "Aptos";
  readonly symbol = "APT";
  override readonly decimals = 8;
  readonly explorer = "https://explorer.aptoslabs.com";
  readonly bip44 = 637;
  readonly caip2 = "aptos:mainnet";

  /**
   * The node also reads bare hex, but never writes it, so it stays out the way it does
   * for an address.
   *
   * @param {string} txid - Candidate Aptos transaction hash.
   * @returns {string} The accepted hash unchanged.
   */
  override assertTxid(txid: string): string {
    if (!TXID.test(txid)) throw new InvalidTxidError(this.key, txid);
    return txid;
  }
}
