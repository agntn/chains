import { Move } from "../core/chain.ts";
import { InvalidTxidError } from "../core/errors.ts";
import { hexTxidFault } from "../core/txid.ts";

export class Aptos extends Move {
  static readonly key = "aptos" as const;
  readonly name = "Aptos";
  readonly symbol = "APT";
  override readonly decimals = 8;
  readonly explorer = "https://explorer.aptoslabs.com";
  readonly bip44 = 637;
  readonly caip2 = "aptos:1";

  /**
   * `0x` and 32 bytes of hex as the node writes a hash; `HashValue::from_str` reads either case.
   *
   * The node also reads bare hex, but never writes it, so it stays out the way it does
   * for an address.
   *
   * @param {string} txid - Candidate Aptos transaction hash.
   * @returns {string} The accepted hash unchanged.
   */
  override assertTxid(txid: string): string {
    const fault = hexTxidFault(txid, { prefixed: true });
    if (fault) throw new InvalidTxidError(this.key, txid, fault);
    return txid;
  }
}
