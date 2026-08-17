import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { register } from "../core/registry.js";

export class Bitcoin extends Chain {
  static readonly key = "bitcoin" as const;
  readonly type = "utxo" as const;
  readonly name = "Bitcoin";
  readonly symbol = "BTC";
  readonly explorer = "https://blockstream.info";
  readonly bip44 = 0;
  readonly caip2 = "bip122:000000000019d6689c085ae165831e93";

  override assertAddress(address: string): string {
    if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(address)) {
      throw new InvalidAddressError("Bitcoin", address);
    }
    return address;
  }
}

register(Bitcoin);
