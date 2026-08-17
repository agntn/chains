import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { register } from "../core/registry.js";

export class Solana extends Chain {
  static readonly key = "solana" as const;
  readonly type = "solana" as const;
  readonly name = "Solana";
  readonly symbol = "SOL";
  readonly explorer = "https://solscan.io";
  readonly bip44 = 501;
  readonly caip2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
  readonly rpcDefault = "https://api.mainnet-beta.solana.com";

  override assertAddress(address: string): string {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      throw new InvalidAddressError("Solana", address);
    }
    return address;
  }
}

register(Solana);
