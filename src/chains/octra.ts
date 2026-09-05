import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

/** `oct` and a fixed 44 characters, the only shape the node accepts. */
const ADDRESS = /^oct[1-9A-HJ-NP-Za-km-z]{44}$/;

export class Octra extends Chain {
  static readonly key = "octra" as const;
  readonly type = "octra" as const;
  readonly name = "Octra";
  readonly symbol = "OCT";
  override readonly decimals = 6;
  readonly explorer = "https://octrascan.io";
  readonly rpcDefault = "https://octra.network/rpc";

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
}
