import { Chain } from "../core/chain.ts";
import { InvalidAddressError, InvalidTxidError } from "../core/errors.ts";
import { hexTxidFault } from "../core/txid.ts";

/** `oct` and a fixed 44 characters, the only shape the node accepts. */
const ADDRESS = /^oct[1-9A-HJ-NP-Za-km-z]{44}$/;

export class Octra extends Chain {
  static readonly key = "octra" as const;
  readonly type = "octra" as const;
  readonly name = "Octra";
  readonly symbol = "OCT";
  override readonly decimals = 6;
  readonly explorer = "https://octrascan.io";
  override readonly rpcDefault = "https://octra.network/rpc";

  /**
   * The width is the whole format. A contract address is cut out of base58
   * rather than encoded from a payload, so decoding it drops real contracts.
   *
   * @param {string} address - Candidate Octra address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    if (!ADDRESS.test(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }

  /**
   * SHA-256 of the transaction JSON; `sanitize_hash` reads 64 lowercase hex digits, nothing else.
   *
   * Lowercase only, because that is the whole of the node's own check.
   *
   * @param {string} txid - Candidate Octra transaction hash.
   * @returns {string} The accepted hash unchanged.
   */
  override assertTxid(txid: string): string {
    const fault = hexTxidFault(txid, { lowercase: true });
    if (fault) throw new InvalidTxidError(this.key, txid, fault);
    return txid;
  }
}
