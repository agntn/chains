import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

export class Octra extends Chain {
  static readonly key = "oct" as const;
  readonly type = "octra" as const;
  readonly name = "Octra";
  readonly symbol = "OCT";
  readonly explorer = "https://octrascan.io";
  readonly rpcDefault = "https://octra.network/rpc";

  override assertAddress(address: string): string {
    if (!/^oct[1-9A-HJ-NP-Za-km-z]{43,45}$/.test(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
