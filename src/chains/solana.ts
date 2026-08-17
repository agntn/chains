import { decodeBase58 } from "../core/base58.js";
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
    // An account is a 32-byte Ed25519 public key. A character-length window cannot
    // stand in for that: 34-character Bitcoin and TRON addresses decode to 25 bytes
    // and would pass one, while the 32-character System Program is a real account.
    if (decodeBase58(address)?.length !== 32) {
      throw new InvalidAddressError("Solana", address);
    }
    return address;
  }
}

register(Solana);
